# PRISM-OS Workspace Rules, File Structure & Architecture Contract

## 1. Project Overview

**PRISM-OS** is an Inverted-Blueprint Cognitive Workspace built for the **#BuildHybridAI 2026** hackathon. It delivers frontier AI reasoning over private user files without raw data ever leaving the user's device:

- **Stage 1 (Local Topology Extraction):** On-device Gemini Nano 4 distills raw private files into a `< 2 KB` anonymized `AbstractTopology` (zero PII, zero raw numbers).
- **Stage 2 (Blind Cloud Blueprint Generation):** Cloud Gemini receives only the abstract topology via Structured JSON Output and returns an executable `ReasoningBlueprint`, which is cached locally via Firestore Offline Persistence.
- **Stage 3 (Grounded Local Hydration):** On-device Gemini Nano 4 executes the cloud blueprint against the raw local files to generate the final personalized Markdown report.

## 2. Mandatory Agent Skills Activation

- **Both Teammates:** Always activate **Superpowers** (`writing-plans`, `executing-plans`, `test-driven-development`, `systematic-debugging`, `verification-before-completion`) and **Ponytail** (strict task scoping, clean modular boundaries, zero cross-folder contamination).
- **Teammate B (Frontend Only):** Always activate **UI/UX Pro Max** (design system tokens, spatial hierarchy, WCAG contrast) and **Impeccable** (design critique, typography/tabular-nums polish, micro-interactions, and eliminating generic AI-generated UI tropes).

## 3. Tech Stack & Firebase AI Logic SDK Rules

- **Stack:** React 19 + TypeScript (Strict) + Vite + Tailwind CSS + Lucide Icons + `firebase` v13+.
- **Firebase AI Logic (Mandatory):**
  - All generative calls must go through `firebase/ai` (`getAI` with `GoogleAIBackend` and `getGenerativeModel`). Never make direct REST calls to `generativelanguage.googleapis.com`.
  - Use `InferenceMode.ONLY_ON_DEVICE` for raw local file stages (with a deterministic local PII scrubber fallback if the browser lacks Gemini Nano 4).
  - Use `InferenceMode.PREFER_IN_CLOUD` (configured with `inCloudParams: { model: "gemini-3.5-flash-lite" }`) and Structured JSON `responseSchema` for Stage 2 Cloud Blueprint generation.
  - Capture and return `result.response.inferenceSource` (`"ON_DEVICE"` or `"IN_CLOUD"`) on every stage call.

## 4. Strict 2-Person Repository File Structure & Ownership

Never create, edit, or delete files assigned to the other teammate.

prism-os/
├── .antigravity/
│ └── rules.md # [SHARED] Workspace rules & architecture contract
├── firestore.rules # [TEAMMATE A] Firestore security rules
├── src/
│ ├── types/
│ │ └── prism.ts # [TEAMMATE A] Shared TypeScript contracts (Integration Boundary)
│ ├── lib/
│ │ ├── firebase/
│ │ │ └── client.ts # [TEAMMATE A] Firebase App, AI Logic, App Check, Auth, Firestore, Remote Config
│ │ └── prism/
│ │ ├── nanoStatus.ts # [TEAMMATE A] Chrome Gemini Nano 4 availability & download progress monitor
│ │ ├── scrubber.ts # [TEAMMATE A] Deterministic fallback PII scrubber for unsupported browsers
│ │ ├── router.ts # [TEAMMATE A] User- & Network-Aware Adaptive Utility Router
│ │ └── engine.ts # [TEAMMATE A] Main 3-stage PRISM pipeline entry point
│ ├── components/
│ │ ├── TelemetryBar.tsx # [TEAMMATE B] Top header: Nano status, RTT/Battery, inferenceSource pills
│ │ ├── ScenarioSelector.tsx # [TEAMMATE B] 1-click judge scenario switcher & Offline Simulator toggle
│ │ ├── RelayWorkspace.tsx # [TEAMMATE B] 3-Lane main workspace grid
│ │ ├── lanes/
│ │ │ ├── LocalVaultLane.tsx # [TEAMMATE B] Lane 1: Private file drop/editor, Posture Dial, Prompt input
│ │ │ ├── WireXRayLane.tsx # [TEAMMATE B] Lane 2: Abstract Topology JSON + Cloud Blueprint inspector
│ │ │ └── HydratedOutputLane.tsx # [TEAMMATE B] Lane 3: Final Markdown brief + Offline follow-up input
│ │ └── MobileBlueprintDrawer.tsx # [TEAMMATE B] Responsive companion view showing synced Firestore blueprints
│ ├── data/
│ │ └── scenarios.ts # [TEAMMATE B] Pre-loaded judge scenarios (Health, Startup CFO, NDA Redliner)
│ ├── App.tsx # [TEAMMATE B] Root UI shell & state wiring
│ ├── index.css # [TEAMMATE B] Tailwind config & custom dark-mode design tokens
│ └── main.tsx # [SHARED] Vite entry point
└── tests/
└── prism-engine.test.ts # [TEAMMATE A] Vitest unit tests for pipeline, privacy & offline cache

## 5. Integration & Verification Contract

- **Integration Boundary:** Teammate B imports types exclusively from `src/types/prism.ts` and functions exclusively from `src/lib/prism/engine.ts` and `src/lib/prism/nanoStatus.ts`.
- **Pre-Completion Check:** Always run `npm run typecheck` and `npm run build` (plus `npm test` for Teammate A) and fix all errors before finishing any task.
