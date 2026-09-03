import { Link, useNavigate } from "react-router-dom";
import { useWizard } from "../WizardContext";
import { DesignView } from "../components/DesignView";

export function ResultsPage() {
  const navigate = useNavigate();
  const { metadata, analytes, household, design, savedId, reset } = useWizard();

  if (!metadata || !household || !design) {
    navigate("/");
    return null;
  }

  return (
    <div className="page">
      <h1>System Design</h1>
      {savedId && <p className="subtitle">Saved as design #{savedId}.</p>}

      <DesignView metadata={metadata} analytes={analytes} household={household} design={design} />

      <div className="actions-row">
        <Link
          to="/"
          className="btn-secondary"
          onClick={() => reset()}
        >
          Start New Design
        </Link>
        <Link to="/history" className="btn-primary">
          View All Designs
        </Link>
      </div>
    </div>
  );
}
