# Kivara AI Governance — Interim Charter

> **STATUS: UNRATIFIED. NOT A CONSTITUTION.**
>
> This document is a plain-language description of rules that are **already enforced in
> code**. It exists so the authority model is legible to a human reader. It creates no new
> authority, grants no new permission, and has not been reviewed or adopted by the
> company's owners. Where this document and the code disagree, **the code is the policy**,
> and this document is the bug.
>
> It should be read alongside, never instead of:
> - `src/lib/ai/autonomy-policy.ts` — the enforced authority model
> - `src/lib/ai/agent-registry.ts` — the canonical 37-role catalogue
> - `src/lib/ai/agent-runtime.ts` — what is actually implemented, tested against the registry
>
> The enforcement tests live in `src/lib/ai/agent-runtime.test.ts` and
> `src/lib/ai/agents/analytical.test.ts`. If this document ever claims something the tests
> do not check, treat the claim as unsupported.

## The one honest question

**How much of Kivara runs without a human pressing the button?**

The code's answer, as enforced today:

| | Count | Can it take action? |
|---|---|---|
| Executable agents | 9 | Yes, within their class |
| Analytical agents | 22 | **No. Recommend-only, always.** |
| Orchestration labels | 6 | Not software. They name who decides, not who acts. |
| Declared-only / aspirational | 0 | — |

The 22 analytical agents are real, tested, and reachable at
`GET /api/admin/agent-briefing`. They read live platform data and produce findings. They
**cannot** send, book, charge, publish, or write a decision. This distinction is enforced
mechanically: the runtime classifies them as `analytical`, the census reports them under
`canOnlyAdvise`, and `canAct` counts only the 9 executable agents.

## Authority levels

Each action belongs to a class, and each class demands a level of authority. The mapping is
monotonic by design: a more consequential action can never require less authority.

| Level | Meaning | Actions that sit here |
|---|---|---|
| 0 | Observe | `observe` — read platform state |
| 1 | Recommend | `recommend` — produce a recommendation |
| 2 | Execute low-risk | `draft`, `internal_write` — staged artifacts, reversible internal changes |
| 3 | Autonomous operations | `outbound_message` — send to a client or guest |
| 4 | Human authorization | `supplier_commitment`, `financial_commitment`, `contractual` |

**Level 4 is not a setting.** Moving money, committing to a supplier, and signing anything
requires a person, regardless of how the autonomy dial is positioned. The code comments
refer to this as the constitution naming these "always-human"; no such ratified document
exists yet, so treat that as a design intent recorded in code, not as law.

## Split of powers

Authority is deliberately divided so no single component can both advise and act on the
same decision:

- **Sterling** (commercial intelligence) computes and recommends. It never sends anything
  and never touches money directly.
- **KORA** (optimization and resilience) observes the whole company and writes findings. It
  never sends, never spends, never contacts a guest. An auditor that can email clients is
  not an auditor.
- **Amara** (narrative and brand) produces narrative text only. Unreviewed prose must never
  reach a client.

## Before anything acts

Even inside the dial, an action is held for a human when any of these is true:

- **Confidence** below `70` (`DEFAULT_MIN_CONFIDENCE`)
- **Evidence** below `1` source (`DEFAULT_MIN_EVIDENCE`)
- **Exposure** above `5,000` (`DEFAULT_HIGH_VALUE_THRESHOLD`)
- The action is level 4, regardless of the thresholds above

When an action is held, the resulting record is written with status
`PENDING_HUMAN_REVIEW` and flagged `pendingHumanReview`. A held action is a normal outcome,
not a failure state.

## The evidence standard

Every agent report must distinguish what it *measured* from what it *inferred*. Reports
carry:

- `evidenceBasis` — the tables and fields actually read
- `unavailableInputs` — what it needed and could not get
- `dataAvailability` — `full`, `partial`, or `unavailable`

An agent with no data source returns an explicit "no data" finding. It does not produce a
plausible number. This is enforced by tests, not by convention: the analytical suite asserts
that fabricated figures — competitor names, prices, market shares — cannot appear in a
report built from absent data.

## Audit trail

Consequential records are append-only. Rows are written, never updated in place, and each
write is attributable. The governance tables currently holding real rows:

| Table | Holds |
|---|---|
| `decisions` | Quality-gate verdicts from real quotes, with the issues that drove them |
| `supplier_performance` | Supplier appraisals, scored from real supplier records |
| `system_events` | Coordination events between capabilities |
| `system_gaps` | Detected capability gaps, with remediation state |

These tables are populated by production code paths as those paths run, including quote
generation and supplier appraisal. They are never back-filled by hand: a governance row that
no real process produced would make the audit trail worse than useless, not better.

## What is not settled

Being explicit about the gaps matters more than sounding complete:

- **No ratified constitution exists.** Section numbering in code comments (for example
  "constitution §III", "§XII") refers to a document that has not been written or adopted.
  Those references describe intent, and should eventually point at a real ratified text.
- **The autonomy dial is not founder-tunable at runtime.** The levels and thresholds are
  code constants. Changing them is a code change with a review, not a settings toggle.
- **Analytical agents have no persistence.** They produce reports and are discarded. Nothing
  in this charter claims they write history.
- **The six orchestration labels are not software.** They name accountability, and
  conflating them with running agents is how the earlier "37 agents" overclaim happened.

## How to change this

This document is derived, not authoritative. To change the rules, change the code
(`autonomy-policy.ts` and its tests) and regenerate this file from the result. Do not edit
this file to describe a change that is not enforced.
