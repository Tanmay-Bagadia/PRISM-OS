import type { AbstractTopology } from '../../types/prism';

export interface MaskConfig {
  maskNames: boolean;
  maskIds: boolean;
  maskContact: boolean;
  maskFinancial: boolean;
}

export interface RedactionCounts {
  names: number;
  ids: number;
  contact: number;
  financial: number;
  total: number;
}

export interface RedactedResult {
  redactedText: string;
  counts: RedactionCounts;
  placeholders: string[];
}

export type ActionLetterType =
  | 'insurance_appeal'
  | 'contract_redline'
  | 'income_verification'
  | 'executive_cover';

export interface ActionLetterOption {
  id: ActionLetterType;
  label: string;
  directive: string;
  subjectPrefix: string;
}

export const ACTION_LETTER_OPTIONS: ReadonlyArray<ActionLetterOption> = [
  {
    id: 'insurance_appeal',
    label: 'Insurance / Billing Appeal',
    directive:
      'Draft a polite, firm medical insurance or billing appeal letter requesting coverage review and itemized adjustment.',
    subjectPrefix: 'Formal Coverage & Billing Appeal',
  },
  {
    id: 'contract_redline',
    label: 'Contract Redline Request',
    directive:
      'Draft a professional legal/commercial cover note requesting targeted mutual redlines on asymmetric liability and IP clauses.',
    subjectPrefix: 'Proposed Mutual Redlines & Clause Revisions',
  },
  {
    id: 'income_verification',
    label: 'Landlord / Income Verification',
    directive:
      'Draft a concise, formal verification letter summarizing financial standing and obligations without exposing raw account numbers.',
    subjectPrefix: 'Confidential Financial & Tenancy Verification',
  },
  {
    id: 'executive_cover',
    label: 'Executive Summary Cover Note',
    directive:
      'Draft a crisp executive cover note summarizing key findings, risks, and next steps for stakeholder review.',
    subjectPrefix: 'Executive Summary & Action Brief',
  },
];

const ORG_LABEL_RE =
  /\b(Company|Organization|Org|Disclosing Party|Receiving Party|Employer|Provider|Hospital|Clinic|Vendor|Institution)[ \t]*:[ \t]*([A-Z][A-Za-z0-9&.,'’-]+(?:[ \t]+[A-Z0-9][A-Za-z0-9&.,'’-]*){0,5})/g;

const PERSON_LABEL_RE =
  /\b(Patient(?:[ \t]+Name)?|Client|Customer|Employee(?:[ \t]+Name)?|Doctor|Physician|Attending(?:[ \t]+Physician)?|Signatory|Subject|Target|CFO|CEO|CTO|Name|Filed[ \t]+By|Inventor)[ \t]*:[ \t]*([A-Z][a-zA-Z.'-]+(?:[ \t]+[A-Z][a-zA-Z.'-]+){1,3})/g;

const ORG_SUFFIX_RE =
  /\b[A-Z][A-Za-z0-9&.'-]*(?:[ \t]+[A-Z][A-Za-z0-9&.'-]*){0,4}[ \t]+(?:Pvt\.?[ \t]*Ltd\.?|Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|LLP|LP|Therapeutics|Technologies|Robotics|Hospital|Clinic|Labs)\b/g;

const TITLE_PERSON_RE =
  /\b(?:Dr|Mr|Mrs|Ms|Prof)\.[ \t]+[A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+){1,2}\b/g;

const CONTACT_RULES: ReadonlyArray<{ pattern: RegExp; placeholder: string }> = [
  {
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
    placeholder: '[REDACTED_EMAIL]',
  },
  {
    pattern: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    placeholder: '[REDACTED_PHONE]',
  },
  {
    pattern:
      /\b\d{1,5}\s+[A-Za-z0-9\s.]+,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/g,
    placeholder: '[REDACTED_ADDRESS]',
  },
];

