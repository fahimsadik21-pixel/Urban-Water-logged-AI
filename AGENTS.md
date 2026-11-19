# Urban Water-logged AI Agent Instructions

These instructions apply to every coding agent working in this project.

## Required Reading Before Work

Read these files in order:

1. `PROJECT_CHECKPOINT.md`
2. `PROJECT_PHASES.md`
3. `DATASET_README.md`
4. `datasets/data_dictionary.csv`

Do not restart completed work unless the checkpoint reports a failed validation
or the user explicitly asks for a redesign.

## Mandatory Checkpoint Protocol

Update `PROJECT_CHECKPOINT.md` after every meaningful implementation step.

Each update must record:

- Date and time
- Current phase and step
- Work completed
- Files created or changed
- Commands or migrations executed
- Tests and their actual results
- Assumptions or technical decisions
- Known limitations or blockers
- Exact next action

Never mark a step complete without executing the relevant validation. If a test
was not run, write `NOT RUN`. Do not claim unverified behaviour.

## Project Rules

- Preserve existing user files and diagrams.
- Follow the three phases in `PROJECT_PHASES.md`.
- Keep hidden `true_*` ground-truth fields out of model inputs.
- Respect the provided train, validation and test splits.
- Label synthetic results as `Simulation Benchmark`.
- Never claim the synthetic data represents measured Dhaka conditions.
- AI must not directly control a physical pump without local deterministic
  safety interlocks.
- Raw camera media stays off-chain. Store only hashes and audit metadata in the
  tamper-evident ledger.
- A small IoT backup battery does not power a large dewatering pump.
- On power recovery, re-evaluate safety conditions and reject stale commands.
- Keep implemented, simulated, hardware-dependent and externally blocked
  features clearly separated.

## Dataset Validation

Before Phase 1 implementation and after any dataset regeneration, run:

```text
python scripts/validate_synthetic_datasets.py datasets
```

The expected baseline is 20 CSV files and 1,214,992 total rows. If the output
differs, investigate before training or importing data.

## Handoff Rule

When stopping for any reason, update the `Resume From Here` section of
`PROJECT_CHECKPOINT.md` with one unambiguous next action. The next agent must be
able to continue without reconstructing the conversation history.
