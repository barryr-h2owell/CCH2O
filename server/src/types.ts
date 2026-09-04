export interface AnalyteReading {
  name: string;
  result: number | null;
  resultRaw: string;
  unit: string;
  pql: string | null;
  nonDetect: boolean;
}

export interface LabReportMetadata {
  labName: string | null;
  orderNo: string | null;
  /** The end customer the system is being designed for (from the report's "Description" field). */
  customerName: string | null;
  /** Well/site identifier as recorded by the lab (e.g. "Well D911540"). */
  location: string | null;
  sampleType: string | null;
  matrix: string | null;
  dateCollected: string | null;
  dateReceived: string | null;
  collectedBy: string | null;
  /** Dealer/installer contact the report was addressed to. */
  reportedToName: string | null;
  reportedToCompany: string | null;
  reportedToAddress: string | null;
}

export interface ParsedLabReport {
  metadata: LabReportMetadata;
  analytes: AnalyteReading[];
  rawText: string;
}

export interface HouseholdInfo {
  numOccupants: number;
  numBathrooms: number;
  peakFlowGpm: number;
  averageDailyUseGallons: number;
  waterSource: "well" | "municipal";
  hasWaterHeater: boolean;
  budgetTier: "economy" | "standard" | "premium";
  /**
   * On-site observation, not derivable from the lab report: iron/manganese staining
   * on fixtures (toilet, sinks, tub). Well iron fluctuates seasonally, so a single lab
   * test can catch it on a low day even when staining shows the real level runs higher.
   * Field techs use this to justify a Sanitizer Plus even when tested iron is well below
   * the 1.0 ppm threshold that would otherwise trigger it on lab numbers alone.
   */
  stainingObserved?: boolean;
  notes?: string;
}

export type ComponentCategory =
  | "sediment_filter"
  | "iron_manganese_filter"
  | "water_softener"
  | "ph_neutralizer"
  | "carbon_filter"
  | "reverse_osmosis"
  | "uv_disinfection"
  | "tannin_filter"
  | "no_treatment";

export interface RecommendedComponent {
  category: ComponentCategory;
  title: string;
  reason: string;
  sizingNotes: string;
  triggeredBy: string[];
  priority: number;
}

export interface DesignWarning {
  analyte: string;
  message: string;
  severity: "info" | "warning" | "critical";
}

export interface SystemDesign {
  components: RecommendedComponent[];
  warnings: DesignWarning[];
  treatmentOrderNote: string;
}

export interface SavedDesignRecord {
  id: number;
  createdAt: string;
  metadata: LabReportMetadata;
  analytes: AnalyteReading[];
  household: HouseholdInfo;
  design: SystemDesign;
}
