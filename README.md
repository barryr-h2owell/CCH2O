# CCH2O — Water Filtration System Designer

A web app that turns a well-water lab report into a recommended, sized
water treatment system: upload a lab PDF, confirm the household/site
details, and get a component-by-component design (sediment filter,
iron/manganese filter, softener, pH neutralizer, carbon, RO, UV) with
sizing notes and exceedance warnings.

## Project layout

```
server/             Express + TypeScript API, SQLite storage, PDF parsing, sizing engine
server/spec-sheet/  Water-Right/Master Water product spec sheet PDFs backing the catalog/sizing engine
server/past-jobs/   Real past contracts (water test -> equipment sold) -- see server/past-jobs/README.md
client/              React + Vite + TypeScript frontend
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

## The sizing engine — real Water-Right product data, one gap

`server/src/lib/waterRightCatalog.ts` holds the actual Water-Right, Inc.
product catalog (model numbers, grain capacities, max hardness/iron/
manganese/pH ratings, flow rates), transcribed directly from the spec
sheets in `server/spec-sheet/`:

- **Softeners**: Impression Series (`IM-`, well water) and Impression +
  carbon (`IMRC-`, chlorinated/municipal)
- **Sanitizer Plus** (`ASP1-`/`ASP2-`): combined softening + iron/
  manganese reduction for well water, up to 15 ppm combined Fe/Mn
- **Air filters**: Greensand Plus (`IAG-`), AirCAT (`IACG-`, lower min
  pH), Birm (`IMFE-`), Catalytic Carbon (`IMS-`, sulfur/H2S)
- **Acid neutralizer** (`IMBF-xxxxMAN`), **Turbidex sediment filter**
  and **carbon backwash filter** (`IMBF-`), **greensand iron filter**
  (`IMAF-xxxxMGS`)
- **HomeShield** whole-house carbon/PFAS filter (`AOS-HS-1200`)
- **Impression R.O.** (Microline TFC-435) point-of-use RO
- **VIQUA Arros** UV disinfection (`Arros 9/15/22`) — VIQUA/Trojan
  Technologies is the UV partner brand Water-Right installs; sized on
  the conservative NSF/EPA 40 mJ/cm² flow rating, with a check against
  its required influent limits (hardness, iron, tannin)
- **Master Water Fusion 2.0** (`MWGP-`/`MWCGP-`/`MWHS-`) — a sibling
  A.O. Smith brand the dealer also installs, used only as a *fallback*
  for the standalone iron/manganese air filter when Water-Right's model
  can't cover the iron/H2S level (Master Water's plain Greensand Plus
  rates higher: 5.0 ppm iron / 1.0 ppm H2S vs Water-Right's 4.0 / 0.5).
  Master Water's Clarifier 2.0 line (fine-particulate/Turbidex
  filtration) is deliberately **not** in the catalog — whether it's
  needed can only be determined by an on-site field test, not from lab
  chemistry, so it isn't something this lab-report-driven engine can
  trigger.
- **Cascadian PolyHalt** (`ICS-P`/`ICS-PH`) — a third-party brand (not
  Water-Right/Master Water) for silica removal, triggered off a
  `Silica` analyte when the lab report includes one (silica has no EPA
  MCL, so the trigger point is a general industry rule of thumb, not a
  dealer- or spec-sheet-given figure — see `SILICA_CONCERN_THRESHOLD_PPM`)
- **Custom Care UF Series** (Ultra-Filter, 0.02 micron) and
  **Water-Right ONE Green Series** (Nano One, 0.2 micron cartridge) —
  optional final "polish" filters, plus **QuadPro** (the dealer's name
  for the point-of-use RO/bottle-filler, same Microline TFC-435 spec as
  above). None of these three are lab-triggered — see below.

### Field judgment the lab report can't capture

Two things came directly from the dealer, not from any spec sheet, after
cross-checking the engine's recommendations against `server/past-contracts/`
(32 real water-test-in/equipment-out records):

- **Staining observed on fixtures** (`HouseholdInfo.stainingObserved`) —
  well iron fluctuates seasonally, so a single lab test can catch it on a
  low day even when staining shows the real level runs higher. Per the
  dealer: iron near 1.0 ppm always gets a Sanitizer Plus; iron as low as
  ~0.5 ppm still gets one if staining is visibly present. This pulls the
  Sanitizer Plus trigger down from 1.0 to 0.5 ppm when the box is checked.
- **Polish filter tier and QuadPro RO** (`HouseholdInfo.polishFilterTier`,
  `pointOfUseRoRequested`) — confirmed against the same 32 contracts that
  which polish filter gets sold (none / Nano One / Ultra-Filter) tracks no
  tested value at all; it's a customer conversation about how fine a
  polish they want. Same for QuadPro, sold as an add-on regardless of lab
  results, not only when nitrate/arsenic/TDS trigger an RO. Both are
  manual selections in the household form rather than auto-triggered.

"Sulfur System" on real contracts is just the dealer's name for the
existing Catalytic Carbon filter (`CATALYTIC_CARBON_MODELS`/`IMS-xxxx`) —
no separate product, only different terminology; the design output notes
the alias.

`server/src/lib/sizingEngine.ts` picks the smallest catalog model that
satisfies the required capacity/flow *and* stays within that model's
rated hardness/iron/manganese/pH limits, routing well water with
elevated iron+manganese to Sanitizer Plus (or a standalone air filter
when no softening is needed) instead of a plain softener once it
exceeds the 1.0 ppm iron rating a standard softener carries. When raw
water exceeds every catalog model's rating (e.g. combined Fe/Mn over 15
ppm), it emits a warning instead of guessing a product. The
iron-to-hardness fouling-load factor used when sizing a softener for
iron-bearing water (`ironHardnessEquivalentGpgPerMgL` in `THRESHOLDS`)
is Water-Right's own published figure — "1 ppm iron = 4 gpg" — from
`Water-Right-IM-Softener-Manual.pdf`.

**Known gap:** the Impression Tannin filter is sized by flow rate only
(its literature covers features, not a tannin-ppm exchange capacity
chart) — confirm actual capacity with Water-Right before finalizing a
tannin quote.

EPA secondary/primary MCL thresholds (used for warnings, not product
selection) still live in the `THRESHOLDS` object at the top of
`sizingEngine.ts`.

## Data storage

SQLite (`server/data.sqlite3`, gitignored) via `better-sqlite3`. One
`designs` table stores each generated design (metadata, analytes,
household info, and the resulting design) as JSON columns — fine for a
single-installer tool; swap in a real schema/DB if this needs to scale
to multiple users or reporting.
