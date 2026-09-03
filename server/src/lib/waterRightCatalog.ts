/**
 * ============================================================================
 * WATER-RIGHT PRODUCT CATALOG
 * ============================================================================
 * Sourced directly from Water-Right, Inc. spec sheets (server/spec-sheet/):
 *  - Water-Right-IM-Softener-Spec-Sheet_web.pdf            -> IM_SOFTENER_MODELS / IMRC_SOFTENER_MODELS
 *  - Twin-Sanitizer-Plus-Spec-Sheet-SPE-SAN-PL-TWIN.pdf    -> SANITIZER_ASP1_MODELS / SANITIZER_ASP2_MODELS (per-tank specs)
 *  - Water-Right-IM-Air-Filter-Spec-Sheet-1.pdf            -> GREENSAND_PLUS_MODELS / AIRCAT_MODELS / BIRM_MODELS / CATALYTIC_CARBON_MODELS
 *  - WR-Impression-Filter-Spec-Sheet-SPE-WR-FILT-1.pdf     -> ACID_NEUTRALIZER_MODELS / CARBON_BACKWASH_MODELS / TURBIDEX_MODELS / GREENSAND_IRON_FILTER_MODELS
 *  - Impression-RO-Performance-Data-Sheet-RevA0620.pdf     -> MICROLINE_RO
 *  - AOS-HomeShield-Filter-PDS-1.pdf                       -> HOMESHIELD_CARBON
 *  - LIT-IM-TANNIN-3.pdf                                   -> IMPRESSION_TANNIN (flow data reused from IM cabinet dims; no
 *                                                              tannin-ppm capacity chart was included in that sheet)
 *  - VQ-Arros9-15-22-DryContact-SpecSheet_EN.pdf           -> VIQUA_ARROS_UV_MODELS (UV disinfection; VIQUA/Trojan Technologies,
 *                                                              the UV partner brand Water-Right installs)
 *  - Water-Right-IM-Softener-Manual.pdf                    -> confirmed IM/IMRC specs above and supplied the official
 *                                                              iron-fouling sizing factor (see ironHardnessEquivalentGpgPerMgL
 *                                                              in sizingEngine.ts: "1 ppm iron = 4 gpg" per the manual's
 *                                                              hardness-setting instructions)
 *  - Master-Water-Fusion-2.0-Spec-Sheet.pdf                -> MASTER_WATER_* air filter models. Master Water is a sibling
 *                                                              A.O. Smith brand (same "AOS-MW-" spec numbering as Water-Right's
 *                                                              own AOS-HS HomeShield sheet) the dealer also installs. Used
 *                                                              only as a fallback when a Water-Right model's iron/H2S ceiling
 *                                                              is too low -- see pickIronMnAirFilter in sizingEngine.ts.
 *
 * Master Water's Clarifier 2.0 line (acid neutralizer + Turbidex/carbon backwash filters) is
 * intentionally NOT in this catalog -- the dealer doesn't install it.
 *
 * The Sanitizer Plus figures come from the *Twin* series spec sheet, which
 * states specs are "per tank" — used here as the single-tank Sanitizer Plus
 * rating since no standalone (non-twin) spec sheet was provided.
 */

export interface SoftenerModel {
  model: string;
  minGrains: number;
  medGrains: number;
  maxGrains: number;
  mediaCuFt: number;
  maxHardnessGpg: number;
  maxIronPpm: number;
  peakFlowGpm: number;
  continuousFlowGpm: number;
}

export interface SanitizerModel extends SoftenerModel {
  maxFeMnPpm: number;
  minPh: number;
}

export interface FlowSizedModel {
  model: string;
  mediaCuFt: number;
  continuousFlowGpm: number;
  peakFlowGpm: number;
  backwashFlowGpm: number;
}

export interface AirFilterModel extends FlowSizedModel {
  maxIronPpm: number;
  maxH2sPpm: number;
  minPh: number;
  maxPh?: number;
}

