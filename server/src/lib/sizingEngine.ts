import type {
  AnalyteReading,
  ComponentCategory,
  DesignWarning,
  HouseholdInfo,
  RecommendedComponent,
  SystemDesign,
} from "../types.js";

/**
 * ============================================================================
 * PLACEHOLDER SIZING ENGINE
 * ============================================================================
 * These thresholds and formulas are generic water-treatment-dealer rules of
 * thumb, NOT your company's spec sheet. They exist so the app is usable end
 * to end today. Swap the values in THRESHOLDS and the formulas below with
 * your own methodology/equipment specs when you're ready — everything a
 * design decision depends on is centralized in this file.
 * ============================================================================
 */

export const THRESHOLDS = {
  hardnessSoftenGpg: 1, // GPG above which a softener is recommended
  ironSecondaryMclMgL: 0.3,
  ironChemicalFeedThresholdMgL: 7, // above this, simple oxidizing filters lose effectiveness
  manganeseSecondaryMclMgL: 0.05,
  phLowCorrosive: 6.5,
  phHighScaling: 8.5,
  tdsSecondaryMclMgL: 500,
  tdsRoStronglyRecommendedMgL: 1000,
  nitrateMclMgL: 10, // primary (health-based) MCL as N
  nitriteMclMgL: 1,
  arsenicMclMgL: 0.01,
  leadActionLevelMgL: 0.015,
  sulfateSecondaryMclMgL: 250,
  chlorineTasteThresholdMgL: 0.5,
  ironHardnessEquivalentGpgPerMgL: 3, // 1 mg/L iron fouling load ~= this many grains/day equivalent on softener resin
  softenerRegenTargetDays: 4,
  softenerStandardSizesGrains: [24000, 32000, 48000, 64000, 80000],
} as const;

function findAnalyte(analytes: AnalyteReading[], ...names: string[]): AnalyteReading | undefined {
  const lower = names.map((n) => n.toLowerCase());
  return analytes.find((a) => lower.some((n) => a.name.toLowerCase().includes(n)));
}

