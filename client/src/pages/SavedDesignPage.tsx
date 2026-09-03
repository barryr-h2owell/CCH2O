import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getDesign } from "../api";
import type { SavedDesignRecord } from "../types";
import { DesignView } from "../components/DesignView";

export function SavedDesignPage() {
  const { id } = useParams();
  const [record, setRecord] = useState<SavedDesignRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getDesign(Number(id))
      .then(setRecord)
      .catch((e) => setError((e as Error).message));
  }, [id]);

  if (error) {
    return (
      <div className="page">
        <div className="banner banner-error">{error}</div>
        <Link to="/history" className="btn-secondary">
          ← Back to Saved Designs
        </Link>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="page">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>System Design #{record.id}</h1>
      <p className="subtitle">Saved {new Date(record.createdAt).toLocaleString()}</p>

      <DesignView metadata={record.metadata} analytes={record.analytes} household={record.household} design={record.design} />

      <div className="actions-row">
        <Link to="/history" className="btn-secondary">
          ← Back to Saved Designs
        </Link>
      </div>
    </div>
  );
}
