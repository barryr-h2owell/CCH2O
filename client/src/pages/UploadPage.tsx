import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadLabReport } from "../api";
import { useWizard } from "../WizardContext";
import type { AnalyteReading, LabReportMetadata } from "../types";

export function UploadPage() {
  const navigate = useNavigate();
  const { setLabData } = useWizard();
  const [metadata, setMetadata] = useState<LabReportMetadata | null>(null);
  const [analytes, setAnalytes] = useState<AnalyteReading[]>([]);
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
      if (parsed.analytes.length === 0) {
        setError("No analyte rows were recognized in this PDF. You can still add them manually below.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
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
    const md: LabReportMetadata =
      metadata ?? {
        labName: null,
        orderNo: null,
        customerName: null,
        location: null,
        sampleType: null,
        matrix: null,
        dateCollected: null,
        dateReceived: null,
        collectedBy: null,
        reportedToName: null,
        reportedToCompany: null,
        reportedToAddress: null,
      };
    setLabData(md, analytes);
    navigate("/household");
  }

  return (
    <div className="page">
      <h1>New System Design</h1>
      <p className="subtitle">Upload a lab report to pull in the water test results, or skip and enter values manually.</p>

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

      {metadata && (
        <section className="card">
          <h2>Report Details</h2>
          <div className="meta-grid">
            <div>
              <strong>Customer</strong>
              <span>{metadata.customerName ?? "—"}</span>
            </div>
            <div>
              <strong>Lab</strong>
              <span>{metadata.labName ?? "—"}</span>
            </div>
            <div>
              <strong>Order No.</strong>
              <span>{metadata.orderNo ?? "—"}</span>
            </div>
            <div>
              <strong>Location</strong>
              <span>{metadata.location ?? "—"}</span>
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
        </section>
      )}

      <section className="card">
        <div className="card-header-row">
          <h2>Test Results</h2>
          <button type="button" className="btn-secondary" onClick={addAnalyteRow}>
            + Add row
          </button>
        </div>
        {analytes.length === 0 ? (
          <p className="empty-note">No results yet. Upload a report above, or add rows manually.</p>
        ) : (
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
