export interface ReferenceMetric {
  metricKey: string;
  label: string;
  targetValue: number;
  peerMedian?: number;
  topQuartile?: number;
  unit: string;
  sourceCitation: string;
}

export interface SubjectRatio {
  ratioKey: string;
  label: string;
  value: number;
  unit: string;
  rawNumerator?: number;
  rawDenominator?: number;
}

export interface BenchmarkTopology {
  schema: 'prism-benchmark-v1';
  userProvidedSourceTitle: string | null;
  subjectRatios: Array<{
    ratioKey: string;
    label: string;
    value: number;
    unit: string;
  }>;
  referenceMetrics: ReferenceMetric[];
}

export interface CloudBenchmarkEvaluation {
  ratioKey: string;
  standing: string;
  targetGapRatio: number;
  benchmarkValueDisplay: string;
  sourceCitation: string;
}

export interface BenchmarkFinding {
  ratioKey: string;
  label: string;
  observedDisplay: string;
  benchmarkDisplay: string;
  percentileOrStanding: string;
  localImpactSummary: string;
  sourceCitation: string;
  sourceType: 'USER_SUPPLIED' | 'STANDARD_BASELINE';
}
