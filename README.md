# CCH2O — Water Filtration System Designer

A web app that turns a well-water lab report into a recommended, sized
water treatment system: upload a lab PDF, confirm the household/site
details, and get a component-by-component design (sediment filter,
iron/manganese filter, softener, pH neutralizer, carbon, RO, UV) with
sizing notes and exceedance warnings.

## Project layout

```
server/   Express + TypeScript API, SQLite storage, PDF parsing, sizing engine
client/   React + Vite + TypeScript frontend
```

## Running locally

Two terminals:

```bash
# Backend (http://localhost:4000)
cd server
npm install
npm run dev

# Frontend (http://localhost:5173)
cd client
npm install
npm run dev
```

The client talks to the backend at `http://localhost:4000` by default;
override with `VITE_API_URL` if you deploy the API elsewhere.

## How it works

1. **Upload** (`client/src/pages/UploadPage.tsx`) — a lab report PDF is
   posted to `POST /api/lab-reports/parse`, which extracts text
   (`server/src/lib/pdfParser.ts`) and returns structured customer/site
   metadata plus a table of analyte readings. Extracted values are
   editable before continuing, and rows can be added/removed by hand.
2. **Household info** (`client/src/pages/HouseholdPage.tsx`) — occupants,
   bathrooms, peak flow rate, average daily use, water source, and budget
   tier are captured to drive sizing.
3. **Design generation** — `POST /api/designs/generate` runs the sizing
   engine (`server/src/lib/sizingEngine.ts`) against the analytes +
   household info and returns a recommended treatment train, sizing
   rationale for each component, and any MCL/aesthetic-threshold
   warnings. The result is saved to SQLite and can be revisited from
   **Saved Designs**.

## The PDF parser

`server/src/lib/pdfParser.ts` is tuned against the **Accurate Testing
Labs "Certificate of Analysis"** layout (see
`server/test-fixtures/accurate-testing-labs-sample.pdf` for a reference
sample). It parses the analyte table by column position rather than by
analyte name, so it tolerates a different subset of analytes being
tested from one report to the next. If your lab changes report vendors
or the layout looks meaningfully different, re-run the parser against a
new sample and adjust the token-parsing rules in `parseAnalyteLine` /
`extractMetadata` accordingly — the extracted values are always
shown/editable in the UI as a safety net either way.

## The sizing engine — placeholder, please tune it

`server/src/lib/sizingEngine.ts` starts with generic water-treatment
rules of thumb (EPA secondary MCLs, standard softener sizing math,
standard resin tank sizes, etc.), **not your company's actual
methodology or equipment specs**. Everything a recommendation depends on
lives in the `THRESHOLDS` object and the per-contaminant blocks in
`generateDesign()` — swap in your own numbers, add equipment-specific
sizing (model numbers, tank sizes, membrane GPD), or change which
analytes trigger which component, all in that one file.

## Data storage

SQLite (`server/data.sqlite3`, gitignored) via `better-sqlite3`. One
`designs` table stores each generated design (metadata, analytes,
household info, and the resulting design) as JSON columns — fine for a
single-installer tool; swap in a real schema/DB if this needs to scale
to multiple users or reporting.
