import type { AnalyteReading, HouseholdInfo, LabReportMetadata, ParsedLabReport, SavedDesignRecord, SavedDesignSummary, SystemDesign } from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore body parse failure
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function uploadLabReport(file: File): Promise<ParsedLabReport> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/api/lab-reports/parse`, { method: "POST", body: formData });
  return handle<ParsedLabReport>(res);
}

export async function generateDesign(
  metadata: LabReportMetadata,
  analytes: AnalyteReading[],
  household: HouseholdInfo,
  save: boolean
): Promise<{ design: SystemDesign; savedId: number | null }> {
  const res = await fetch(`${API_BASE}/api/designs/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metadata, analytes, household, save }),
  });
  return handle(res);
}

export async function listDesigns(): Promise<SavedDesignSummary[]> {
  const res = await fetch(`${API_BASE}/api/designs`);
  return handle(res);
}

export async function getDesign(id: number): Promise<SavedDesignRecord> {
  const res = await fetch(`${API_BASE}/api/designs/${id}`);
  return handle(res);
}

export async function deleteDesign(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/designs/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete design (${res.status})`);
}
