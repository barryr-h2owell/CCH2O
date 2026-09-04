import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { generateDesign } from "../api";
import { useWizard } from "../WizardContext";
import type { HouseholdInfo } from "../types";

const DEFAULTS: HouseholdInfo = {
  numOccupants: 4,
  numBathrooms: 2,
  peakFlowGpm: 10,
  averageDailyUseGallons: 320,
  waterSource: "well",
  hasWaterHeater: true,
  budgetTier: "standard",
  stainingObserved: false,
  notes: "",
};

export function HouseholdPage() {
  const navigate = useNavigate();
  const { metadata, analytes, setHousehold, setResult } = useWizard();
  const [form, setForm] = useState<HouseholdInfo>(DEFAULTS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!metadata) {
    navigate("/");
    return null;
  }

  function update<K extends keyof HouseholdInfo>(key: K, value: HouseholdInfo[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      setHousehold(form);
      const { design, savedId } = await generateDesign(metadata!, analytes, form, true);
      setResult(design, savedId);
      navigate("/results");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1>Household / Site Info</h1>
      <p className="subtitle">Used to size equipment (flow rate, softener capacity, etc.) alongside the lab results.</p>

      <form className="card form-grid" onSubmit={handleSubmit}>
        <label>
          Water source
          <select value={form.waterSource} onChange={(e) => update("waterSource", e.target.value as HouseholdInfo["waterSource"])}>
            <option value="well">Private well</option>
            <option value="municipal">Municipal supply</option>
          </select>
        </label>

        <label>
          Occupants
          <input
            type="number"
            min={1}
            value={form.numOccupants}
            onChange={(e) => update("numOccupants", Number(e.target.value))}
          />
        </label>

        <label>
          Bathrooms
          <input
            type="number"
            min={1}
            step={0.5}
            value={form.numBathrooms}
            onChange={(e) => update("numBathrooms", Number(e.target.value))}
          />
        </label>

        <label>
          Peak flow rate (gpm)
          <input
            type="number"
            min={1}
            step={0.5}
            value={form.peakFlowGpm}
            onChange={(e) => update("peakFlowGpm", Number(e.target.value))}
          />
        </label>

        <label>
          Average daily use (gallons)
          <input
            type="number"
            min={1}
            value={form.averageDailyUseGallons}
            onChange={(e) => update("averageDailyUseGallons", Number(e.target.value))}
          />
        </label>

        <label>
          Budget tier
          <select value={form.budgetTier} onChange={(e) => update("budgetTier", e.target.value as HouseholdInfo["budgetTier"])}>
            <option value="economy">Economy</option>
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
          </select>
        </label>

        <label className="checkbox-label">
          <input type="checkbox" checked={form.hasWaterHeater} onChange={(e) => update("hasWaterHeater", e.target.checked)} />
          Has a water heater installed
        </label>

        {form.waterSource === "well" && (
          <label className="checkbox-label span-2">
            <input
              type="checkbox"
              checked={form.stainingObserved ?? false}
              onChange={(e) => update("stainingObserved", e.target.checked)}
            />
            Iron/manganese staining observed on fixtures (toilet, sinks, tub) — well iron fluctuates
            seasonally, so this can justify a Sanitizer Plus even when today's lab test reads low
          </label>
        )}

        <label className="span-2">
          Notes
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} placeholder="Optional site notes" />
        </label>

        {error && <div className="banner banner-error span-2">{error}</div>}

        <div className="actions-row span-2">
          <button type="button" className="btn-secondary" onClick={() => navigate("/")}>
            ← Back
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Generating…" : "Generate Design →"}
          </button>
        </div>
      </form>
    </div>
  );
}
