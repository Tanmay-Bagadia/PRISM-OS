export type TutorialStepId =
  | 'WORKSPACE_INPUT'
  | 'EXECUTION_MODES'
  | 'GROUNDED_BENCHMARKS'
  | 'PRIVACY_PROOF'
  | 'HISTORY_AND_EXPORT';

export interface TutorialStep {
  id: TutorialStepId;
  stepNumber: number;
  title: string;
  subtitle: string;
  privacyGuarantee: string;
  targetAnchorId: string;
  actionHint: string;
}
