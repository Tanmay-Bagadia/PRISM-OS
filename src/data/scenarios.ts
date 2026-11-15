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

export const BENCHMARK_SCENARIOS: BenchmarkScenario[] = [
  {
    id: 'scen_health',
    title: 'Clinical Bio-Telemetry',
    domain: 'Healthcare & Clinical Bio-Telemetry',
    subtitle: 'ICU Arrhythmia Protocol & Real-time Vitals',
    category: 'health',
    iconName: 'Activity',
    defaultPrompt: 'Formulate localized clinical risk stratification, drug interactions, and arrhythmia stabilization directives',
    files: [
      {
        id: 'health_patient_admission',
        name: 'icu_admission_vance.confidential.txt',
        description: 'Primary ICU Patient Admission & Vitals Record',
        category: 'health',
        content: `=== CONFIDENTIAL MEDICAL ADMISSION & BILLING RECORD ===
Patient Name: Alexander Vance
Date of Birth: 04/12/1982 | SSN: 948-22-1049
Contact: alex.vance@blackmesa-labs.io | Phone: (555) 749-3820
Billing Account: 4111-2222-3333-4444
Annual Compensation: $240,000.00
Primary Diagnosis: Refractory Ventricular Arrhythmia (ICD-10 I47.2)
Blood Pressure: 145/95 mmHg | Resting Heart Rate: 98 bpm
Attending Physician: Dr. Gordon Freeman (NPI: 1982736450)
Estimated Treatment Cost: $68,500.00
Medical History: Type 2 Diabetes, Metformin 500mg BID
Allergies: Penicillin, Sulfa drugs
Current Infusion: Amiodarone 1mg/min continuous IV
======================================================`,
      },
      {
        id: 'health_telemetry_stream',
        name: 'cardiac_monitor_stream.log',
        description: 'Telemetry Holter 24h Arrhythmia Spike Stream',
        category: 'health',
        content: `[08:14:22] PAC event detected (Lead II, QT interval 460ms)
[08:29:10] Non-sustained Ventricular Tachycardia (Runs of 6 beats, HR 162 bpm)
[09:02:44] ST Segment Elevation: 1.8mm in V2-V4
[10:15:30] Magnesium level: 1.4 mg/dL (Critical Low - Ref: 1.7-2.2 mg/dL)
[11:45:00] Serum Potassium: 3.2 mEq/L (Hypokalemic baseline)
[12:30:15] Troponin-I: 0.12 ng/mL (Elevated border)`,
      },
    ],
  },
  {
    id: 'scen_cfo',
    title: 'Startup CFO Diligence',
    domain: 'Startup CFO Financial Diligence',
    subtitle: 'Series B M&A Due Diligence & Cash Runway Audit',
    category: 'finance',
    iconName: 'DollarSign',
    defaultPrompt: 'Audit current 18-month burn rate, compute exact cash-out date, and generate OPEX reduction blueprint',
    files: [
      {
        id: 'cfo_board_audit',
        name: 'series_b_financial_audit.confidential.txt',
        description: 'Series B Financial Position & Treasury Audit',
        category: 'finance',
        content: `=== CONFIDENTIAL APEX ROBOTICS INC. BOARD FINANCIAL AUDIT ===
Company: Apex Robotics Inc. (Delaware C-Corp)
CFO: Robert Sterling (robert@apex-robotics.co, Direct: 555-829-1049)
Current Cash in Silicon Valley Bank: $8,450,000.00
Wire Routing: 121000358 | Account: 4111-9876-5432-1098
Monthly Net Burn: $420,000.00
ARR: $3,600,000.00 (84% YoY Growth)
Key Risk: Payroll obligations of $310,000.00 due on 12/01/2026.
Debt Facility: $2,500,000.00 at 9.5% APR maturing Q3 2027
Headcount: 42 FTEs | Average Annual Fully Loaded Cost: $185,000.00
Cloud Compute OPEX (GCP + GPU Cluster): $88,000.00 / month
============================================================`,
      },
      {
        id: 'cfo_cap_table',
        name: 'confidential_cap_table_q3.csv',
        description: 'Series A/B Preferred Equity Ownership Table',
        category: 'finance',
        content: `Shareholder,Class,Shares,InvestedCapital,OwnershipPct
Founder & CEO (K. Novak),Common,3200000,$50000.00,32.0%
Founder & CTO (S. Chen),Common,2800000,$50000.00,28.0%
Horizon Ventures VII,Series A Preferred,2000000,$6000000.00,20.0%
Cascade Growth Fund,Series B Lead,1500000,$9000000.00,15.0%
Employee Pool (Unallocated),Options,500000,$0.00,5.0%`,
      },
    ],
  },
  {
    id: 'scen_legal',
    title: 'Enterprise Legal NDA',
    domain: 'Enterprise Legal & M&A NDA Redlining',
    subtitle: 'Mutual Non-Disclosure & IP Assignment Agreement',
    category: 'legal',
    iconName: 'FileText',
    defaultPrompt: 'Identify asymmetric indemnification liabilities, non-solicitation overreaches, and propose targeted redlines',
    files: [
      {
        id: 'legal_mna_nda',
        name: 'mutual_nda_bionexus.contract.txt',
        description: 'Execution Copy of Mutual Non-Disclosure Agreement',
        category: 'legal',
        content: `=== MUTUAL NON-DISCLOSURE & PROPRIETARY RIGHTS AGREEMENT ===
Disclosing Party: BioNexus Therapeutics, Inc.
Receiving Party: Quantum Horizon Technologies LLC
Signatory: Elena Rostova (elena.rostova@bionexus-tx.com)
Execution Date: 11/15/2026 | Term: 5 Years
Liquidated Damages Clause: Breach incurs immediate statutory penalty of $5,000,000.00.
Governing Law: State of Delaware Court of Chancery
Direct Contact: (555) 302-8492
Proprietary Patent: US-2026-981240-B2 (CRISPR vector delivery mechanism)
Section 7.3 (Asymmetric Non-Compete): Receiving Party agrees not to develop or commercialize any competing mRNA or CRISPR delivery vectors for a period of 48 months following disclosure.
Section 9.1 (Unilateral Injunction): Disclosing Party shall be entitled to immediate injunctive relief without the requirement of posting bond or proving monetary damages.
============================================================`,
      },
    ],
  },
  {
    id: 'scen_cyber',
    title: 'SOC Threat Forensics',
    domain: 'Cybersecurity SOC Threat Forensics',
    subtitle: 'Severity-1 Lateral Intrusion & Ransomware Containment',
    category: 'legal',
    iconName: 'ShieldAlert',
    defaultPrompt: 'Synthesize lateral attack timeline, identify exfiltration vectors, and generate SOC containment runbook',
    files: [
      {
        id: 'cyber_incident_report',
        name: 'soc_incident_sec2026_9901.log',
        description: 'SOC SIEM Incident Dump & Attack Vector Timeline',
        category: 'legal',
        content: `=== SECURITY OPERATIONS CENTER - INCIDENT #SEC-2026-9901 ===
Severity: Critical (CVSS 9.8) | Status: Active Lateral Movement
Compromised Host IP: 192.168.1.105 | Target Subnet: 10.200.4.0/24
Breached Identity: admin.root@internal-cluster.corp
Detected Timestamp: 10/24/2026
Extradited Data: Customer credit cards (4111-0000-1111-2222)
Unauthorized Wire Transfer Initiated: $1,250,000.00
Attacking C2 IP: 185.220.101.5 | Malware Hash: e3b0c44298fc1c149afbf4c8996fb924
Persistence Mechanism: Cron job scheduled at /var/spool/cron/crontabs/root
Exfiltration Protocol: DNS tunneling via staged ns1.darkrelay.net query blocks
Impacted Services: Production Postgres DB, Kafka Broker-03`,
      },
    ],
  },
  {
    id: 'scen_hr',
    title: 'HR Executive Remuneration',
    domain: 'HR Executive Compensation & Grievance',
    subtitle: 'Whistleblower Severance & Accounting Liability',
    category: 'legal',
    iconName: 'Users',
    defaultPrompt: 'Synthesize grievance timeline, evaluate statutory liability, and recommend settlement boundaries',
    files: [
      {
        id: 'hr_whistleblower_record',
        name: 'executive_grievance_memo.confidential.txt',
        description: 'Strictly Confidential Executive Remuneration Memo',
        category: 'legal',
        content: `=== CONFIDENTIAL - EXECUTIVE REMUNERATION & GRIEVANCE RECORD ===
Employee Name: Marcus Aurelius Holloway
SSN: 771-40-9281 | DOB: 09/21/1979
Base Salary: $385,000.00 | Performance Bonus: $150,000.00
Grievance Filed By: whistle.blower@secure-reporting.org
Direct Telephone: (555) 918-2041
Allegation Date: 08/14/2026
Settlement Offer Demanded: $750,000.00
Allegation: Non-compliant accounting recognized $2,100,000 in premature Q2 rev.
Stock Grants: 45,000 RSUs with accelerated single-trigger vesting on change of control.
Retaliation Claim: Threatened termination after presenting memo to Audit Committee Chair.
============================================================`,
      },
    ],
  },
];