// --- Softeners (well water, non-chlorinated; max iron per NSF/ANSI 44 rating) ---
export const IM_SOFTENER_MODELS: SoftenerModel[] = [
  { model: "IM-844", minGrains: 15600, medGrains: 21600, maxGrains: 25600, mediaCuFt: 0.75, maxHardnessGpg: 50, maxIronPpm: 1.0, peakFlowGpm: 11.4, continuousFlowGpm: 5.0 },
  { model: "IM-1044", minGrains: 23600, medGrains: 28400, maxGrains: 32000, mediaCuFt: 1.0, maxHardnessGpg: 75, maxIronPpm: 1.0, peakFlowGpm: 17.1, continuousFlowGpm: 5.0 },
  { model: "IM-1054", minGrains: 35400, medGrains: 44400, maxGrains: 48800, mediaCuFt: 1.5, maxHardnessGpg: 100, maxIronPpm: 1.0, peakFlowGpm: 14.3, continuousFlowGpm: 5.0 },
  { model: "IM-1354", minGrains: 53000, medGrains: 64200, maxGrains: 72800, mediaCuFt: 2.5, maxHardnessGpg: 100, maxIronPpm: 1.0, peakFlowGpm: 18.5, continuousFlowGpm: 5.0 },
];

// --- Softener + carbon combo (municipal/chlorinated water) ---
export const IMRC_SOFTENER_MODELS: SoftenerModel[] = [
  { model: "IMRC-1054", minGrains: 23600, medGrains: 28400, maxGrains: 32000, mediaCuFt: 1.0, maxHardnessGpg: 75, maxIronPpm: 1.0, peakFlowGpm: 15.6, continuousFlowGpm: 9.7 },
  { model: "IMRC-1354", minGrains: 35400, medGrains: 44400, maxGrains: 48800, mediaCuFt: 1.5, maxHardnessGpg: 100, maxIronPpm: 1.0, peakFlowGpm: 20.4, continuousFlowGpm: 13.2 },
];

// --- Sanitizer Plus: combined softener + iron/manganese reduction (well water) ---
export const SANITIZER_ASP1_MODELS: SanitizerModel[] = [
  { model: "ASP1-1044", minGrains: 7300, medGrains: 11400, maxGrains: 11800, mediaCuFt: 1.0, maxHardnessGpg: 20, maxIronPpm: 8.0, maxFeMnPpm: 8.0, minPh: 6.5, peakFlowGpm: 19.0, continuousFlowGpm: 9.0 },
  { model: "ASP1-1054", minGrains: 16400, medGrains: 20700, maxGrains: 22600, mediaCuFt: 1.5, maxHardnessGpg: 30, maxIronPpm: 10.0, maxFeMnPpm: 10.0, minPh: 6.0, peakFlowGpm: 17.0, continuousFlowGpm: 9.0 },
  { model: "ASP1-1354", minGrains: 28300, medGrains: 33600, maxGrains: 36900, mediaCuFt: 2.5, maxHardnessGpg: 40, maxIronPpm: 15.0, maxFeMnPpm: 15.0, minPh: 6.0, peakFlowGpm: 19.0, continuousFlowGpm: 9.0 },
  { model: "ASP1-1465", minGrains: 40000, medGrains: 47000, maxGrains: 52000, mediaCuFt: 3.5, maxHardnessGpg: 40, maxIronPpm: 15.0, maxFeMnPpm: 15.0, minPh: 6.0, peakFlowGpm: 26.0, continuousFlowGpm: 19.0 },
  { model: "ASP1-1665", minGrains: 51000, medGrains: 60000, maxGrains: 65000, mediaCuFt: 4.5, maxHardnessGpg: 40, maxIronPpm: 15.0, maxFeMnPpm: 15.0, minPh: 6.0, peakFlowGpm: 26.0, continuousFlowGpm: 19.0 },
];

