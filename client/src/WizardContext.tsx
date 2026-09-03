import { createContext, useContext, useState, type ReactNode } from "react";
import type { AnalyteReading, HouseholdInfo, LabReportMetadata, SystemDesign } from "./types";

interface WizardState {
  metadata: LabReportMetadata | null;
  analytes: AnalyteReading[];
  household: HouseholdInfo | null;
  design: SystemDesign | null;
  savedId: number | null;
}

interface WizardContextValue extends WizardState {
  setLabData: (metadata: LabReportMetadata, analytes: AnalyteReading[]) => void;
  setHousehold: (household: HouseholdInfo) => void;
  setResult: (design: SystemDesign, savedId: number | null) => void;
  reset: () => void;
}

const initialState: WizardState = {
  metadata: null,
  analytes: [],
  household: null,
  design: null,
  savedId: null,
};

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WizardState>(initialState);

  const value: WizardContextValue = {
    ...state,
    setLabData: (metadata, analytes) => setState((s) => ({ ...s, metadata, analytes })),
    setHousehold: (household) => setState((s) => ({ ...s, household })),
    setResult: (design, savedId) => setState((s) => ({ ...s, design, savedId })),
    reset: () => setState(initialState),
  };

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used within WizardProvider");
  return ctx;
}
