import { describe, test, expect } from 'vitest';
import {
  buildRedactedDocument,
  generateLocalActionLetter,
  type MaskConfig,
} from '../src/lib/prism/redactor';
import type { AbstractTopology } from '../src/types/prism';

const SAMPLE_RECORD = `
Patient: Sarah Jenkins
Company: Kestrel Robotics Pvt. Ltd.
SSN: 123-45-6789
Billing Account: 4111-2222-3333-4444
Email: sarah.jenkins@kestrel-robotics.io
Phone: (555) 867-5309
Address: 742 Evergreen Terrace, Springfield, IL 62704
Invoice Total: $14,250.00
Follow-up note for Sarah Jenkins regarding Kestrel Robotics Pvt. Ltd. billing.
`.trim();

const ALL_ON: MaskConfig = {
  maskNames: true,
  maskIds: true,
  maskContact: true,
  maskFinancial: true,
};

const ALL_OFF: MaskConfig = {
  maskNames: false,
  maskIds: false,
  maskContact: false,
  maskFinancial: false,
};

describe('Safe-to-Share Redactor Engine', () => {
  test('masks names, organizations, SSNs, cards, emails, phones, addresses, and amounts when all toggles are ON', () => {
    const res = buildRedactedDocument(SAMPLE_RECORD, null, ALL_ON);

    expect(res.redactedText).not.toContain('Sarah Jenkins');
    expect(res.redactedText).not.toContain('Kestrel Robotics Pvt. Ltd.');
    expect(res.redactedText).not.toContain('123-45-6789');
    expect(res.redactedText).not.toContain('4111-2222-3333-4444');
    expect(res.redactedText).not.toContain('sarah.jenkins@kestrel-robotics.io');
    expect(res.redactedText).not.toContain('(555) 867-5309');
    expect(res.redactedText).not.toContain('742 Evergreen Terrace');
    expect(res.redactedText).not.toContain('$14,250.00');

    expect(res.redactedText).toContain('[PERSON_A]');
    expect(res.redactedText).toContain('[ORGANIZATION_A]');
    expect(res.redactedText).toContain('[REDACTED_ID]');
    expect(res.redactedText).toContain('[REDACTED_ACCOUNT]');
    expect(res.redactedText).toContain('[REDACTED_EMAIL]');
    expect(res.redactedText).toContain('[REDACTED_PHONE]');
    expect(res.redactedText).toContain('[REDACTED_ADDRESS]');
    expect(res.redactedText).toContain('[REDACTED_AMOUNT]');

    expect(res.counts.names).toBeGreaterThanOrEqual(2);
    expect(res.counts.ids).toBeGreaterThanOrEqual(2);
    expect(res.counts.contact).toBeGreaterThanOrEqual(3);
    expect(res.counts.financial).toBe(1);
    expect(res.counts.total).toBe(
      res.counts.names + res.counts.ids + res.counts.contact + res.counts.financial
    );
  });

  test('reveals all raw values when all toggles are OFF', () => {
    const res = buildRedactedDocument(SAMPLE_RECORD, null, ALL_OFF);

    expect(res.redactedText).toBe(SAMPLE_RECORD);
    expect(res.counts.total).toBe(0);
    expect(res.placeholders).toEqual([]);
  });

  test('respects granular per-category toggles independently', () => {
    // Only Names ON
    const namesOnly = buildRedactedDocument(SAMPLE_RECORD, null, {
      ...ALL_OFF,
      maskNames: true,
    });
    expect(namesOnly.redactedText).not.toContain('Sarah Jenkins');
    expect(namesOnly.redactedText).not.toContain('Kestrel Robotics Pvt. Ltd.');
    expect(namesOnly.redactedText).toContain('123-45-6789');
    expect(namesOnly.redactedText).toContain('$14,250.00');
    expect(namesOnly.counts.ids).toBe(0);
    expect(namesOnly.counts.financial).toBe(0);

    // Only IDs & Financial ON
    const idsAndMoney = buildRedactedDocument(SAMPLE_RECORD, null, {
      ...ALL_OFF,
      maskIds: true,
      maskFinancial: true,
    });
    expect(idsAndMoney.redactedText).toContain('Sarah Jenkins');
    expect(idsAndMoney.redactedText).toContain('sarah.jenkins@kestrel-robotics.io');
    expect(idsAndMoney.redactedText).not.toContain('123-45-6789');
    expect(idsAndMoney.redactedText).not.toContain('4111-2222-3333-4444');
    expect(idsAndMoney.redactedText).not.toContain('$14,250.00');
  });

  test('uses AbstractTopology entity hints to mask unlabelled entity mentions', () => {
    const topology: AbstractTopology = {
      schema: 'prism-topology-v1',
      entities: [{ id: 'e1', type: 'person', label: 'Marcus Vance' }],
      relationships: [],
      constraints: ['Verify clinical billing discrepancy'],
    };
    const raw = 'Unlabelled mention of Marcus Vance in clinical summary.';
    const res = buildRedactedDocument(raw, topology, ALL_ON);

    expect(res.redactedText).not.toContain('Marcus Vance');
    expect(res.redactedText).toContain('[PERSON_A]');
  });

  test('generateLocalActionLetter synthesizes an on-device letter with zero raw PII', async () => {
    const redacted = buildRedactedDocument(SAMPLE_RECORD, null, ALL_ON);
    const { letter, source } = await generateLocalActionLetter({
      letterType: 'insurance_appeal',
      redactedDocument: redacted.redactedText,
      hydratedReport: '## Findings\n- Billing discrepancy for Sarah Jenkins of $14,250.00.',
      topology: null,
      rawContent: SAMPLE_RECORD,
    });

    expect(source).toBe('LOCAL_SYNTHESIS');
    expect(letter).toContain('[PERSON_A]');
    expect(letter).toContain('[ORGANIZATION_A]');
    expect(letter).not.toContain('Sarah Jenkins');
    expect(letter).not.toContain('123-45-6789');
    expect(letter).not.toContain('$14,250.00');
    expect(letter).not.toContain('sarah.jenkins@kestrel-robotics.io');
  });
});

