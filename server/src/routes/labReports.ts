import { Router } from "express";
import multer from "multer";
import { parseLabReportPdf } from "../lib/pdfParser.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("Only PDF files are supported"));
      return;
    }
    cb(null, true);
  },
});

export const labReportsRouter = Router();

labReportsRouter.post("/parse", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded (expected multipart field 'file')" });
    return;
  }
  try {
    const parsed = await parseLabReportPdf(req.file.buffer);
    res.json(parsed);
  } catch (err) {
    console.error("Failed to parse lab report PDF:", err);
    res.status(422).json({ error: "Could not parse this PDF as a lab report", detail: (err as Error).message });
  }
});
