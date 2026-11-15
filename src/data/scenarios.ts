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
    title: 'Health Detective',
    domain: 'Healthcare & Clinical Bio-Telemetry',
    subtitle: 'Blood Panel & Wearable 90-Day Bio-Telemetry',
    category: 'health',
    iconName: 'Activity',
    defaultPrompt: 'Formulate localized clinical risk stratification, drug interactions, and arrhythmia stabilization directives',
    files: [
      {
        id: 'health_patient_admission',
        name: 'blood_metabolic_panel.confidential.txt',
        description: 'Comprehensive Blood Panel, Lipids & Critical Biomarkers',
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
Fasting Glucose: 142 mg/dL | HbA1c: 7.8% (Type 2 Diabetic dysregulation)
Serum Potassium: 3.2 mEq/L (Hypokalemic baseline - Ref: 3.5-5.0)
Serum Magnesium: 1.4 mg/dL (Critical Low - Ref: 1.7-2.2)
Troponin-I: 0.12 ng/mL (Myocardial injury threshold border)
Total Cholesterol: 248 mg/dL | LDL: 164 mg/dL | HDL: 38 mg/dL
======================================================`,
      },
      {
        id: 'health_wearable_hrv',
        name: 'wearable_hrv_90d.csv',
        description: '90-Day Continuous Wearable Heart Rate Variability CSV',
        category: 'health',
        content: `Timestamp,RestingHR_Bpm,SDNN_HRV_ms,ArrhythmiaSpikes,DeepSleep_Min,RecoveryScore
2026-09-01,72,58,0,84,88
2026-09-15,74,52,1,76,79
2026-10-01,81,41,3,58,62
2026-10-15,88,34,8,42,48
2026-11-01,94,26,14,35,31
2026-11-14,98,21,22,28,19`,
      },
      {
        id: 'health_med_log',
        name: 'active_medications.txt',
        description: 'Active Inpatient & Outpatient Medication Log',
        category: 'health',
        content: `=== INPATIENT PHARMACY ACTIVE RECONCILIATION LOG ===
Patient: Alexander Vance (MRN: 89104-B)
1. Amiodarone Hydrochloride IV Infusion (1.0 mg/min for acute ventricular stabilization)
2. Metformin HCl (500mg Oral BID with meals)
3. Lisinopril (20mg Oral Daily for essential hypertension)
4. Atorvastatin Calcium (40mg Oral QHS)
WARNING NOTE: Potential QT prolongation risk compounding hypokalemia and low serum magnesium.`,
      },
    ],
  },
  {
    id: 'scen_cfo',
    title: 'Startup CFO Runway',
    domain: 'Startup CFO Financial Diligence',
    subtitle: 'Series B M&A Due Diligence & Cash Runway Audit',
    category: 'finance',
    iconName: 'DollarSign',
    defaultPrompt: 'Audit current 18-month burn rate, compute exact cash-out date, and generate OPEX reduction blueprint',
    files: [
      {
        id: 'cfo_board_audit',
        name: 'cfo_board_financial_memo.txt',
        description: 'Series B Financial Position & Confidential Board Memo',
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
        id: 'cfo_bank_ledger',
        name: 'svb_operating_ledger_2026.csv',
        description: 'Silicon Valley Bank 90-Day Operating Cash Flow Ledger',
        category: 'finance',
        content: `Date,Reference,Counterparty,Type,Amount,RunningBalance
2026-08-01,WIRE-8910,Cascade Growth Fund,Capital Call,+$5000000.00,$9840000.00
2026-08-31,ACH-4412,Gusto Payroll System,Payroll Expense,-$312500.00,$9527500.00
2026-09-15,WIRE-9921,Google Cloud Platform,Compute Infrastructure,-$88420.00,$9439080.00
2026-09-30,ACH-4580,Gusto Payroll System,Payroll Expense,-$318400.00,$9120680.00
2026-10-15,WIRE-1044,Silicon Valley Bank Debt,Debt Interest Service,-$19790.00,$9100890.00
2026-10-31,ACH-4702,Gusto Payroll System,Payroll Expense,-$324000.00,$8776890.00
2026-11-14,ACH-4911,NVIDIA Cloud Compute,GPU Cluster Lease,-$94500.00,$8450000.00`,
      },
      {
        id: 'cfo_cap_table',
        name: 'confidential_cap_table_series_b.csv',
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
    title: 'NDA Contract Redliner',
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
      {
        id: 'legal_schedule_a',
        name: 'schedule_a_ip_assignment.txt',
        description: 'Schedule A: Proprietary Technology & Patent Disclosures',
        category: 'legal',
        content: `=== SCHEDULE A: CONFIDENTIAL INVENTIONS & PATENT SCOPE ===
Reference Matter: BioNexus CRISPR-Vector Targeted Delivery (Project Chimera)
Lead Inventor: Dr. Elena Rostova
Patent Claims: International Patent Application PCT/US2026/049102
Grant Term: Exclusive worldwide rights for oncology and neurodegenerative targets.
Assignment Obligation: Any improvements created by Receiving Party shall automatically vest in Disclosing Party.`,
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
    title: 'HR Executive Grievance',
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
