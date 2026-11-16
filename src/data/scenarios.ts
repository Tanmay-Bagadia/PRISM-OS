import type { ScenarioFile } from '../types/prism';

export interface BenchmarkScenario {
  id: string;
  title: string;
  domain: string;
  subtitle: string;
  category: 'health' | 'finance' | 'legal';
  iconName: 'Activity' | 'DollarSign' | 'FileText' | 'ShieldAlert' | 'Users';
  defaultPrompt: string;
  files: ScenarioFile[];
}

/**
 * Clean workspace boots with ZERO pre-loaded files or fake data.
 * All files, documents, and prompts are 100% user-supplied.
 */
export const BENCHMARK_SCENARIOS: BenchmarkScenario[] = [];

export interface StarterPromptSuggestion {
  id: string;
  label: string;
  prompt: string;
  category: 'health' | 'finance' | 'legal' | 'security';
}

/**
 * Optional prompt inspiration chips for the user (zero files or records attached).
 */
export const STARTER_PROMPT_SUGGESTIONS: StarterPromptSuggestion[] = [
  {
    id: 'suggest_cfo',
    label: 'Financial Diligence & Runway',
    prompt: 'Audit current 18-month burn rate, compute exact cash-out date, and generate OPEX reduction blueprint',
    category: 'finance',
  },
  {
    id: 'suggest_health',
    label: 'Lab Biomarkers & Medications',
    prompt: 'Analyze metabolic biomarkers, flag abnormal metrics, and evaluate potential supplement interactions',
    category: 'health',
  },
  {
    id: 'suggest_legal',
    label: 'Contract Liability & NDA',
    prompt: 'Analyze liability clauses, flag indemnification risks, and highlight non-standard obligations',
    category: 'legal',
  },
  {
    id: 'suggest_security',
    label: 'Forensic Access & Breach Audit',
    prompt: 'Identify anomalous IP subnets, trace privilege escalations, and extract breach timeline',
    category: 'security',
  },
];
