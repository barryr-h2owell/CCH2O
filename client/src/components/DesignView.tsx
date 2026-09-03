import type { AnalyteReading, HouseholdInfo, LabReportMetadata, SystemDesign } from "../types";

const CATEGORY_LABELS: Record<string, string> = {
  sediment_filter: "Sediment Filtration",
  iron_manganese_filter: "Iron / Manganese Removal",
  water_softener: "Softening",
  ph_neutralizer: "pH Correction",
  carbon_filter: "Carbon Filtration",
  reverse_osmosis: "Drinking Water (RO)",
  uv_disinfection: "Disinfection",
  tannin_filter: "Tannin Removal",
  no_treatment: "No Treatment",
};

export function DesignView({
  metadata,
  analytes,
  household,
  design,
}: {
  metadata: LabReportMetadata;
  analytes: AnalyteReading[];
  household: HouseholdInfo;
  design: SystemDesign;
}) {
  return (
    <>
      <section className="card">
        <h2>Site Summary</h2>
        <div className="meta-grid">
          <div>
            <strong>Customer</strong>
            <span>{metadata.customerName ?? "—"}</span>
          </div>
          <div>
            <strong>Location</strong>
            <span>{metadata.location ?? "—"}</span>
          </div>
          <div>
            <strong>Water Source</strong>
            <span>{household.waterSource === "well" ? "Private well" : "Municipal"}</span>
          </div>
          <div>
            <strong>Occupants / Bathrooms</strong>
            <span>
              {household.numOccupants} / {household.numBathrooms}
            </span>
          </div>
          <div>
            <strong>Peak Flow</strong>
            <span>{household.peakFlowGpm} gpm</span>
          </div>
          <div>
            <strong>Avg Daily Use</strong>
            <span>{household.averageDailyUseGallons} gal</span>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Lab Results</h2>
        <table className="analyte-table analyte-table-readonly">
          <thead>
            <tr>
              <th>Analyte</th>
              <th>Result</th>
              <th>Unit</th>
              <th>PQL</th>
            </tr>
          </thead>
          <tbody>
            {analytes.map((a, i) => (
              <tr key={i}>
                <td>{a.name}</td>
                <td>{a.resultRaw}</td>
                <td>{a.unit}</td>
                <td>{a.pql ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {design.warnings.length > 0 && (
        <section className="card">
          <h2>Warnings</h2>
          <div className="warning-list">
            {design.warnings.map((w, i) => (
              <div key={i} className={`banner banner-${w.severity}`}>
                <strong>{w.analyte}: </strong>
                {w.message}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h2>Recommended System</h2>
        <p className="treatment-order-note">{design.treatmentOrderNote}</p>
        <div className="component-list">
          {design.components.map((c, i) => (
            <div key={i} className="component-card">
              <div className="component-card-header">
                <span className="component-category">{CATEGORY_LABELS[c.category] ?? c.category}</span>
                <h3>{c.title}</h3>
              </div>
              <p>{c.reason}</p>
              <p className="sizing-notes">{c.sizingNotes}</p>
              {c.triggeredBy.length > 0 && (
                <div className="triggered-by">
                  Triggered by: {c.triggeredBy.join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="disclaimer">
        Sizing figures come from a placeholder rules engine (see server/src/lib/sizingEngine.ts) and are a starting
        point only — verify against your own equipment specs before quoting or installing.
      </div>
    </>
  );
}
