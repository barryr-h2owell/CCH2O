import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadLabReport } from "../api";
import { useWizard } from "../WizardContext";
import type { AnalyteReading, LabReportMetadata } from "../types";

// Matches the dealer's own on-site field-test form (see server/past-contracts/), so a rep
// reading values off their test kit can add exactly these rows without typing analyte names.
const QUICK_ADD_FIELDS: { name: string; unit: string }[] = [
  { name: "Hardness", unit: "GPG" },
  { name: "Iron (fe++)", unit: "mg/L" },
  { name: "Iron (fe+++)", unit: "mg/L" },
  { name: "pH", unit: "pH Units" },
  { name: "TDS", unit: "mg/L" },
  { name: "Chlorine", unit: "mg/L" },
  { name: "Turbidity", unit: "NTU" },
  { name: "Arsenic", unit: "mg/L" },
  { name: "Nitrate", unit: "mg/L" },
];

// Not on the standard field-test form, but the sizing engine checks these -- add if tested
// separately (e.g. by the lab, or a dedicated meter/strip).
const ADDITIONAL_QUICK_ADD_FIELDS: { name: string; unit: string }[] = [
  { name: "Manganese", unit: "mg/L" },
  { name: "Silica", unit: "mg/L" },
  { name: "Sulfate", unit: "mg/L" },
  { name: "Hydrogen Sulfide", unit: "mg/L" },
];

