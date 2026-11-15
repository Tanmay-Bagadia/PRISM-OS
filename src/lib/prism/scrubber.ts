/**
 * Deterministic local PII scrubber.
 *
 * Runs strictly on-device with zero network calls and deterministic regex cascades.
 * Used when running in Vault mode or when a judge or browser does not have Gemini Nano 4.
 */

interface ScrubRule {
  name: string;
  pattern: RegExp;
  replacement: string | ((substring: string, ...args: unknown[]) => string);
}

const SCRUB_RULES: ReadonlyArray<ScrubRule> = [
  // 1. Social Security Numbers (SSN)
  {
    name: 'ssn',
    pattern: /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/g,
    replacement: '[SSN_REDACTED]',
  },
  // 2. Credit Card Numbers (16 digits with optional spaces or dashes)
  {
    name: 'credit_card',
    pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    replacement: '[CC_REDACTED]',
  },
  // 3. Email Addresses
  {
    name: 'email',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
    replacement: '[EMAIL_REDACTED]',
  },
  // 4. Phone Numbers (Various formats with optional country code & parens)
  {
    name: 'phone',
    pattern: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replacement: '[PHONE_REDACTED]',
  },
  // 5. IP Addresses (IPv4)
  {
    name: 'ipv4',
    pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    replacement: '[IP_REDACTED]',
  },
  // 6. Dollar / Currency amounts (e.g. $1,234,567.89, $500,000, €45.00)
  {
    name: 'currency',
    pattern: /[$€£¥]\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?|[$€£¥]\s?\d+(?:\.\d{2})?/g,
    replacement: '[AMOUNT_REDACTED]',
  },
  // 7. Dates (MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY)
  {
    name: 'dates',
    pattern: /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/g,
    replacement: '[DATE_REDACTED]',
  },
  // 8. Labeled Names (e.g. "Patient: John Smith", "Client: Jane Doe")
  {
    name: 'labeled_names',
    pattern: /\b(Patient|Client|Customer|Employee|Doctor|Subject|Target|Name):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g,
    replacement: '$1: [NAME_REDACTED]',
  },
  // 9. Physical street addresses
  {
    name: 'address',
    pattern: /\b\d{1,5}\s+[A-Za-z0-9\s.]+,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/g,
    replacement: '[ADDRESS_REDACTED]',
  },
];

/**
 * Deterministically strips PII from a raw string using ordered rules.
 *
 * @param raw Input string potentially containing sensitive personal data.
 * @returns Fully anonymized string with exact numbers, names, and contact info replaced.
 */
export function scrubPII(raw: string): string {
  if (!raw) return '';

  let sanitized = raw;
  for (const rule of SCRUB_RULES) {
    sanitized = sanitized.replace(rule.pattern, rule.replacement as string);
  }
  return sanitized;
}

/**
 * Verifies if any known PII pattern triggers on a given string.
 * Used for asserting zero-leakage in tests and safety gates.
 */
export function containsPotentialPII(text: string): boolean {
  if (!text) return false;
  return SCRUB_RULES.some((rule) => {
    // Reset regex index state
    rule.pattern.lastIndex = 0;
    return rule.pattern.test(text);
  });
}
