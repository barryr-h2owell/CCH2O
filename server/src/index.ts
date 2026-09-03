import cors from "cors";
import express from "express";
import { labReportsRouter } from "./routes/labReports.js";
import { designsRouter } from "./routes/designs.js";
import "./db.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/lab-reports", labReportsRouter);
app.use("/api/designs", designsRouter);

// Error handler (covers multer errors and anything else thrown in a route).
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`CCH2O server listening on http://localhost:${PORT}`);
});
