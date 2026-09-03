import type {
  AnalyteReading,
  ComponentCategory,
  DesignWarning,
  HouseholdInfo,
  RecommendedComponent,
  SystemDesign,
} from "../types.js";
import {
  ACID_NEUTRALIZER_MODELS,
  AIRCAT_MODELS,
  CATALYTIC_CARBON_MODELS,
  GREENSAND_IRON_FILTER_MODELS,
  GREENSAND_PLUS_MODELS,
  HOMESHIELD_CARBON,
  IMPRESSION_TANNIN_MODELS,
  IMRC_SOFTENER_MODELS,
  IM_SOFTENER_MODELS,
  MICROLINE_RO,
  SANITIZER_ASP1_MODELS,
  SANITIZER_ASP2_MODELS,
  SANITIZER_MIN_HARDNESS_GPG,
  SANITIZER_MIN_TDS_PPM,
  TURBIDEX_MODELS,
  UV_MAX_PRETREAT_HARDNESS_GPG,
  UV_MAX_PRETREAT_IRON_MGL,
  UV_MAX_PRETREAT_TANNIN_MGL,
  VIQUA_ARROS_UV_MODELS,
  mgLToGpg,
  type AirFilterModel,
  type FlowSizedModel,
  type SanitizerModel,
  type SoftenerModel,
  type UvModel,
} from "./waterRightCatalog.js";

/**
 * ============================================================================
 * SIZING ENGINE -- built on the Water-Right, Inc. product catalog
 * (server/src/lib/waterRightCatalog.ts, sourced from server/spec-sheet/*.pdf)
 * ============================================================================
 * Everything with a Water-Right (or partner-brand) spec sheet behind it --
 * softeners, Sanitizer Plus, air filters, acid neutralizers, the HomeShield
 * carbon filter, the Microline RO, and VIQUA Arros UV -- is sized against
 * real model numbers and their rated hardness/iron/manganese/pH/flow limits.
 * One thing is NOT backed by a capacity chart and remains a flow-only
 * estimate: the Impression Tannin's exchange capacity (its literature
 * covers features, not a ppm/capacity chart) -- confirm actual capacity
 * with Water-Right before quoting.
 */

export const THRESHOLDS = {
  hardnessSoftenGpg: 1,
  ironSecondaryMclMgL: 0.3,
  manganeseSecondaryMclMgL: 0.05,
  phLowCorrosive: 6.5,
  phHighScaling: 8.5,
  tdsSecondaryMclMgL: 500,
  nitrateMclMgL: 10,
  nitriteMclMgL: 1,
  arsenicMclMgL: 0.01,
  leadActionLevelMgL: 0.015,
  sulfateSecondaryMclMgL: 250,
  chlorineTasteThresholdMgL: 0.5,
  // Water-Right's own softener manual (Water-Right-IM-Softener-Manual.pdf, "Programming
  // Procedures"): "increase the grains per gallon if soluble iron is present (1 ppm = 4 gpg)".
  ironHardnessEquivalentGpgPerMgL: 4,
  softenerRegenTargetDays: 4,
} as const;

function findAnalyte(analytes: AnalyteReading[], ...names: string[]): AnalyteReading | undefined {
  const lower = names.map((n) => n.toLowerCase());
  return analytes.find((a) => lower.some((n) => a.name.toLowerCase().includes(n)));
}

function pickSoftener(models: SoftenerModel[], requiredGrains: number, hardnessGpg: number, ironPpm: number, peakFlowGpm: number) {
  const sorted = [...models].sort((a, b) => a.medGrains - b.medGrains);
  const fit = sorted.find(
    (m) => m.medGrains >= requiredGrains && m.maxHardnessGpg >= hardnessGpg && m.maxIronPpm >= ironPpm && m.peakFlowGpm >= peakFlowGpm
  );
  return { model: fit ?? sorted[sorted.length - 1], exceeds: !fit };
}

function pickSanitizer(models: SanitizerModel[], requiredGrains: number, hardnessGpg: number, feMnPpm: number, peakFlowGpm: number) {
  const sorted = [...models].sort((a, b) => a.medGrains - b.medGrains);
  const fit = sorted.find(
    (m) => m.medGrains >= requiredGrains && m.maxHardnessGpg >= hardnessGpg && m.maxFeMnPpm >= feMnPpm && m.peakFlowGpm >= peakFlowGpm
  );
  return { model: fit ?? sorted[sorted.length - 1], exceeds: !fit };
}