export const SANITIZER_ASP2_MODELS: SanitizerModel[] = [
  { model: "ASP2-1044", minGrains: 11100, medGrains: 19100, maxGrains: 20300, mediaCuFt: 1.0, maxHardnessGpg: 40, maxIronPpm: 8.0, maxFeMnPpm: 8.0, minPh: 7.0, peakFlowGpm: 19.0, continuousFlowGpm: 9.0 },
  { model: "ASP2-1054", minGrains: 22900, medGrains: 32000, maxGrains: 34800, mediaCuFt: 1.5, maxHardnessGpg: 60, maxIronPpm: 10.0, maxFeMnPpm: 10.0, minPh: 7.0, peakFlowGpm: 17.0, continuousFlowGpm: 8.0 },
  { model: "ASP2-1354", minGrains: 28200, medGrains: 48300, maxGrains: 60300, mediaCuFt: 2.5, maxHardnessGpg: 80, maxIronPpm: 15.0, maxFeMnPpm: 15.0, minPh: 7.0, peakFlowGpm: 19.0, continuousFlowGpm: 9.0 },
  { model: "ASP2-1465", minGrains: 40000, medGrains: 68000, maxGrains: 84000, mediaCuFt: 3.5, maxHardnessGpg: 80, maxIronPpm: 15.0, maxFeMnPpm: 15.0, minPh: 7.0, peakFlowGpm: 26.0, continuousFlowGpm: 19.0 },
  { model: "ASP2-1665", minGrains: 52000, medGrains: 87000, maxGrains: 108000, mediaCuFt: 4.5, maxHardnessGpg: 80, maxIronPpm: 15.0, maxFeMnPpm: 15.0, minPh: 7.0, peakFlowGpm: 26.0, continuousFlowGpm: 19.0 },
];

// Sanitizer Plus needs at least 3 GPG hardness and 80 ppm TDS to operate correctly (CR-100 media).
export const SANITIZER_MIN_HARDNESS_GPG = 3;
export const SANITIZER_MIN_TDS_PPM = 80;

// --- Air filters (no softening; chemical-free, oxygen-regenerated) ---
// Greensand Plus: iron/manganese/H2S, no pre-filter needed.
export const GREENSAND_PLUS_MODELS: AirFilterModel[] = [
  { model: "IAG-1054", mediaCuFt: 1.0, continuousFlowGpm: 3.0, peakFlowGpm: 6.0, backwashFlowGpm: 6.5, maxIronPpm: 4.0, maxH2sPpm: 0.5, minPh: 6.8 },
  { model: "IAG-1252", mediaCuFt: 1.5, continuousFlowGpm: 3.0, peakFlowGpm: 8.0, backwashFlowGpm: 9.0, maxIronPpm: 4.0, maxH2sPpm: 0.5, minPh: 6.8 },
  { model: "IAG-1354", mediaCuFt: 2.0, continuousFlowGpm: 5.0, peakFlowGpm: 10.0, backwashFlowGpm: 11.0, maxIronPpm: 4.0, maxH2sPpm: 0.5, minPh: 6.8 },
];

// AirCAT (Greensand Plus + Calcite blend): same iron/H2S range, lower minimum pH (adds mild correction).
export const AIRCAT_MODELS: AirFilterModel[] = [
  { model: "IACG-1054AN", mediaCuFt: 1.0, continuousFlowGpm: 3.0, peakFlowGpm: 6.0, backwashFlowGpm: 6.5, maxIronPpm: 4.0, maxH2sPpm: 0.5, minPh: 6.3 },
  { model: "IACG-1252AN", mediaCuFt: 1.5, continuousFlowGpm: 3.0, peakFlowGpm: 8.0, backwashFlowGpm: 9.0, maxIronPpm: 4.0, maxH2sPpm: 0.5, minPh: 6.3 },
  { model: "IACG-1354AN", mediaCuFt: 2.0, continuousFlowGpm: 5.0, peakFlowGpm: 10.0, backwashFlowGpm: 11.0, maxIronPpm: 4.0, maxH2sPpm: 0.5, minPh: 6.3 },
];

