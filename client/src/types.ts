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
  customerName: string | null;
  location: string | null;
  sampleType: string | null;
  matrix: string | null;
  dateCollected: string | null;
  dateReceived: string | null;
  collectedBy: string | null;
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
  /** On-site observation: iron/manganese staining on fixtures (toilet, sinks, tub). */
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

export interface SavedDesignSummary {
  id: number;
  createdAt: string;
  metadata: LabReportMetadata;
  household: HouseholdInfo;
}

export interface SavedDesignRecord extends SavedDesignSummary {
  analytes: AnalyteReading[];
  design: SystemDesign;
}
