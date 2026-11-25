# AGENTS.md — PRISM-OS Multi-Agent Engineering & Privacy Constitution

## 1. Think Before Coding
- State assumptions explicitly before implementing; never guess silently.
- Surface simpler approaches and push back against speculative abstractions.
- Stop and clarify if a requirement conflicts with existing architecture.

## 2. Simplicity First
- Write the minimum code that solves the exact task—no unrequested configurability, wrapper factories, or dead-code cleanup outside owned files.
- Match existing TypeScript, Tailwind, and React conventions in the repo.

## 3. Surgical Changes & Strict File-Ownership Lanes
- **Protected Files (NEVER modify unless explicitly assigned):** `firestore.rules`, `src/lib/firebase/client.ts`, `src/types/prism.ts`, and existing tests in `tests/**`.
- **Zero Cross-Lane Edits:** Parallel worker agents must ONLY create or edit files inside their assigned lane. Never touch another worker's files or `src/App.tsx` during parallel execution.
- Remove any imports or variables made unused by your own changes.

## 4. PRISM-OS Zero-Trust Privacy Invariants (Non-Negotiable)
- **0 Bytes Raw PII Egress:** Personal names, organizations, SSNs, tax IDs, NPIs, card/account numbers, emails, phone numbers, and raw financial/clinical records MUST stay strictly on-device (`IndexedDB` / local memory).
- **Cloud Boundary:** Only anonymized topologies (`prism-topology-v1`, `prism-diff-v1` using abstract IDs like `Organization_A`, `Metric_1`, and percentage deltas) may cross into Stage 2 (`IN_CLOUD`).
- **Offline Resilience:** Every browser storage or AI call must degrade gracefully in offline or Node/Vitest environments.

## 5. Goal-Driven Execution Loop
Every agent must execute and verify its lane before reporting completion:
1. Implement minimal, typed code -> verify: `npm run typecheck` passes.
2. Add/run targeted unit tests -> verify: `npm test` passes with zero regressions.
3. Confirm production bundle -> verify: `npm run build` exits `0`.