// Birm: lower iron ceiling, no chemical-free H2S claim in the spec sheet's headline use, wider pH range.
export const BIRM_MODELS: AirFilterModel[] = [
  { model: "IMFE-1054", mediaCuFt: 1.0, continuousFlowGpm: 5.0, peakFlowGpm: 8.0, backwashFlowGpm: 5.3, maxIronPpm: 1.0, maxH2sPpm: 5.0, minPh: 6.8, maxPh: 9.0 },
  { model: "IMFE-1252", mediaCuFt: 1.5, continuousFlowGpm: 6.0, peakFlowGpm: 12.0, backwashFlowGpm: 9.0, maxIronPpm: 1.0, maxH2sPpm: 5.0, minPh: 6.8, maxPh: 9.0 },
  { model: "IMFE-1354", mediaCuFt: 2.0, continuousFlowGpm: 7.0, peakFlowGpm: 14.0, backwashFlowGpm: 10.0, maxIronPpm: 1.0, maxH2sPpm: 5.0, minPh: 6.8, maxPh: 9.0 },
];

// Catalytic Carbon: primarily for sulfur/H2S odor + chlorine taste, needs pH > 7.
export const CATALYTIC_CARBON_MODELS: AirFilterModel[] = [
  { model: "IMS-1054", mediaCuFt: 1.0, continuousFlowGpm: 5.0, peakFlowGpm: 8.0, backwashFlowGpm: 5.3, maxIronPpm: 1.0, maxH2sPpm: 5.0, minPh: 7.0 },
  { model: "IMS-1252", mediaCuFt: 1.5, continuousFlowGpm: 6.0, peakFlowGpm: 9.0, backwashFlowGpm: 7.5, maxIronPpm: 1.0, maxH2sPpm: 5.0, minPh: 7.0 },
  { model: "IMS-1354", mediaCuFt: 2.0, continuousFlowGpm: 7.0, peakFlowGpm: 10.0, backwashFlowGpm: 9.0, maxIronPpm: 1.0, maxH2sPpm: 5.0, minPh: 7.0 },
];

// --- Master Water Fusion 2.0: fallback air filters, used only when a Water-Right model's
// iron/H2S ceiling is too low. MWGP's plain Greensand Plus rates higher than Water-Right's IAG
// (5.0 ppm iron / 1.0 ppm H2S vs 4.0 / 0.5); MWHS (sulfur) and MWCGP (Greensand Plus + Calcite,
// pH-correcting) rate the same as their Water-Right equivalents (IMS, IACG) so never actually win
// the fallback, but are included for completeness against the spec sheet.
export const MASTER_WATER_GREENSAND_PLUS_MODELS: AirFilterModel[] = [
  { model: "MWGP-1054", mediaCuFt: 1.0, continuousFlowGpm: 3.0, peakFlowGpm: 6.0, backwashFlowGpm: 6.5, maxIronPpm: 5.0, maxH2sPpm: 1.0, minPh: 6.8 },
  { model: "MWGP-1252", mediaCuFt: 1.5, continuousFlowGpm: 3.0, peakFlowGpm: 8.0, backwashFlowGpm: 9.0, maxIronPpm: 5.0, maxH2sPpm: 1.0, minPh: 6.8 },
  { model: "MWGP-1354", mediaCuFt: 2.0, continuousFlowGpm: 5.0, peakFlowGpm: 10.0, backwashFlowGpm: 11.0, maxIronPpm: 5.0, maxH2sPpm: 1.0, minPh: 6.8 },
];

export const MASTER_WATER_AIRCAT_MODELS: AirFilterModel[] = [
  { model: "MWCGP-1054", mediaCuFt: 1.0, continuousFlowGpm: 3.0, peakFlowGpm: 6.0, backwashFlowGpm: 6.5, maxIronPpm: 4.0, maxH2sPpm: 0.5, minPh: 6.3 },
  { model: "MWCGP-1252", mediaCuFt: 1.5, continuousFlowGpm: 3.0, peakFlowGpm: 8.0, backwashFlowGpm: 9.0, maxIronPpm: 4.0, maxH2sPpm: 0.5, minPh: 6.3 },
  { model: "MWCGP-1354", mediaCuFt: 2.0, continuousFlowGpm: 5.0, peakFlowGpm: 10.0, backwashFlowGpm: 11.0, maxIronPpm: 4.0, maxH2sPpm: 0.5, minPh: 6.3 },
];

