import { NavLink, Route, Routes } from "react-router-dom";
import { WizardProvider } from "./WizardContext";
import { UploadPage } from "./pages/UploadPage";
import { HouseholdPage } from "./pages/HouseholdPage";
import { ResultsPage } from "./pages/ResultsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { SavedDesignPage } from "./pages/SavedDesignPage";
import "./App.css";

function App() {
  return (
    <WizardProvider>
      <div className="app-shell">
        <header className="app-header">
          <span className="app-title">CCH2O · Water Filtration Designer</span>
          <nav>
            <NavLink to="/" end>
              New Design
            </NavLink>
            <NavLink to="/history">Saved Designs</NavLink>
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/household" element={<HouseholdPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/designs/:id" element={<SavedDesignPage />} />
          </Routes>
        </main>
      </div>
    </WizardProvider>
  );
}

export default App;
