# Past Jobs

Drop past company contracts/job records here — each one should show the
water analysis results for a job **and** the equipment that was actually
sold/installed for that customer.

## Why this exists

The sizing engine (`server/src/lib/sizingEngine.ts`) currently encodes
generic decision rules built from Water-Right/Master Water spec sheets:
EPA MCL thresholds, each product's rated capacity, and simple routing
logic (e.g. "iron > 1.0 ppm and hardness needs softening → Sanitizer Plus
instead of a plain softener"). That's a reasonable starting point, but
it isn't how your in-house expert actually designs systems — real jobs
weigh things a spec sheet doesn't capture: site constraints, customer
budget, redundancy, local well conditions, judgment calls between two
similarly-rated products, etc.

This folder is meant to become that missing reference: a set of real
water-test-in, equipment-out examples that show how those calls were
actually made. Once there are enough of them, the plan is to go through
them together — pull out the analyte values and the equipment that was
chosen for each, compare that against what today's sizing engine would
have recommended for the same water, and use the gaps to refine the
engine's rules (adjust thresholds, add judgment calls it's currently
missing, or flag cases that genuinely need a person, not automation).

## What to add

Any format is fine to start (PDF contracts, scanned quotes, whatever you
have) — just make sure each one includes, or is named/organized so it's
clear:
- The water test results (or a reference to which lab report they go with)
- The equipment/models that were sold for that job
- Ideally the site info that drove the decision (household size, well
  vs. municipal, budget tier, etc.) if it's in the contract

## A note on customer data

These are real customer records. This repo is already private to the
org and contains a real customer's info in the sample lab report used
for testing (`server/test-fixtures/`), so this is consistent with that
— just flagging it so it's a deliberate choice, not an oversight, if
this repo's access ever needs to be reviewed.
