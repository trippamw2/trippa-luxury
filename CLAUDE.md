@AGENTS.md

# Kivara AI Governance

## Read this first: the constitution is not in this repository

Fifteen comments across `autonomy-policy.ts`, `kora.ts`, `guest-profiler.ts`,
`guest-profiler.test.ts`, `event-bus.ts`, `quality-gate.ts` and migration `028`
cite a constitution (§III ×3, §XI ×6, §XII ×3, §XIII ×2, §XIV ×1).
**No constitution document exists in this repository.** Those citations are not
verifiable against a source.

Until the document is committed here, the only machine-checkable statement of
those rules is `src/lib/ai/autonomy-policy.ts` and its 41 tests. Treat that
module — not the comments, and not this file — as the authority. If the two
disagree, the constitution wins once it exists; today the code is all we have.

## The enforced governance model

`autonomy-policy.ts` is pure and does no I/O, so these rules are exhaustively
tested and cannot drift from the database.

### Five autonomy levels

| Level | Label | Meaning |
| --- | --- | --- |
| 0 | Observe | Read platform state only |
| 1 | Recommend | Produce a recommendation |
| 2 | Execute low-risk | Reversible internal work |
| 3 | Autonomous operations | Staged outbound sends |
| 4 | Human authorization | Never machine-authorized |

**The company runs at level 2** (`DEFAULT_COMPANY_AUTONOMY_LEVEL`). Level 3 is
deliberately *not* the default: the runtime gates were only recently stood up,
and 3 before they exist would mean unreviewed outbound with no audit trail.

### Eight action classes, least to most consequential

`observe` → `recommend` → `draft` → `internal_write` → `outbound_message` →
`supplier_commitment` → `financial_commitment` → `contractual`

The ordering is load-bearing. Required authority is monotonic by class, so a
more consequential class can never require less. `supplier_commitment`,
`financial_commitment` and `contractual` are level 4 **at any dial position**.

### Capability permissions

| Capability | May perform |
| --- | --- |
| CADC — Central Autonomous Director Core | observe, recommend, draft |
| Constantine — Client Intelligence | + internal_write |
| Beatrice — Journey Architecture | + internal_write |
| Sterling — Commercial Intelligence | + internal_write |
| Amara — Narrative & Brand Intelligence | observe, recommend, draft |
| Orion — Execution & Communications | + outbound_message, supplier_commitment, financial_commitment |
| KORA — Optimization & Resilience Architect | + internal_write |

The split of powers is the point. Sterling computes and recommends but never
sends and never moves money; Orion executes. KORA never sends, spends, or
contacts a guest — an auditor that can email clients is not an auditor. Amara
produces narrative text only, so unreviewed prose can never reach a client.

### Hard blocks vs. escalations

Only two conditions hard-block an action:

1. `capability_not_permitted` — a capability attempting a class it was never granted.
2. `record_pending_human_review` — the record is under human review.

Everything else **escalates to a human rather than being refused**. A proposal
awaiting review is a normal state of the company, not an error.

Remaining triggers: `consequential_action_class`, `exceeds_company_autonomy_level`,
`outbound_not_staged` (a send must pass through `STAGED_UNSENT` first),
`low_confidence`, `confidence_not_assessed`, `insufficient_evidence`,
`high_value_exposure`.

Note the deliberate asymmetry: an **absent** confidence score escalates exactly
like a low one, because acting on unstated confidence is fabrication. Evidence
only fires when explicitly zero, because a deterministic action has no
observation base by definition.

### Thresholds

`DEFAULT_MIN_CONFIDENCE` 70 · `DEFAULT_MIN_EVIDENCE` 1 ·
`DEFAULT_HIGH_VALUE_THRESHOLD` 5000.

## Capability → agent registry

**This mapping is derived, not constitutional.** With no constitution in the
repository there is no authoritative source to map *from*; it is inferred from
each agent's `department`, `objective` and `permissions` in
`src/lib/ai/agent-registry.ts` (37 catalogued roles, 12 departments, seeded by migration
020). Treat it as a proposal for review, and correct it if the constitution
disagrees.

| Capability | Agents |
| --- | --- |
| CADC | chief-of-staff, analyst, strategist, market-research, competitor-intelligence, opportunity-detection, scenario-planning |
| Constantine | profiler, relationship-agent, romance-agent |
| Beatrice | curator, itinerary-agent, itinerary-verification |
| Sterling | quote-specialist, followup-agent, finance-economics, partnership-agent, distribution-agent |
| Amara | brand-strategist, content-agent, storytelling-agent, campaign-agent |
| Orion | receptionist, booking-coordinator, payment-agent, supplier-agent, transfer-agent, accommodation-agent, safari-ops, activity-coordinator, guest-experience, reminder-agent, emergency-coordinator, travel-docs |
| KORA | analytics-agent, quality-control |
| *deliberately unmapped* | ai-lab — experimental, no governed action class assigned |

Assigning a layer is not the same as granting authority. An agent's effective
authority is the intersection of its capability's permissions and the action
class's required level, so most of the table above cannot reach anything
consequential.

### The registry is a governance catalogue, not a headcount

37 is the number of *catalogued roles*, not the number of running systems. Each
entry is classified against evidence in `src/lib/ai/agent-runtime.ts`, and
`agent-runtime.test.ts` fails if a role is added to the registry without a status:

| Status | Count | Meaning |
| --- | --- | --- |
| `executable` | 9 | A dedicated module is invoked on a live request path. |
| `analytical` | 22 | Implemented and tested, **read-only and recommend-only**. Invocable via `GET /api/admin/agent-briefing`; can never send, book, charge or write a decision. |
| `orchestration-label` | 6 | Named by the concierge state machine and returned by `getNextAgent()`; nothing calls a module of that name. |
| `declared` | 0 | No registry entry lacks an implementation or a status. |

So 37 catalogued roles resolve to **9 actors and 22 advisers**, plus 6 labels that are
accountability rather than software. The census reports this split as `canAct` and
`canOnlyAdvise`. Do not quote 37 as a headcount, and do not count the 22 advisers as
actors: use `agentRuntimeCensus(KIVARA_AGENTS.map(a => a.name))` instead.

`analytical` was introduced specifically to stop "implemented" being read as "can act".
The runtime test fails if an agent is upgraded to `executable` without evidence of a live
caller, so the distinction cannot quietly rot back into an overclaim.

## What is actually enforced today

Do not assume the model above is running. As of the last change:

- **KORA is the only production caller of `evaluateAutonomy`.** It is the sole
  runtime consumer of the policy engine.
- The other six capabilities exist as vocabulary with 41 tests and no production
  enforcement path.
- `recordEvent` has one caller (KORA); the fifteen canonical journey events are
  not yet emitted by the business flows that produce them.
- `recordQcDecision` and `persistClientDna` are wired at `api/ai/send-quote`
  and `api/inquiry` respectively.

So the governance substrate is built and tested, and integration is the
outstanding work. Extending the vocabulary without adding call sites adds
untested prose, not safety.

## When adding an agent

1. Give it a capability layer above, and record the reasoning in
   `agent-registry.ts`.
2. Route its actions through `evaluateAutonomy` before it acts — do not
   reimplement a permission check locally.
3. Emit its outcome with `recordEvent`, and gate anything consequential with a
   `decisions` row via `recordQcDecision`.
4. Never let it write a confidence score it did not measure. Deterministic
   checks pass `confidence_score: 0`, which means "no inference made", and must
   leave unmeasured psychographics empty rather than filling them with a
   flattering default.