function pickSoftenerTankSize(neededCapacity: number): number {
  const fit = THRESHOLDS.softenerStandardSizesGrains.find((s) => s >= neededCapacity);
  return fit ?? THRESHOLDS.softenerStandardSizesGrains[THRESHOLDS.softenerStandardSizesGrains.length - 1];
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

  // --- Sediment pre-filter: default first stage for well water ---
  if (household.waterSource === "well" || (turbidity?.result ?? 0) > 1) {
    components.push({
      category: "sediment_filter",
      title: "Sediment Pre-Filter",
      reason:
        household.waterSource === "well"
          ? "Well sources commonly carry sand/silt; a sediment pre-filter protects downstream equipment."
          : `Turbidity ${turbidity?.resultRaw} ${turbidity?.unit} indicates particulate load.`,
      sizingNotes: `Size housing/cartridge for peak flow of ${household.peakFlowGpm} gpm, 5 micron nominal.`,
      triggeredBy: turbidity ? ["Turbidity"] : ["Well water source (default)"],
      priority: 1,
    });
  }

  // --- Iron / Manganese filter ---
  const ironVal = iron?.result ?? 0;
  const mnVal = manganese?.result ?? 0;
  if (ironVal > THRESHOLDS.ironSecondaryMclMgL || mnVal > THRESHOLDS.manganeseSecondaryMclMgL) {
    const triggers: string[] = [];
    if (ironVal > THRESHOLDS.ironSecondaryMclMgL) triggers.push(`Iron ${iron?.resultRaw} mg/L`);
    if (mnVal > THRESHOLDS.manganeseSecondaryMclMgL) triggers.push(`Manganese ${manganese?.resultRaw} mg/L`);

    const heavyLoad = ironVal > THRESHOLDS.ironChemicalFeedThresholdMgL;
    components.push({
      category: "iron_manganese_filter",
      title: heavyLoad ? "Chemical-Feed Oxidation + Iron/Manganese Filter" : "Air-Injection (or Catalytic Media) Iron/Manganese Filter",
      reason: `Iron and/or manganese exceed EPA secondary MCLs (Fe ${THRESHOLDS.ironSecondaryMclMgL} mg/L, Mn ${THRESHOLDS.manganeseSecondaryMclMgL} mg/L), causing staining and taste/odor issues.`,
      sizingNotes: heavyLoad
        ? `Iron level (${iron?.resultRaw} mg/L) is high enough that a chlorine or permanganate feed pump ahead of a backwashing filter is typically needed rather than a simple oxidizing media alone. Size backwash filter for ${household.peakFlowGpm} gpm peak flow.`
        : `Size media tank for ${household.peakFlowGpm} gpm peak flow with adequate backwash rate; confirm sufficient pressure for air draw (if using air-injection type).`,
      triggeredBy: triggers,
      priority: 2,
    });

    if (ironVal > THRESHOLDS.ironSecondaryMclMgL) {
      warnings.push({
        analyte: "Iron",
        message: `Iron at ${iron?.resultRaw} mg/L exceeds the EPA secondary MCL of ${THRESHOLDS.ironSecondaryMclMgL} mg/L (aesthetic: staining, taste/odor).`,
        severity: ironVal > THRESHOLDS.ironChemicalFeedThresholdMgL ? "critical" : "warning",
      });
    }
    if (mnVal > THRESHOLDS.manganeseSecondaryMclMgL) {
      warnings.push({
        analyte: "Manganese",
        message: `Manganese at ${manganese?.resultRaw} mg/L exceeds the EPA secondary MCL of ${THRESHOLDS.manganeseSecondaryMclMgL} mg/L.`,
        severity: "warning",
      });
    }
  }

  // --- Water softener ---
  const hardnessVal = hardness?.result ?? 0;
  if (hardnessVal > THRESHOLDS.hardnessSoftenGpg) {
    const ironFoulingLoad = ironVal * THRESHOLDS.ironHardnessEquivalentGpgPerMgL;
    const effectiveGrainsPerDay = (hardnessVal + ironFoulingLoad) * household.averageDailyUseGallons;
    const neededCapacity = effectiveGrainsPerDay * THRESHOLDS.softenerRegenTargetDays;
    const tankSize = pickSoftenerTankSize(neededCapacity);

    components.push({
      category: "water_softener",
      title: "Water Softener (Ion Exchange)",
      reason: `Hardness of ${hardness?.resultRaw} GPG is above the ${THRESHOLDS.hardnessSoftenGpg} GPG threshold for noticeable scale build-up.`,
      sizingNotes:
        `Estimated load: ${Math.round(effectiveGrainsPerDay).toLocaleString()} grains/day ` +
        `(hardness ${hardnessVal} GPG${ironVal ? ` + iron fouling load ${ironFoulingLoad.toFixed(1)} GPG-equiv` : ""} ` +
        `× ${household.averageDailyUseGallons} gal/day). Target ${THRESHOLDS.softenerRegenTargetDays}-day regeneration cycle ` +
        `needs ~${Math.round(neededCapacity).toLocaleString()} grains capacity → recommend ${tankSize.toLocaleString()}-grain resin tank ` +
        `(nearest standard size at or above requirement).`,
      triggeredBy: [`Hardness ${hardness?.resultRaw} GPG`],
      priority: 3,
    });
  }

  // --- pH neutralizer ---
  const phVal = ph?.result;
  if (phVal !== undefined && phVal !== null) {
    if (phVal < THRESHOLDS.phLowCorrosive) {
      components.push({
        category: "ph_neutralizer",
        title: "pH Neutralizer (Calcite/Soda Ash Feeder)",
        reason: `pH of ${ph?.resultRaw} is below ${THRESHOLDS.phLowCorrosive}, which is corrosive to plumbing and fixtures.`,
        sizingNotes: `Size calcite/corosex neutralizer tank for ${household.peakFlowGpm} gpm peak flow; verify contact time meets media manufacturer spec.`,
        triggeredBy: [`pH ${ph?.resultRaw}`],
        priority: 2,
      });
      warnings.push({
        analyte: "pH",
        message: `pH ${ph?.resultRaw} is below the normal range (${THRESHOLDS.phLowCorrosive}-${THRESHOLDS.phHighScaling}) — corrosive water.`,
        severity: "warning",
      });
    } else if (phVal > THRESHOLDS.phHighScaling) {
      warnings.push({
        analyte: "pH",
        message: `pH ${ph?.resultRaw} is above the normal range (${THRESHOLDS.phLowCorrosive}-${THRESHOLDS.phHighScaling}) — may contribute to scaling; treatment optional depending on other factors.`,
        severity: "info",
      });
    }
  }

  // --- Tannin filter ---
  if ((tannin?.result ?? 0) > 0.1) {
    components.push({
      category: "tannin_filter",
      title: "Tannin Filter",
      reason: `Tannin/color present (${tannin?.resultRaw} ${tannin?.unit}), typical of shallow wells near organic matter.`,
      sizingNotes: `Size anion-exchange tannin media tank for ${household.peakFlowGpm} gpm peak flow; note tannin resin needs brine regeneration, may combine with softener resin in some cases.`,
      triggeredBy: [`Tannin/Color ${tannin?.resultRaw}`],
      priority: 3,
    });
  }

  // --- Carbon filter (taste/odor, chlorine) ---
  const chlorineVal = chlorine?.result ?? 0;
  if (household.waterSource === "municipal" || chlorineVal > THRESHOLDS.chlorineTasteThresholdMgL) {
    components.push({
      category: "carbon_filter",
      title: "Activated Carbon Filter",
      reason:
        chlorineVal > THRESHOLDS.chlorineTasteThresholdMgL
          ? `Chlorine at ${chlorine?.resultRaw} mg/L is above the taste/odor threshold (${THRESHOLDS.chlorineTasteThresholdMgL} mg/L).`
          : "Municipal supply — carbon filtration for residual chlorine taste/odor and general polishing.",
      sizingNotes: `Size for ${household.peakFlowGpm} gpm peak flow with adequate empty-bed contact time; catalytic carbon if chloramine is used by the utility.`,
      triggeredBy: chlorineVal > THRESHOLDS.chlorineTasteThresholdMgL ? [`Chlorine ${chlorine?.resultRaw} mg/L`] : ["Municipal water source"],
      priority: 4,
    });
  }

  // --- Reverse Osmosis (drinking water point-of-use) ---
  const tdsVal = tds?.result ?? 0;
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
    components.push({
      category: "reverse_osmosis",
      title: "Reverse Osmosis (Point-of-Use, Drinking Water)",
      reason: "One or more contaminants exceed levels effectively reduced only by RO at the drinking-water tap.",
      sizingNotes: "Standard under-sink RO system (50-100 gpd membrane) is typically sufficient for drinking/cooking water at a single tap.",
      triggeredBy: roTriggers,
      priority: 5,
    });
  }

  if (nitrateVal > THRESHOLDS.nitrateMclMgL) {
    warnings.push({
      analyte: "Nitrate",
      message: `Nitrate at ${nitrate?.resultRaw} mg/L exceeds the primary (health-based) MCL of ${THRESHOLDS.nitrateMclMgL} mg/L. Not removable by softening or carbon — RO or distillation required for drinking water. Consider well/septic inspection.`,
      severity: "critical",
    });
  }
  if (arsenicVal > THRESHOLDS.arsenicMclMgL) {
    warnings.push({
      analyte: "Arsenic",
      message: `Arsenic at ${arsenic?.resultRaw} mg/L exceeds the primary MCL of ${THRESHOLDS.arsenicMclMgL} mg/L.`,
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
      severity: tdsVal > THRESHOLDS.tdsRoStronglyRecommendedMgL ? "warning" : "info",
    });
  }
  if ((sulfate?.result ?? 0) > THRESHOLDS.sulfateSecondaryMclMgL) {
    warnings.push({
      analyte: "Sulfate",
      message: `Sulfate at ${sulfate?.resultRaw} mg/L exceeds the secondary MCL of ${THRESHOLDS.sulfateSecondaryMclMgL} mg/L (taste, potential laxative effect).`,
      severity: "info",
    });
  }

  // --- UV Disinfection ---
  if (coliform && (coliform.nonDetect === false || /present/i.test(coliform.resultRaw))) {
    components.push({
      category: "uv_disinfection",
      title: "UV Disinfection",
      reason: `Coliform bacteria detected (${coliform.resultRaw}). UV disinfection recommended after filtration, ahead of point of use.`,
      sizingNotes: `Size UV system for ${household.peakFlowGpm} gpm peak flow with pre-filtration to ${'≤'}5 micron for adequate UV transmittance. Recommend shock chlorination of well and re-test before relying on UV alone.`,
      triggeredBy: [`Coliform: ${coliform.resultRaw}`],
      priority: 6,
    });
    warnings.push({
      analyte: "Coliform",
      message: "Bacteriological contamination detected. This is a health-based exceedance — recommend immediate shock chlorination and re-testing in addition to installing UV disinfection.",
      severity: "critical",
    });
  }

  if (components.length === 0) {
    components.push({
      category: "no_treatment",
      title: "No Treatment Indicated by Tested Parameters",
      reason: "None of the tested analytes exceeded the thresholds configured in this placeholder engine.",
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
      "Recommended install order (left to right): sediment pre-filter -> iron/manganese filter -> pH neutralizer -> water softener/tannin filter -> carbon filter -> point-of-use RO. UV disinfection is typically installed as the last stage before distribution.",
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
