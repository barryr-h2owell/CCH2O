import { Router } from "express";
import { db } from "../db.js";
import { generateDesign } from "../lib/sizingEngine.js";
import type { AnalyteReading, HouseholdInfo, LabReportMetadata, SavedDesignRecord } from "../types.js";

export const designsRouter = Router();

interface GenerateRequestBody {
  metadata: LabReportMetadata;
  analytes: AnalyteReading[];
  household: HouseholdInfo;
  save?: boolean;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function validateHousehold(h: unknown): h is HouseholdInfo {
  if (!h || typeof h !== "object") return false;
  const household = h as Record<string, unknown>;
  return (
    isFiniteNumber(household.numOccupants) &&
    isFiniteNumber(household.numBathrooms) &&
    isFiniteNumber(household.peakFlowGpm) &&
    isFiniteNumber(household.averageDailyUseGallons) &&
    (household.waterSource === "well" || household.waterSource === "municipal") &&
    typeof household.hasWaterHeater === "boolean" &&
    (household.budgetTier === "economy" || household.budgetTier === "standard" || household.budgetTier === "premium")
  );
}

designsRouter.post("/generate", (req, res) => {
  const body = req.body as Partial<GenerateRequestBody>;

  if (!Array.isArray(body.analytes)) {
    res.status(400).json({ error: "analytes must be an array" });
    return;
  }
  if (!validateHousehold(body.household)) {
    res.status(400).json({ error: "household info is missing or invalid" });
    return;
  }

  const design = generateDesign(body.analytes, body.household);

  let savedId: number | null = null;
  if (body.save) {
    const stmt = db.prepare(
      `INSERT INTO designs (created_at, metadata_json, analytes_json, household_json, design_json)
       VALUES (?, ?, ?, ?, ?)`
    );
    const info = stmt.run(
      new Date().toISOString(),
      JSON.stringify(body.metadata ?? {}),
      JSON.stringify(body.analytes),
      JSON.stringify(body.household),
      JSON.stringify(design)
    );
    savedId = Number(info.lastInsertRowid);
  }

  res.json({ design, savedId });
});

designsRouter.get("/", (_req, res) => {
  const rows = db
    .prepare(`SELECT id, created_at, metadata_json, household_json FROM designs ORDER BY id DESC`)
    .all() as { id: number; created_at: string; metadata_json: string; household_json: string }[];

  const summaries = rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    metadata: JSON.parse(r.metadata_json) as LabReportMetadata,
    household: JSON.parse(r.household_json) as HouseholdInfo,
  }));

  res.json(summaries);
});

designsRouter.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const row = db.prepare(`SELECT * FROM designs WHERE id = ?`).get(id) as
    | {
        id: number;
        created_at: string;
        metadata_json: string;
        analytes_json: string;
        household_json: string;
        design_json: string;
      }
    | undefined;

  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }

  const record: SavedDesignRecord = {
    id: row.id,
    createdAt: row.created_at,
    metadata: JSON.parse(row.metadata_json),
    analytes: JSON.parse(row.analytes_json),
    household: JSON.parse(row.household_json),
    design: JSON.parse(row.design_json),
  };

  res.json(record);
});

designsRouter.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  db.prepare(`DELETE FROM designs WHERE id = ?`).run(id);
  res.status(204).send();
});
