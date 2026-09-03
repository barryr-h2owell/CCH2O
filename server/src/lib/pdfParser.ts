import { PDFParse } from "pdf-parse";
import type { AnalyteReading, LabReportMetadata, ParsedLabReport } from "../types.js";

/**
 * Parser tuned against Accurate Testing Labs "Certificate of Analysis" reports
 * (the in-house lab format supplied as the reference sample). The analyte-row
 * parsing is column-order-based rather than name-keyed, so it tolerates the
 * lab testing a different subset of analytes on a given order without code
 * changes — only wildly different report layouts would need a new parser.
 */

const METHOD_PREFIX = /^(EPA|SM|ASTM|RSK|SW|HACH|USGS|SDWA|MCAWW|COLILERT|IDEXX|MTCA)$/i;
const DATE_TOKEN = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
const NON_DETECT_TOKEN = /^(ND|BDL|absent|none[- ]?detected)$/i;

function isResultToken(tok: string): boolean {
  if (NON_DETECT_TOKEN.test(tok)) return true;
  if (/^<\s?[\d,.]+$/.test(tok)) return true;
  if (/^-?[\d,]+\.?\d*$/.test(tok) && /\d/.test(tok)) return true;
  return false;
}

function parseAnalyteLine(line: string): AnalyteReading | null {
  const tokens = line.trim().split(/\s+/);
  if (tokens.length < 3) return null;

  // Locate the result token (skip index 0 so a numeric analyte name can't be
  // mistaken for the result).
  let resultIdx = -1;
  for (let i = 1; i < tokens.length; i++) {
    if (isResultToken(tokens[i])) {
      resultIdx = i;
      break;
    }
  }
  if (resultIdx === -1) return null;

  const name = tokens.slice(0, resultIdx).join(" ").replace(/,$/, (m) => m).trim();
  const resultRaw = tokens[resultIdx];

  // Tail: analyst (last token) + analysis date (token before it), both optional.
  let tailEnd = tokens.length;
  let analysisDateIdx = -1;
  if (tailEnd - 1 > resultIdx && DATE_TOKEN.test(tokens[tailEnd - 2] ?? "")) {
    analysisDateIdx = tailEnd - 2;
  } else if (DATE_TOKEN.test(tokens[tailEnd - 1] ?? "")) {
    analysisDateIdx = tailEnd - 1;
  }

  const bodyEnd = analysisDateIdx === -1 ? tokens.length : analysisDateIdx;

  // From resultIdx+1 up to bodyEnd, find where the method prefix starts.
  let methodStartIdx = -1;
  for (let i = resultIdx + 1; i < bodyEnd; i++) {
    if (METHOD_PREFIX.test(tokens[i])) {
      methodStartIdx = i;
      break;
    }
  }

  let unit: string;
  let pql: string | null = null;

  if (methodStartIdx === -1) {
    // No recognizable method code on this line — best-effort fallback.
    unit = tokens[resultIdx + 1] ?? "";
  } else {
    unit = tokens.slice(resultIdx + 1, methodStartIdx).join(" ");
    const methodTokenCount = methodStartIdx + 1 < bodyEnd && !DATE_TOKEN.test(tokens[methodStartIdx + 1]) ? 2 : 1;
    const afterMethodIdx = methodStartIdx + methodTokenCount;
    if (afterMethodIdx < bodyEnd) {
      pql = tokens.slice(afterMethodIdx, bodyEnd).join(" ") || null;
    }
  }

  const nonDetect = NON_DETECT_TOKEN.test(resultRaw);
  const numeric = parseFloat(resultRaw.replace(/^<\s?/, "").replace(/,/g, ""));

  return {
    name,
    result: Number.isFinite(numeric) ? numeric : null,
    resultRaw,
    unit,
    pql,
    nonDetect,
  };
}

function extractMetadata(lines: string[]): LabReportMetadata {
  const meta: LabReportMetadata = {
    labName: lines[0]?.trim() || null,
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

  const addressLines: string[] = [];
  let collectingAddress = false;

  for (const line of lines) {
    let m: RegExpMatchArray | null;

    if ((m = line.match(/^(\S+)\s*Order No\.:/))) {
      meta.orderNo = m[1];
      continue;
    }
    if ((m = line.match(/^Sample:\s*\S+\s+Matrix:\s*(.+)$/i))) {
      meta.matrix = m[1].trim();
      continue;
    }
    if ((m = line.match(/^Location:\s*(.+?)\s+D\/T Collected:\s*(.+)$/i))) {
      meta.location = m[1].trim();
      meta.dateCollected = m[2].trim();
      continue;
    }
    if ((m = line.match(/^Sample Type:\s*(.+?)\s+Collected by:\s*(.+)$/i))) {
      meta.sampleType = m[1].trim();
      meta.collectedBy = m[2].trim();
      continue;
    }
    if ((m = line.match(/^(.*?)\s*Description:\s*(.+)$/i))) {
      meta.reportedToName = m[1].trim() || null;
      meta.customerName = m[2].trim();
      continue;
    }
    if ((m = line.match(/^(.+?)\s+Date Received:\s*(.+)$/i))) {
      meta.reportedToCompany = m[1].trim();
      meta.dateReceived = m[2].trim();
      collectingAddress = true;
      continue;
    }
    // Street-address lines directly follow the "reported to" block, up to 2 lines
    // (street, then city/state/zip), and end at the report's boilerplate text.
    if (collectingAddress) {
      if (addressLines.length < 2 && !/:/.test(line)) {
        addressLines.push(line.trim());
      } else {
        collectingAddress = false;
      }
    }
  }

  if (addressLines.length) {
    meta.reportedToAddress = addressLines.join(", ");
  }

  return meta;
}

export async function parseLabReportPdf(buffer: Buffer): Promise<ParsedLabReport> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  const rawText = result.text;
  const lines = rawText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

  const headerIdx = lines.findIndex((l) => /^Analyte\s+Result\s+Unit\s+Method\s+PQL/i.test(l));
  const analytes: AnalyteReading[] = [];

  if (headerIdx !== -1) {
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const reading = parseAnalyteLine(lines[i]);
      if (reading) {
        analytes.push(reading);
      } else if (analytes.length > 0) {
        // First non-matching line after we've started collecting rows ends the table.
        break;
      }
    }
  }

  const metadata = extractMetadata(lines);

  return { metadata, analytes, rawText };
}