function pickAirFilter(models: AirFilterModel[], ironPpm: number, h2sPpm: number, peakFlowGpm: number) {
  const sorted = [...models].sort((a, b) => a.peakFlowGpm - b.peakFlowGpm);
  const fit = sorted.find((m) => m.maxIronPpm >= ironPpm && m.maxH2sPpm >= h2sPpm && m.peakFlowGpm >= peakFlowGpm);
  return { model: fit ?? sorted[sorted.length - 1], exceeds: !fit };
}

function pickFlowSized(models: FlowSizedModel[], peakFlowGpm: number) {
  const sorted = [...models].sort((a, b) => a.peakFlowGpm - b.peakFlowGpm);
  const fit = sorted.find((m) => m.peakFlowGpm >= peakFlowGpm);
  return { model: fit ?? sorted[sorted.length - 1], exceeds: !fit };
}

function pickUv(models: UvModel[], peakFlowGpm: number) {
  const sorted = [...models].sort((a, b) => a.nsfEpaFlowGpm - b.nsfEpaFlowGpm);
  const fit = sorted.find((m) => m.nsfEpaFlowGpm >= peakFlowGpm);
  return { model: fit ?? sorted[sorted.length - 1], exceeds: !fit };
}

export function generateDesign(analytes: AnalyteReading[], household: HouseholdInfo): SystemDesign {
  const components: RecommendedComponent[] = [];
  const warnings: DesignWarning[] = [];

  const hardness = findAnalyte(analytes, "hardness");
  const iron = findAnalyte(analytes, "iron");
  const manganese = findAnalyte(analytes, "manganese");
  const ph = findAnalyte(analytes, "ph");
  const tds = findAnalyte(analytes, "total dissolved solids", "tds");
  const nitrate = findAnalyte(analytes, "nitrate");
  const nitrite = findAnalyte(analytes, "nitrite");
  const arsenic = findAnalyte(analytes, "arsenic");
  const lead = findAnalyte(analytes, "lead");
  const sulfate = findAnalyte(analytes, "sulfate");
  const tannin = findAnalyte(analytes, "tannin", "color");
  const turbidity = findAnalyte(analytes, "turbidity");
  const chlorine = findAnalyte(analytes, "chlorine");
  const coliform = findAnalyte(analytes, "coliform", "e. coli", "e.coli");
  const h2s = findAnalyte(analytes, "hydrogen sulfide", "h2s", "sulfide");

  const hardnessVal = hardness?.result ?? 0;
  const ironVal = iron?.result ?? 0;
  const mnVal = manganese?.result ?? 0;
  const feMnVal = ironVal + mnVal;
  const phVal = ph?.result ?? null;
  const tdsVal = tds?.result ?? 0;
  const h2sVal = h2s?.result ?? 0;
  const chlorineVal = chlorine?.result ?? 0;

  let phHandledUpstream = false;
  let phHandledMinPh = 0;

  // --- Sediment / turbidity pre-filter (Turbidex) ---
  if (household.waterSource === "well" || (turbidity?.result ?? 0) > 1) {
    const { model, exceeds } = pickFlowSized(TURBIDEX_MODELS, household.peakFlowGpm);
    components.push({
      category: "sediment_filter",
      title: `Water-Right ${model.model} (Turbidex Sediment Filter)`,
      reason:
        household.waterSource === "well"
          ? "Well sources commonly carry sand/silt; a sediment pre-filter protects downstream equipment."
          : `Turbidity ${turbidity?.resultRaw} ${turbidity?.unit} indicates particulate load.`,
      sizingNotes:
        `${model.mediaCuFt} cu.ft. Turbidex media, rated ${model.continuousFlowGpm} gpm continuous / ${model.peakFlowGpm} gpm peak.` +
        (exceeds ? ` Household peak flow (${household.peakFlowGpm} gpm) exceeds this model's peak rating -- largest single-tank model shown; consider a twin/parallel setup.` : ""),
      triggeredBy: turbidity ? ["Turbidity"] : ["Well water source (default)"],
      priority: 1,
    });
  }

  // --- Softening / iron+manganese path (well water) ---
  const needsSoftening = hardnessVal > THRESHOLDS.hardnessSoftenGpg;
  const requiredGrains = Math.round((hardnessVal + ironVal * THRESHOLDS.ironHardnessEquivalentGpgPerMgL) * household.averageDailyUseGallons * THRESHOLDS.softenerRegenTargetDays);

  const ironMnElevated = ironVal > THRESHOLDS.ironSecondaryMclMgL || mnVal > THRESHOLDS.manganeseSecondaryMclMgL;

  if (needsSoftening && household.waterSource === "well") {
    if (feMnVal <= 1.0) {
      // Standard softener handles the iron/manganese load itself.
      const { model, exceeds } = pickSoftener(IM_SOFTENER_MODELS, requiredGrains, hardnessVal, ironVal, household.peakFlowGpm);
      components.push({
        category: "water_softener",
        title: `Water-Right ${model.model} (Impression Series Softener)`,
        reason: `Hardness of ${hardness?.resultRaw} GPG is above the ${THRESHOLDS.hardnessSoftenGpg} GPG softening threshold; iron (${ironVal || 0} ppm) is within this model's standard rating.`,
        sizingNotes:
          `Rated up to ${model.maxGrains.toLocaleString()} grains (medium-salting: ${model.medGrains.toLocaleString()}), max hardness ${model.maxHardnessGpg} GPG, max iron ${model.maxIronPpm} ppm, peak flow ${model.peakFlowGpm} gpm. ` +
          `Estimated requirement: ~${requiredGrains.toLocaleString()} grains over a ${THRESHOLDS.softenerRegenTargetDays}-day regen cycle at ${household.averageDailyUseGallons} gal/day.` +
          (exceeds ? " Exceeds the largest single-tank IM model on hand -- consider a twin (IMRC/twin cabinet) configuration or confirm with Water-Right." : ""),
        triggeredBy: [`Hardness ${hardness?.resultRaw} GPG`, ...(ironVal ? [`Iron ${iron?.resultRaw} mg/L`] : [])],
        priority: 3,
      });
    } else if (feMnVal <= 15.0) {
      // Sanitizer Plus: combined softening + iron/manganese reduction.
      const wantsAsp2 = phVal !== null && phVal >= 7.0 && hardnessVal > 40;
      const line = wantsAsp2 ? SANITIZER_ASP2_MODELS : SANITIZER_ASP1_MODELS;
      const { model, exceeds } = pickSanitizer(line, requiredGrains, hardnessVal, feMnVal, household.peakFlowGpm);
      phHandledUpstream = true;
      phHandledMinPh = model.minPh;

      const belowMinPh = phVal !== null && phVal < model.minPh;
      components.push({
        category: "iron_manganese_filter",
        title: `Water-Right ${model.model} (Sanitizer Plus -- combined softener + Fe/Mn reduction)`,
        reason: `Combined iron + manganese (${feMnVal.toFixed(2)} ppm) exceeds a standard softener's 1.0 ppm rating; Sanitizer Plus handles hardness and Fe/Mn in one pass, up to ${model.maxFeMnPpm} ppm.`,
        sizingNotes:
          `Rated up to ${model.maxGrains.toLocaleString()} grains (medium-salting: ${model.medGrains.toLocaleString()}) per tank, max hardness ${model.maxHardnessGpg} GPG, max combined Fe/Mn ${model.maxFeMnPpm} ppm, minimum influent pH ${model.minPh}, peak flow ${model.peakFlowGpm} gpm. ` +
          `Requires >= ${SANITIZER_MIN_HARDNESS_GPG} GPG hardness and >= ${SANITIZER_MIN_TDS_PPM} ppm TDS to operate correctly.` +
          (exceeds ? " Exceeds the largest single-tank model -- a twin configuration or custom design may be needed; confirm with Water-Right." : "") +
          (belowMinPh ? ` Influent pH (${phVal}) is below this model's minimum (${model.minPh}) -- an acid neutralizer ahead of this unit is required.` : ""),
        triggeredBy: [`Iron ${iron?.resultRaw ?? "0"} mg/L`, `Manganese ${manganese?.resultRaw ?? "0"} mg/L`, `Hardness ${hardness?.resultRaw} GPG`],
        priority: 2,
      });

      if (belowMinPh) {
        const neutralizer = pickFlowSized(ACID_NEUTRALIZER_MODELS, household.peakFlowGpm);
        components.push({
          category: "ph_neutralizer",
          title: `Water-Right ${neutralizer.model.model} (Acid Neutralizer)`,
          reason: `Required upstream of the Sanitizer Plus ${model.model}, whose minimum influent pH is ${model.minPh}; raw pH is ${phVal}.`,
          sizingNotes: `${neutralizer.model.mediaCuFt} cu.ft. calcite/mix media, rated ${neutralizer.model.continuousFlowGpm} gpm continuous / ${neutralizer.model.peakFlowGpm} gpm peak.`,
          triggeredBy: [`pH ${ph?.resultRaw}`],
          priority: 1,
        });
        phHandledUpstream = true;
        phHandledMinPh = 0; // pH now corrected before the Sanitizer Plus sees it
      }

      if (hardnessVal < SANITIZER_MIN_HARDNESS_GPG) {
        warnings.push({
          analyte: "Hardness",
          message: `Sanitizer Plus needs at least ${SANITIZER_MIN_HARDNESS_GPG} GPG hardness to regenerate correctly; this water tested at ${hardnessVal} GPG. Confirm with Water-Right before specifying.`,
          severity: "warning",
        });
      }
      if (tds && tdsVal < SANITIZER_MIN_TDS_PPM) {
        warnings.push({
          analyte: "TDS",
          message: `Sanitizer Plus needs at least ${SANITIZER_MIN_TDS_PPM} ppm TDS to regenerate correctly; this water tested at ${tdsVal} ppm. Confirm with Water-Right before specifying.`,
          severity: "warning",
        });
      } else if (!tds) {
        warnings.push({
          analyte: "TDS",
          message: `Sanitizer Plus needs at least ${SANITIZER_MIN_TDS_PPM} ppm TDS to regenerate correctly; TDS was not in this lab report. Get it tested to confirm before specifying.`,
          severity: "info",
        });
      }
    } else {
      warnings.push({
        analyte: "Iron/Manganese",
        message: `Combined iron + manganese (${feMnVal.toFixed(2)} ppm) exceeds Water-Right's standard product line (Sanitizer Plus tops out at 15 ppm combined). This needs a chemical-feed (chlorination/permanganate) pretreatment system ahead of a backwashing filter -- outside standard off-the-shelf sizing. Consult Water-Right technical support for a custom design.`,
        severity: "critical",
      });
    }
  } else if (ironMnElevated) {
    // Iron/manganese present, no well+softening path taken above (softening not needed, or municipal source):
    // standalone air filter.
    if (feMnVal <= 4.0) {
      const wantsAirCat = phVal !== null && phVal < 6.8;
      const line = wantsAirCat ? AIRCAT_MODELS : GREENSAND_PLUS_MODELS;
      const { model, exceeds } = pickAirFilter(line, ironVal, h2sVal, household.peakFlowGpm);
      phHandledUpstream = wantsAirCat;
      phHandledMinPh = model.minPh;
      components.push({
        category: "iron_manganese_filter",
        title: `Water-Right ${model.model} (${wantsAirCat ? "AirCAT" : "Greensand Plus"} Air Filter)`,
        reason: `Iron and/or manganese (Fe ${ironVal} / Mn ${mnVal} ppm) exceed EPA secondary MCLs; chemical-free air-injection filter handles up to ${model.maxIronPpm} ppm iron without a chemical feed pump.`,
        sizingNotes:
          `${model.mediaCuFt} cu.ft. media, rated ${model.continuousFlowGpm} gpm continuous / ${model.peakFlowGpm} gpm peak, minimum influent pH ${model.minPh}.` +
          (exceeds ? " Household peak flow exceeds the largest single-tank model -- consider a twin configuration." : ""),
        triggeredBy: [`Iron ${iron?.resultRaw ?? "0"} mg/L`, `Manganese ${manganese?.resultRaw ?? "0"} mg/L`],
        priority: 2,
      });
    } else {
      const gsModel = GREENSAND_IRON_FILTER_MODELS[0]?.model ?? "IMAF-MGS";
      warnings.push({
        analyte: "Iron/Manganese",
        message: `Combined iron + manganese (${feMnVal.toFixed(2)} ppm) exceeds the 4 ppm rating of Water-Right's air-injection filters. A Sanitizer Plus (if softening is also wanted), a greensand iron filter (${gsModel} series -- no ppm ceiling was given in the spec sheet on file, confirm with Water-Right), or chemical-feed pretreatment is needed.`,
        severity: "critical",
      });
    }
  }

  if (needsSoftening && household.waterSource === "municipal") {
    // Municipal/chlorinated source needing softening -> combo softener+carbon (Sanitizer Plus is a well-water-only product line).
    const { model, exceeds } = pickSoftener(IMRC_SOFTENER_MODELS, requiredGrains, hardnessVal, ironVal, household.peakFlowGpm);
    components.push({
      category: "water_softener",
      title: `Water-Right ${model.model} (Impression Series Softener + Carbon, for chlorinated supply)`,
      reason: `Hardness of ${hardness?.resultRaw} GPG is above the softening threshold; combo unit also removes chlorine taste/odor from a municipal supply.`,
      sizingNotes:
        `Rated up to ${model.maxGrains.toLocaleString()} grains (medium-salting: ${model.medGrains.toLocaleString()}), max hardness ${model.maxHardnessGpg} GPG, peak flow ${model.peakFlowGpm} gpm.` +
        (exceeds ? " Exceeds the largest single-tank model -- consider a twin configuration." : "") +
        (ironMnElevated ? " This combo unit is rated for standard (<=1.0 ppm) iron only -- the air/AirCAT filter above handles the elevated iron/manganese ahead of this softener." : ""),
      triggeredBy: [`Hardness ${hardness?.resultRaw} GPG`],
      priority: 3,
    });
  }

  if (ironVal > THRESHOLDS.ironSecondaryMclMgL) {
    warnings.push({
      analyte: "Iron",
      message: `Iron at ${iron?.resultRaw} mg/L exceeds the EPA secondary MCL of ${THRESHOLDS.ironSecondaryMclMgL} mg/L (aesthetic: staining, taste/odor).`,
      severity: "warning",
    });
  }
  if (mnVal > THRESHOLDS.manganeseSecondaryMclMgL) {
    warnings.push({
      analyte: "Manganese",
      message: `Manganese at ${manganese?.resultRaw} mg/L exceeds the EPA secondary MCL of ${THRESHOLDS.manganeseSecondaryMclMgL} mg/L.`,
      severity: "warning",
    });
  }

  // --- Standalone sulfur/H2S catalytic carbon filter (odor not otherwise addressed) ---
  if (h2sVal > 0 && h2sVal <= 5.0 && !(feMnVal > THRESHOLDS.ironSecondaryMclMgL && feMnVal <= 4.0)) {
    const { model, exceeds } = pickAirFilter(CATALYTIC_CARBON_MODELS, ironVal, h2sVal, household.peakFlowGpm);
    components.push({
      category: "carbon_filter",
      title: `Water-Right ${model.model} (Catalytic Carbon Air Filter)`,
      reason: `Hydrogen sulfide (${h2s?.resultRaw} ${h2s?.unit ?? "ppm"}) causes rotten-egg odor; catalytic carbon air filter reduces up to ${model.maxH2sPpm} ppm without chemicals.`,
      sizingNotes: `${model.mediaCuFt} cu.ft. catalytic carbon, rated ${model.continuousFlowGpm} gpm continuous / ${model.peakFlowGpm} gpm peak. Requires influent pH > ${model.minPh}.` + (exceeds ? " Exceeds largest single-tank model -- consider a twin configuration." : ""),
      triggeredBy: [`Hydrogen Sulfide ${h2s?.resultRaw}`],
      priority: 2,
    });
  }

  // --- pH correction (only if not already handled upstream by Sanitizer Plus / AirCAT) ---
  if (phVal !== null) {
    if (phVal < THRESHOLDS.phLowCorrosive && !(phHandledUpstream && phVal >= phHandledMinPh)) {
      const { model } = pickFlowSized(ACID_NEUTRALIZER_MODELS, household.peakFlowGpm);
      components.push({
        category: "ph_neutralizer",
        title: `Water-Right ${model.model} (Acid Neutralizer)`,
        reason: `pH of ${ph?.resultRaw} is below ${THRESHOLDS.phLowCorrosive}, which is corrosive to plumbing and fixtures.`,
        sizingNotes: `${model.mediaCuFt} cu.ft. calcite/mix media, rated ${model.continuousFlowGpm} gpm continuous / ${model.peakFlowGpm} gpm peak.`,
        triggeredBy: [`pH ${ph?.resultRaw}`],
        priority: 2,
      });
      warnings.push({
        analyte: "pH",
        message: `pH ${ph?.resultRaw} is below the normal range (${THRESHOLDS.phLowCorrosive}-${THRESHOLDS.phHighScaling}) -- corrosive water.`,
        severity: "warning",
      });
    } else if (phVal > THRESHOLDS.phHighScaling) {
      warnings.push({
        analyte: "pH",
        message: `pH ${ph?.resultRaw} is above the normal range (${THRESHOLDS.phLowCorrosive}-${THRESHOLDS.phHighScaling}) -- may contribute to scaling; treatment optional depending on other factors.`,
        severity: "info",
      });
    }
  }

  // --- Tannin filter ---
  if ((tannin?.result ?? 0) > 0.1) {
    const { model, exceeds } = pickFlowSized(IMPRESSION_TANNIN_MODELS, household.peakFlowGpm);
    components.push({
      category: "tannin_filter",
      title: `Water-Right ${model.model} (Impression Tannin -- CR-100 + tannin adsorption resin)`,
      reason: `Tannin/color present (${tannin?.resultRaw} ${tannin?.unit}), typical of shallow wells near organic matter.`,
      sizingNotes:
        `${model.mediaCuFt} cu.ft. media, rated ${model.continuousFlowGpm} gpm continuous / ${model.peakFlowGpm} gpm peak. ` +
        `Water-Right's tannin literature covers features but not a tannin-ppm exchange capacity chart -- confirm actual capacity with Water-Right before finalizing model size.` +
        (exceeds ? " Household peak flow exceeds largest single-tank model." : ""),
      triggeredBy: [`Tannin/Color ${tannin?.resultRaw}`],
      priority: 3,
    });
  }

  // --- Carbon filter (HomeShield) ---
  const needsCarbon = household.waterSource === "municipal" || chlorineVal > THRESHOLDS.chlorineTasteThresholdMgL;
  if (needsCarbon) {
    const hs = HOMESHIELD_CARBON;
    const pretreatIssues: string[] = [];
    if (hardnessVal > hs.maxHardnessGpg) pretreatIssues.push(`hardness ${hardnessVal} > ${hs.maxHardnessGpg} GPG`);
    if (ironVal > hs.maxIronPpm) pretreatIssues.push(`iron ${ironVal} > ${hs.maxIronPpm} ppm`);
    if (mnVal > hs.maxManganesePpm) pretreatIssues.push(`manganese ${mnVal} > ${hs.maxManganesePpm} ppm`);
    components.push({
      category: "carbon_filter",
      title: `Water-Right/A.O. Smith ${hs.model} (HomeShield Whole-House Carbon Filter)`,
      reason:
        chlorineVal > THRESHOLDS.chlorineTasteThresholdMgL
          ? `Chlorine at ${chlorine?.resultRaw} mg/L is above the taste/odor threshold (${THRESHOLDS.chlorineTasteThresholdMgL} mg/L).`
          : "Municipal supply -- whole-house carbon filtration for chlorine/chloramine taste/odor and PFAS reduction.",
      sizingNotes:
        `${hs.mediaCuFt} cu.ft. media, rated service flow ${hs.serviceFlowGpm} gpm, rated capacity ${hs.ratedCapacityGallons.toLocaleString()} gallons. ` +
        `Influent requirements: pH ${hs.minPh}-${hs.maxPh}, hardness < ${hs.maxHardnessGpg} GPG, iron < ${hs.maxIronPpm} ppm, manganese < ${hs.maxManganesePpm} ppm, turbidity < ${hs.maxTurbidityNtu} NTU, sulfate <= ${hs.maxSulfatePpm} ppm, TOC <= ${hs.maxTocPpm} ppm.` +
        (pretreatIssues.length ? ` Raw water exceeds influent limits (${pretreatIssues.join(", ")}) -- install after the softener/iron treatment above so influent to this filter is within range.` : ""),
      triggeredBy: chlorineVal > THRESHOLDS.chlorineTasteThresholdMgL ? [`Chlorine ${chlorine?.resultRaw} mg/L`] : ["Municipal water source"],
      priority: 4,
    });
  }

  // --- Reverse Osmosis (Microline TFC-435 / Impression R.O.) ---
  const nitrateVal = nitrate?.result ?? 0;
  const nitriteVal = nitrite?.result ?? 0;
  const arsenicVal = arsenic?.result ?? 0;
  const leadVal = lead?.result ?? 0;
  const roTriggers: string[] = [];
  if (tdsVal > THRESHOLDS.tdsSecondaryMclMgL) roTriggers.push(`TDS ${tds?.resultRaw} mg/L`);
  if (nitrateVal > THRESHOLDS.nitrateMclMgL) roTriggers.push(`Nitrate ${nitrate?.resultRaw} mg/L`);
  if (nitriteVal > THRESHOLDS.nitriteMclMgL) roTriggers.push(`Nitrite ${nitrite?.resultRaw} mg/L`);
  if (arsenicVal > THRESHOLDS.arsenicMclMgL) roTriggers.push(`Arsenic ${arsenic?.resultRaw} mg/L`);
  if (leadVal > THRESHOLDS.leadActionLevelMgL) roTriggers.push(`Lead ${lead?.resultRaw} mg/L`);

  if (roTriggers.length > 0) {
    const ro = MICROLINE_RO;
    const pretreatIssues: string[] = [];
    if (hardnessVal > mgLToGpg(ro.maxPretreatHardnessMgL)) pretreatIssues.push(`hardness ${hardnessVal} GPG > ${mgLToGpg(ro.maxPretreatHardnessMgL).toFixed(1)} GPG`);
    if (ironVal > ro.maxPretreatIronMgL) pretreatIssues.push(`iron ${ironVal} > ${ro.maxPretreatIronMgL} mg/L`);
    if (mnVal > ro.maxPretreatManganeseMgL) pretreatIssues.push(`manganese ${mnVal} > ${ro.maxPretreatManganeseMgL} mg/L`);
    if (tdsVal > ro.maxTdsPpm) {
      warnings.push({ analyte: "TDS", message: `TDS at ${tds?.resultRaw} mg/L exceeds this RO system's max influent TDS of ${ro.maxTdsPpm} ppm.`, severity: "critical" });
    }
    components.push({
      category: "reverse_osmosis",
      title: `Water-Right ${ro.model} (Point-of-Use RO)`,
      reason: "One or more contaminants exceed levels effectively reduced only by RO at the drinking-water tap.",
      sizingNotes:
        `System production ${ro.systemProductionGpd} gpd, membrane rated ${ro.membraneProductionMinGpd}-${ro.membraneProductionMaxGpd} gpd, ${ro.tdsReductionPct}% average TDS reduction, optimum rejection at pH ${ro.optimumPhMin}-${ro.optimumPhMax}. ` +
        `NSF/ANSI 58 certified for arsenic, barium, cadmium, chromium, copper, cysts, fluoride, lead, nitrate/nitrite, radium, selenium, TDS.` +
        (pretreatIssues.length ? ` Raw water exceeds RO pretreatment limits (${pretreatIssues.join(", ")}) -- rely on the softener/iron treatment above; RO influent must be within these limits.` : ""),
      triggeredBy: roTriggers,
      priority: 5,
    });
  }

  if (nitrateVal > THRESHOLDS.nitrateMclMgL) {
    warnings.push({
      analyte: "Nitrate",
      message: `Nitrate at ${nitrate?.resultRaw} mg/L exceeds the primary (health-based) MCL of ${THRESHOLDS.nitrateMclMgL} mg/L. Not removable by softening or carbon -- RO required for drinking water. Consider well/septic inspection.`,
      severity: "critical",
    });
  }
  if (arsenicVal > THRESHOLDS.arsenicMclMgL) {
    warnings.push({
      analyte: "Arsenic",
      message: `Arsenic at ${arsenic?.resultRaw} mg/L exceeds the primary MCL of ${THRESHOLDS.arsenicMclMgL} mg/L. Confirm valence (RO is certified for pentavalent arsenic only; trivalent needs oxidation first).`,
      severity: "critical",
    });
  }
  if (leadVal > THRESHOLDS.leadActionLevelMgL) {
    warnings.push({
      analyte: "Lead",
      message: `Lead at ${lead?.resultRaw} mg/L exceeds the EPA action level of ${THRESHOLDS.leadActionLevelMgL} mg/L.`,
      severity: "critical",
    });
  }
  if (tdsVal > THRESHOLDS.tdsSecondaryMclMgL) {
    warnings.push({
      analyte: "TDS",
      message: `TDS at ${tds?.resultRaw} mg/L exceeds the secondary MCL of ${THRESHOLDS.tdsSecondaryMclMgL} mg/L.`,
      severity: "info",
    });
  }
  if ((sulfate?.result ?? 0) > THRESHOLDS.sulfateSecondaryMclMgL) {
    warnings.push({
      analyte: "Sulfate",
      message: `Sulfate at ${sulfate?.resultRaw} mg/L exceeds the secondary MCL of ${THRESHOLDS.sulfateSecondaryMclMgL} mg/L (taste, potential laxative effect).`,
      severity: "info",
    });
  }

  // --- UV Disinfection (VIQUA Arros, the UV partner brand Water-Right installs) ---
  if (coliform && (coliform.nonDetect === false || /present/i.test(coliform.resultRaw))) {
    const { model, exceeds } = pickUv(VIQUA_ARROS_UV_MODELS, household.peakFlowGpm);
    const tanninVal = tannin?.result ?? 0;
    const uvPretreatIssues: string[] = [];
    if (hardnessVal > UV_MAX_PRETREAT_HARDNESS_GPG) uvPretreatIssues.push(`hardness ${hardnessVal} GPG > ${UV_MAX_PRETREAT_HARDNESS_GPG} GPG`);
    if (ironVal > UV_MAX_PRETREAT_IRON_MGL) uvPretreatIssues.push(`iron ${ironVal} > ${UV_MAX_PRETREAT_IRON_MGL} mg/L`);
    if (tanninVal > UV_MAX_PRETREAT_TANNIN_MGL) uvPretreatIssues.push(`tannin ${tanninVal} > ${UV_MAX_PRETREAT_TANNIN_MGL} mg/L`);

    components.push({
      category: "uv_disinfection",
      title: `${model.model} (UV Disinfection, VIQUA -- Water-Right's UV partner brand)`,
      reason: `Coliform bacteria detected (${coliform.resultRaw}). UV disinfection is the final treatment stage, installed after filtration and ahead of point of use.`,
      sizingNotes:
        `Rated ${model.nsfEpaFlowGpm} gpm at the NSF/EPA 40 mJ/cm² dose (${model.standardFlowGpm} gpm at VIQUA's 30 mJ/cm² standard dose), max operating pressure ${model.maxOperatingPressurePsi} psi. ` +
        `Requires influent within: hardness < ${UV_MAX_PRETREAT_HARDNESS_GPG} GPG, iron < ${UV_MAX_PRETREAT_IRON_MGL} mg/L, tannin < ${UV_MAX_PRETREAT_TANNIN_MGL} mg/L for adequate UV transmittance. ` +
        `Recommend shock chlorination of the well and re-testing before relying on UV alone.` +
        (exceeds ? " Household peak flow exceeds the largest Arros model -- consult VIQUA/Water-Right for a larger or paralleled system." : "") +
        (uvPretreatIssues.length ? ` Raw water exceeds UV pretreatment limits (${uvPretreatIssues.join(", ")}) -- rely on the softener/iron/tannin treatment above; UV influent must be within these limits.` : ""),
      triggeredBy: [`Coliform: ${coliform.resultRaw}`],
      priority: 6,
    });
    warnings.push({
      analyte: "Coliform",
      message: "Bacteriological contamination detected. This is a health-based exceedance -- recommend immediate shock chlorination and re-testing in addition to installing UV disinfection.",
      severity: "critical",
    });
  }

  if (components.length === 0) {
    components.push({
      category: "no_treatment",
      title: "No Treatment Indicated by Tested Parameters",
      reason: "None of the tested analytes exceeded the thresholds configured in this engine.",
      sizingNotes: "Confirm all relevant parameters were tested before concluding no treatment is needed.",
      triggeredBy: [],
      priority: 99,
    });
  }

  components.sort((a, b) => a.priority - b.priority);

  return {
    components,
    warnings,
    treatmentOrderNote:
      "Recommended install order (left to right): sediment pre-filter -> iron/manganese filter (air filter or Sanitizer Plus) -> acid neutralizer (if not built into the Fe/Mn unit) -> water softener/tannin filter -> whole-house carbon -> point-of-use RO. UV disinfection is typically installed as the last stage before distribution.",
  };
}

export const ALL_CATEGORIES: ComponentCategory[] = [
  "sediment_filter",
  "iron_manganese_filter",
  "water_softener",
  "ph_neutralizer",
  "carbon_filter",
  "reverse_osmosis",
  "uv_disinfection",
  "tannin_filter",
  "no_treatment",
];