export const MASTER_WATER_CATALYTIC_CARBON_MODELS: AirFilterModel[] = [
  { model: "MWHS-1054", mediaCuFt: 1.0, continuousFlowGpm: 5.0, peakFlowGpm: 8.0, backwashFlowGpm: 5.3, maxIronPpm: 1.0, maxH2sPpm: 5.0, minPh: 7.0 },
  { model: "MWHS-1252", mediaCuFt: 1.5, continuousFlowGpm: 6.0, peakFlowGpm: 9.0, backwashFlowGpm: 7.5, maxIronPpm: 1.0, maxH2sPpm: 5.0, minPh: 7.0 },
  { model: "MWHS-1354", mediaCuFt: 2.0, continuousFlowGpm: 7.0, peakFlowGpm: 10.0, backwashFlowGpm: 9.0, maxIronPpm: 1.0, maxH2sPpm: 5.0, minPh: 7.0 },
];

// --- Acid neutralizer (calcite/mix media, corrects low pH) ---
export const ACID_NEUTRALIZER_MODELS: FlowSizedModel[] = [
  { model: "IMBF-1044MAN", mediaCuFt: 1.0, continuousFlowGpm: 4.8, peakFlowGpm: 11.0, backwashFlowGpm: 5.3 },
  { model: "IMBF-1054MAN", mediaCuFt: 1.5, continuousFlowGpm: 4.8, peakFlowGpm: 11.0, backwashFlowGpm: 5.3 },
  { model: "IMBF-1354MAN", mediaCuFt: 2.5, continuousFlowGpm: 6.9, peakFlowGpm: 16.0, backwashFlowGpm: 7.5 },
];

// --- Backwashing carbon filter (taste/odor/chlorine). Water-Right reuses the IMBF-xxxx model
// numbers for both the carbon and Turbidex media fills, distinguished only by media -- kept as
// separate arrays here since they serve different purposes (taste/odor vs. sediment).
export const CARBON_BACKWASH_MODELS: FlowSizedModel[] = [
  { model: "IMBF-1044", mediaCuFt: 1.0, continuousFlowGpm: 3.0, peakFlowGpm: 8.0, backwashFlowGpm: 5.3 },
  { model: "IMBF-1054", mediaCuFt: 1.5, continuousFlowGpm: 5.0, peakFlowGpm: 9.0, backwashFlowGpm: 5.3 },
  { model: "IMBF-1354", mediaCuFt: 2.5, continuousFlowGpm: 7.0, peakFlowGpm: 12.0, backwashFlowGpm: 9.0 },
];

// --- Turbidex sediment pre-filter ---
export const TURBIDEX_MODELS: FlowSizedModel[] = [
  { model: "IMBF-1044", mediaCuFt: 1.0, continuousFlowGpm: 6.0, peakFlowGpm: 10.0, backwashFlowGpm: 9.0 },
  { model: "IMBF-1054", mediaCuFt: 1.5, continuousFlowGpm: 7.0, peakFlowGpm: 11.0, backwashFlowGpm: 9.0 },
  { model: "IMBF-1354", mediaCuFt: 2.5, continuousFlowGpm: 11.0, peakFlowGpm: 18.0, backwashFlowGpm: 15.0 },
];

// --- Greensand iron filter (no air injection; heavier iron loads, chemical-feed/manual regen style) ---
export const GREENSAND_IRON_FILTER_MODELS: FlowSizedModel[] = [
  { model: "IMAF-1044MGS", mediaCuFt: 1.0, continuousFlowGpm: 4.0, peakFlowGpm: 6.0, backwashFlowGpm: 6.5 },
  { model: "IMAF-1054MGS", mediaCuFt: 1.5, continuousFlowGpm: 4.0, peakFlowGpm: 6.0, backwashFlowGpm: 6.5 },
  { model: "IMAF-1354MGS", mediaCuFt: 2.5, continuousFlowGpm: 6.0, peakFlowGpm: 9.0, backwashFlowGpm: 10.0 },
];

