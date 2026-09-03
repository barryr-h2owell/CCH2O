import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteDesign, listDesigns } from "../api";
import type { SavedDesignSummary } from "../types";

export function HistoryPage() {
  const [designs, setDesigns] = useState<SavedDesignSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    listDesigns()
      .then(setDesigns)
      .catch((e) => setError((e as Error).message));
  }

  useEffect(load, []);

  async function handleDelete(id: number) {
    if (!confirm("Delete this saved design?")) return;
    await deleteDesign(id);
    load();
  }

  return (
    <div className="page">
      <h1>Saved Designs</h1>
      {error && <div className="banner banner-error">{error}</div>}

      {designs && designs.length === 0 && <p className="empty-note">No designs saved yet.</p>}

      <div className="history-list">
        {designs?.map((d) => (
          <div key={d.id} className="card history-item">
            <div>
              <strong>{d.metadata.customerName ?? "Unnamed customer"}</strong>
              <div className="history-meta">
                {d.metadata.location ?? "—"} · {new Date(d.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div className="history-actions">
              <Link to={`/designs/${d.id}`} className="btn-secondary">
                View
              </Link>
              <button type="button" className="btn-icon" onClick={() => handleDelete(d.id)} aria-label="Delete">
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="actions-row">
        <Link to="/" className="btn-primary">
          + New Design
        </Link>
      </div>
    </div>
  );
}