export function UploadPage() {
  const navigate = useNavigate();
  const { setLabData } = useWizard();
  const [metadata, setMetadata] = useState<LabReportMetadata | null>(null);
  const [analytes, setAnalytes] = useState<AnalyteReading[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    try {
      const parsed = await uploadLabReport(file);
      setMetadata(parsed.metadata);
      setAnalytes(parsed.analytes);
      setCustomerName(parsed.metadata.customerName ?? "");
      setLocation(parsed.metadata.location ?? "");
      if (parsed.analytes.length === 0) {
        setError("No analyte rows were recognized in this PDF. You can still add them manually below.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function quickAdd(name: string, unit: string) {
    setAnalytes((prev) => {
      if (prev.some((a) => a.name.toLowerCase() === name.toLowerCase())) return prev;
      return [...prev, { name, result: null, resultRaw: "", unit, pql: null, nonDetect: false }];
    });
  }

  function updateAnalyte(index: number, field: keyof AnalyteReading, value: string) {
    setAnalytes((prev) =>
      prev.map((a, i) => {
        if (i !== index) return a;
        if (field === "result") {
          const num = parseFloat(value);
          return { ...a, result: Number.isFinite(num) ? num : null, resultRaw: value };
        }
        if (field === "nonDetect") {
          return { ...a, nonDetect: value === "true" };
        }
        return { ...a, [field]: value };
      })
    );
  }

  function addAnalyteRow() {
    setAnalytes((prev) => [...prev, { name: "", result: null, resultRaw: "", unit: "", pql: null, nonDetect: false }]);
  }

  function removeAnalyteRow(index: number) {
    setAnalytes((prev) => prev.filter((_, i) => i !== index));
  }

  function handleContinue() {
    const md: LabReportMetadata = {
      labName: metadata?.labName ?? null,
      orderNo: metadata?.orderNo ?? null,
      customerName: customerName.trim() || null,
      location: location.trim() || null,
      sampleType: metadata?.sampleType ?? null,
      matrix: metadata?.matrix ?? null,
      dateCollected: metadata?.dateCollected ?? null,
      dateReceived: metadata?.dateReceived ?? null,
      collectedBy: metadata?.collectedBy ?? null,
      reportedToName: metadata?.reportedToName ?? null,
      reportedToCompany: metadata?.reportedToCompany ?? null,
      reportedToAddress: metadata?.reportedToAddress ?? null,
    };
    setLabData(md, analytes);
    navigate("/household");
  }

  return (
    <div className="page">
      <h1>New System Design</h1>
      <p className="subtitle">
        Upload a lab report to pull in the water test results, or use Quick Add below to enter field-test results by
        hand.
      </p>

      <div
        className={`dropzone ${dragOver ? "dropzone-active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {loading ? <p>Parsing PDF…</p> : <p>Drag &amp; drop a lab report PDF here, or click to choose a file</p>}
      </div>

      {error && <div className="banner banner-warning">{error}</div>}

      <section className="card">
        <h2>Site Info</h2>
        <div className="form-grid">
          <label>
            Customer name
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Anderson, Anthony" />
          </label>
          <label>
            Location
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Well D911540" />
          </label>
        </div>
        {metadata && (
          <div className="meta-grid" style={{ marginTop: "0.9rem" }}>
            <div>
              <strong>Lab</strong>
              <span>{metadata.labName ?? "—"}</span>
            </div>
            <div>
              <strong>Order No.</strong>
              <span>{metadata.orderNo ?? "—"}</span>
            </div>
            <div>
              <strong>Water Source Type</strong>
              <span>{metadata.sampleType ?? metadata.matrix ?? "—"}</span>
            </div>
            <div>
              <strong>Date Collected</strong>
              <span>{metadata.dateCollected ?? "—"}</span>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Quick Add (field test results)</h2>
        <p className="form-section-hint">Matches the standard field-test form — click to add a row, then type in the reading.</p>
        <div className="quick-add-row">
          {QUICK_ADD_FIELDS.map((f) => {
            const already = analytes.some((a) => a.name.toLowerCase() === f.name.toLowerCase());
            return (
              <button
                key={f.name}
                type="button"
                className={already ? "chip chip-added" : "chip"}
                onClick={() => quickAdd(f.name, f.unit)}
                disabled={already}
              >
                {already ? "✓ " : "+ "}
                {f.name}
              </button>
            );
          })}
        </div>
        <p className="form-section-hint" style={{ marginTop: "0.6rem" }}>
          Additional (if tested separately):
        </p>
        <div className="quick-add-row">
          {ADDITIONAL_QUICK_ADD_FIELDS.map((f) => {
            const already = analytes.some((a) => a.name.toLowerCase() === f.name.toLowerCase());
            return (
              <button
                key={f.name}
                type="button"
                className={already ? "chip chip-added" : "chip"}
                onClick={() => quickAdd(f.name, f.unit)}
                disabled={already}
              >
                {already ? "✓ " : "+ "}
                {f.name}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="card-header-row">
          <h2>Test Results</h2>
          <button type="button" className="btn-secondary" onClick={addAnalyteRow}>
            + Add row
          </button>
        </div>
        {analytes.length === 0 ? (
          <p className="empty-note">No results yet. Upload a report above, use Quick Add, or add rows manually.</p>
        ) : (
          <div className="table-scroll">
            <table className="analyte-table">
              <thead>
                <tr>
                  <th>Analyte</th>
                  <th>Result</th>
                  <th>Unit</th>
                  <th>PQL</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {analytes.map((a, i) => (
                  <tr key={i}>
                    <td>
                      <input value={a.name} onChange={(e) => updateAnalyte(i, "name", e.target.value)} placeholder="e.g. Iron" />
                    </td>
                    <td>
                      <input value={a.resultRaw} onChange={(e) => updateAnalyte(i, "result", e.target.value)} placeholder="e.g. 4.61" />
                    </td>
                    <td>
                      <input value={a.unit} onChange={(e) => updateAnalyte(i, "unit", e.target.value)} placeholder="mg/L" />
                    </td>
                    <td>
                      <input value={a.pql ?? ""} onChange={(e) => updateAnalyte(i, "pql", e.target.value)} placeholder="optional" />
                    </td>
                    <td>
                      <button type="button" className="btn-icon" onClick={() => removeAnalyteRow(i)} aria-label="Remove row">
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="actions-row">
        <button type="button" className="btn-primary" onClick={handleContinue}>
          Continue to Household Info →
        </button>
      </div>
    </div>
  );
}