const ID_RULES: ReadonlyArray<{ pattern: RegExp; placeholder: string }> = [
  {
    pattern: /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/g,
    placeholder: '[REDACTED_ID]',
  },
  {
    pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    placeholder: '[REDACTED_ACCOUNT]',
  },
  {
    pattern:
      /\b(?:SSN|Tax\s*ID|EIN|TIN|NPI|MRN|Routing(?:\s*No\.?)?|Account(?:\s*No\.?|\s*#)?|Billing\s*Account|Policy(?:\s*No\.?|\s*#)?|Member\s*ID|Passport)\s*[:#]\s*[A-Z0-9-]{4,24}\b/gi,
    placeholder: '[REDACTED_ID]',
  },
  {
    pattern:
      /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    placeholder: '[REDACTED_ID]',
  },
];

const FINANCIAL_RULES: ReadonlyArray<{ pattern: RegExp; placeholder: string }> = [
  {
    pattern: /[+-]?[$€£¥]\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?|[+-]?[$€£¥]\s?\d+(?:\.\d{2})?/g,
    placeholder: '[REDACTED_AMOUNT]',
  },
  {
    pattern:
      /\b((?:Salary|Bonus|Revenue|ARR|Burn|Balance|Total|Amount|Penalty|Settlement|Cost|Capital|Debt)\s*[:=]\s*)(?:[\d,]+(?:\.\d{2})?)\b/gi,
    placeholder: '$1[REDACTED_AMOUNT]',
  },
];

function indexToTag(index: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (index < letters.length) return letters[index]!;
  return `${letters[index % letters.length]}${Math.floor(index / letters.length)}`;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyRuleSet(
  input: string,
  rules: ReadonlyArray<{ pattern: RegExp; placeholder: string }>
): { text: string; count: number } {
  let text = input;
  let count = 0;

  for (const rule of rules) {
    const re = new RegExp(rule.pattern.source, rule.pattern.flags);
    text = text.replace(re, (...args) => {
      count += 1;
      // Preserve capture group $1 when present (e.g. labeled financial keys)
      if (rule.placeholder.includes('$1') && typeof args[1] === 'string') {
        return rule.placeholder.replace('$1', args[1]);
      }
      return rule.placeholder;
    });
  }

  return { text, count };
}

/**
 * Deterministically + topology-assisted local PII redactor.
 * Executes 100% in browser memory with zero network calls.
 */
export function buildRedactedDocument(
  rawContent: string,
  abstractTopology: AbstractTopology | null,
  maskConfig: MaskConfig
): RedactedResult {
  if (!rawContent) {
    return {
      redactedText: '',
      counts: { names: 0, ids: 0, contact: 0, financial: 0, total: 0 },
      placeholders: [],
    };
  }

  let text = rawContent;
  const counts: RedactionCounts = {
    names: 0,
    ids: 0,
    contact: 0,
    financial: 0,
    total: 0,
  };
  const usedPlaceholders = new Set<string>();

  // 1. Contact Info (emails, phones, street addresses)
  if (maskConfig.maskContact) {
    const res = applyRuleSet(text, CONTACT_RULES);
    text = res.text;
    counts.contact += res.count;
    if (text.includes('[REDACTED_EMAIL]')) usedPlaceholders.add('[REDACTED_EMAIL]');
    if (text.includes('[REDACTED_PHONE]')) usedPlaceholders.add('[REDACTED_PHONE]');
    if (text.includes('[REDACTED_ADDRESS]')) usedPlaceholders.add('[REDACTED_ADDRESS]');
  }

  // 2. Government IDs & Accounts (SSNs, cards, NPIs, IPs)
  if (maskConfig.maskIds) {
    const res = applyRuleSet(text, ID_RULES);
    text = res.text;
    counts.ids += res.count;
    if (text.includes('[REDACTED_ID]')) usedPlaceholders.add('[REDACTED_ID]');
    if (text.includes('[REDACTED_ACCOUNT]')) usedPlaceholders.add('[REDACTED_ACCOUNT]');
  }

  // 3. Financial Figures
  if (maskConfig.maskFinancial) {
    const res = applyRuleSet(text, FINANCIAL_RULES);
    text = res.text;
    counts.financial += res.count;
    if (text.includes('[REDACTED_AMOUNT]')) usedPlaceholders.add('[REDACTED_AMOUNT]');
  }

  // 4. Names & Organizations (consistent [PERSON_A] / [ORGANIZATION_A] mapping)
  if (maskConfig.maskNames) {
    const personMap = new Map<string, string>();
    const orgMap = new Map<string, string>();

    const getPersonTag = (name: string) => {
      const clean = name.trim();
      if (!personMap.has(clean)) {
        const tag = `[PERSON_${indexToTag(personMap.size)}]`;
        personMap.set(clean, tag);
        usedPlaceholders.add(tag);
      }
      return personMap.get(clean)!;
    };

    const getOrgTag = (org: string) => {
      const clean = org.trim();
      if (!orgMap.has(clean)) {
        const tag = `[ORGANIZATION_${indexToTag(orgMap.size)}]`;
        orgMap.set(clean, tag);
        usedPlaceholders.add(tag);
      }
      return orgMap.get(clean)!;
    };

    // 4a. Collect known entities from Stage 1 topology if unredacted
    if (abstractTopology?.entities) {
      for (const ent of abstractTopology.entities) {
        const typeLower = ent.type.toLowerCase();
        const label = ent.label?.trim();
        if (!label || label.includes('[') || label.length < 3) continue;
        if (typeLower.includes('person') || typeLower.includes('patient') || typeLower.includes('doctor')) {
          getPersonTag(label);
        } else if (typeLower.includes('org') || typeLower.includes('company')) {
          getOrgTag(label);
        }
      }
    }

    // 4b. Labeled organizations
    text = text.replace(new RegExp(ORG_LABEL_RE.source, 'g'), (_m, label: string, value: string) => {
      const cleanVal = value.trim();
      if (cleanVal.startsWith('[')) return `${label}: ${cleanVal}`;
      counts.names += 1;
      return `${label}: ${getOrgTag(cleanVal)}`;
    });

    // 4c. Organization suffixes
    text = text.replace(new RegExp(ORG_SUFFIX_RE.source, 'g'), (match: string) => {
      if (match.startsWith('[')) return match;
      counts.names += 1;
      return getOrgTag(match);
    });

    // 4d. Labeled person names
    text = text.replace(new RegExp(PERSON_LABEL_RE.source, 'g'), (_m, label: string, value: string) => {
      const cleanVal = value.trim();
      if (cleanVal.startsWith('[')) return `${label}: ${cleanVal}`;
      counts.names += 1;
      return `${label}: ${getPersonTag(cleanVal)}`;
    });

    // 4e. Title-prefixed person names (Dr. / Mr. / Ms.)
    text = text.replace(new RegExp(TITLE_PERSON_RE.source, 'g'), (match: string) => {
      if (match.startsWith('[')) return match;
      counts.names += 1;
      return getPersonTag(match);
    });

    // 4f. Second pass: replace any remaining occurrences of discovered names/orgs
    for (const [rawOrg, tag] of orgMap.entries()) {
      const re = new RegExp(`\\b${escapeRegExp(rawOrg)}\\b`, 'g');
      text = text.replace(re, () => {
        counts.names += 1;
        return tag;
      });
    }
    for (const [rawPerson, tag] of personMap.entries()) {
      const re = new RegExp(`\\b${escapeRegExp(rawPerson)}\\b`, 'g');
      text = text.replace(re, () => {
        counts.names += 1;
        return tag;
      });
    }
  }

  counts.total = counts.names + counts.ids + counts.contact + counts.financial;

  return {
    redactedText: text,
    counts,
    placeholders: Array.from(usedPlaceholders),
  };
}

interface ChromeLanguageModelSession {
  prompt: (input: string) => Promise<string>;
  destroy?: () => void;
}

interface ChromeLanguageModelAPI {
  availability?: () => Promise<string>;
  create?: (opts?: { systemPrompt?: string }) => Promise<ChromeLanguageModelSession>;
}

/**
 * Generates a ready-to-send action/dispute letter 100% locally on-device.
 * Uses Chrome Gemini Nano (LanguageModel) when available, with a deterministic
 * on-device synthesis fallback. Never transmits raw PII or network requests.
 */
export async function generateLocalActionLetter(params: {
  letterType: ActionLetterType;
  redactedDocument: string;
  hydratedReport: string;
  topology: AbstractTopology | null;
  rawContent?: string;
}): Promise<{ letter: string; source: 'NANO_ON_DEVICE' | 'LOCAL_SYNTHESIS' }> {
  const { letterType, redactedDocument, hydratedReport, topology, rawContent } = params;
  const option =
    ACTION_LETTER_OPTIONS.find((o) => o.id === letterType) || ACTION_LETTER_OPTIONS[0]!;

  // Scrub hydratedReport together with rawContent (if provided) so all discovered names/orgs map consistently
  const combinedSource = rawContent
    ? `${rawContent}\n=== REPORT_BOUNDARY ===\n${hydratedReport || ''}`
    : hydratedReport || '';
  const combinedMasked = buildRedactedDocument(
    combinedSource,
    topology,
    { maskNames: true, maskIds: true, maskContact: true, maskFinancial: true }
  ).redactedText;
  const safeFindings = rawContent
    ? (combinedMasked.split('=== REPORT_BOUNDARY ===')[1] || '')
    : combinedMasked;

  const redactedExcerpt = redactedDocument.slice(0, 1400);
  const findingsExcerpt = safeFindings
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('```'))
    .slice(0, 14)
    .join('\n');

  // 1. Attempt on-device Chrome Gemini Nano (LanguageModel)
  if (typeof window !== 'undefined') {
    const win = window as unknown as {
      LanguageModel?: ChromeLanguageModelAPI;
      ai?: { languageModel?: ChromeLanguageModelAPI };
    };
    const lm = win.LanguageModel || win.ai?.languageModel;

    if (lm?.create) {
      try {
        const status = lm.availability ? await lm.availability() : 'available';
        if (status === 'available' || status === 'readily') {
          const session = await lm.create({
            systemPrompt:
              'You are a privacy-preserving local assistant. Draft formal, polite, and firm letters using ONLY the masked placeholders (such as [PERSON_A], [ORGANIZATION_A], [REDACTED_ACCOUNT], [REDACTED_AMOUNT]) provided. Never invent or output raw PII.',
          });
          const nanoPrompt = `${option.directive}
Subject Focus: ${option.subjectPrefix}

Redacted Reference Context:
${redactedExcerpt}

Sanitized Findings:
${findingsExcerpt}

Output a clean, ready-to-send letter in Markdown.`;

          const output = await session.prompt(nanoPrompt);
          session.destroy?.();
          if (output && output.trim().length > 40) {
            return { letter: output.trim(), source: 'NANO_ON_DEVICE' };
          }
        }
      } catch {
        // Fall through to deterministic local synthesis
      }
    }
  }

  // 2. Deterministic On-Device Fallback Synthesis (0 bytes cloud)
  const placeholdersFound = Array.from(
    new Set(redactedDocument.match(/\[(?:PERSON_[A-Z0-9]+|ORGANIZATION_[A-Z0-9]+|REDACTED_[A-Z]+)\]/g) || [])
  );
  const senderRef = placeholdersFound.find((p) => p.startsWith('[PERSON_')) || '[PERSON_A]';
  const recipientRef =
    placeholdersFound.find((p) => p.startsWith('[ORGANIZATION_')) || '[ORGANIZATION_A]';
  const accountRef =
    placeholdersFound.find((p) => p === '[REDACTED_ACCOUNT]' || p === '[REDACTED_ID]') ||
    '[REDACTED_ACCOUNT]';

  const keyPoints =
    topology?.constraints?.slice(0, 3).map((c) => `- ${c}`) ||
    findingsExcerpt
      .split('\n')
      .filter((l) => l.trim().startsWith('-') || l.trim().startsWith('#'))
      .slice(0, 4)
      .map((l) => (l.startsWith('-') ? l : `- ${l.replace(/^#+\s*/, '')}`));

  const bulletSection =
    keyPoints.length > 0
      ? keyPoints.join('\n')
      : '- Review of documented obligations, timelines, and discrepancy flags referenced in the attached redacted record.';

  const letter = `**Subject:** ${option.subjectPrefix} — Reference ${accountRef}

Dear ${recipientRef} Review Team,

I am writing on behalf of ${senderRef} regarding the record associated with ${accountRef}. Following an independent on-device review of the relevant documentation, we respectfully request a formal review and written response addressing the following items:

${bulletSection}

All sensitive personal identifiers, account numbers, and financial figures have been masked in the enclosed supporting extract (${placeholdersFound.length > 0 ? placeholdersFound.join(', ') : 'masked placeholders'}) to preserve privacy during initial triage. Unredacted verification records can be provided through a verified secure channel upon confirmation.

Please confirm receipt of this notice and provide a substantive update within ten (10) business days.

Sincerely,

${senderRef}  
Contact: [REDACTED_EMAIL] | [REDACTED_PHONE]`;

  return { letter, source: 'LOCAL_SYNTHESIS' };
}