// --- Impression Tannin (CR-100 + tannin adsorption resin blend) ---
// No tannin-ppm/color capacity chart was included in the source literature (LIT-IM-TANNIN-3.pdf) --
// this reuses the IM cabinet flow ratings for sizing only; confirm tannin exchange capacity with Water-Right.
export const IMPRESSION_TANNIN_MODELS: FlowSizedModel[] = IM_SOFTENER_MODELS.map((m) => ({
  model: m.model.replace("IM-", "IM-TANNIN-"),
  mediaCuFt: m.mediaCuFt,
  continuousFlowGpm: m.continuousFlowGpm,
  peakFlowGpm: m.peakFlowGpm,
  backwashFlowGpm: m.continuousFlowGpm,
}));

// --- HomeShield whole-house carbon/PFAS filter (single model) ---
export const HOMESHIELD_CARBON = {
  model: "AOS-HS-1200",
  mediaCuFt: 2.5,
  serviceFlowGpm: 5.7,
  peakFlowGpm: 11.2,
  ratedCapacityGallons: 500000,
  maxHardnessGpg: 10,
  maxIronPpm: 0.3,
  maxManganesePpm: 0.05,
  maxTurbidityNtu: 1,
  maxSulfatePpm: 200,
  maxTocPpm: 2,
  maxTanninPpm: 0.1,
  minPh: 7,
  maxPh: 8,
};

// --- Microline TFC-435 R.O. Drinking Water System (single model, sold as Impression R.O.) ---
export const MICROLINE_RO = {
  model: "Impression R.O. (Microline TFC-435)",
  systemProductionGpd: 12,
  membraneProductionMinGpd: 41,
  membraneProductionMaxGpd: 53,
  tdsReductionPct: 95,
  maxTdsPpm: 2000,
  phRangeMin: 4,
  phRangeMax: 11,
  optimumPhMin: 7.0,
  optimumPhMax: 7.5,
  // Pretreatment requirements -- water exceeding these needs softening/iron removal upstream.
  maxPretreatHardnessMgL: 170, // ~9.9 GPG (1 GPG = 17.1 mg/L)
  maxPretreatIronMgL: 0.1,
  maxPretreatManganeseMgL: 0.05,
  maxPretreatH2sMgL: 0,
};

export function mgLToGpg(mgL: number): number {
  return mgL / 17.1;
}

export interface UvModel {
  model: string;
  /** Flow rating at the conservative NSF/EPA 40 mJ/cm² dose -- the regulatory-grade rating for pathogen inactivation. */
  nsfEpaFlowGpm: number;
  /** Flow rating at VIQUA's own 30 mJ/cm² "Standard" dose -- higher throughput, still validated but less conservative. */
  standardFlowGpm: number;
  maxOperatingPressurePsi: number;
}

// --- VIQUA Arros UV disinfection (point-of-entry, partner brand Water-Right installs) ---
export const VIQUA_ARROS_UV_MODELS: UvModel[] = [
  { model: "VIQUA Arros 9", nsfEpaFlowGpm: 7, standardFlowGpm: 9, maxOperatingPressurePsi: 125 },
  { model: "VIQUA Arros 15", nsfEpaFlowGpm: 12, standardFlowGpm: 15, maxOperatingPressurePsi: 125 },
  { model: "VIQUA Arros 22", nsfEpaFlowGpm: 16, standardFlowGpm: 22, maxOperatingPressurePsi: 125 },
];

// UV pretreatment requirements -- exceeding these degrades UV transmittance/dose effectiveness.
export const UV_MAX_PRETREAT_HARDNESS_GPG = 7; // < 7 grains (120 mg/L)
export const UV_MAX_PRETREAT_IRON_MGL = 0.3;
export const UV_MAX_PRETREAT_TANNIN_MGL = 0.1;
