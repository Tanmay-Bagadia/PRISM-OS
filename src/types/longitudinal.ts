export interface ExtractedMetric {
  name: string;
  value: number;
  unit: string;
  rawDisplay: string;
}

export interface VaultFolder {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
}

export interface VaultSession {
  id: string;
  timestamp: string;
  title: string;
  domainTag: string;
  folderId?: string | null;
  metrics: ExtractedMetric[];
  rawSnippet: string;
  hydratedReport: string;
}

export interface MetricDelta {
  metricName: string;
  previousDisplay: string;
  currentDisplay: string;
  absoluteChange: number;
  percentChange: number;
  direction: 'IMPROVED' | 'WORSENED' | 'UNCHANGED';
}

export interface DiffTopology {
  schema: 'prism-diff-v1';
  timeframeNote: string;
  deltas: Array<{
    metricId: string;
    percentChange: number;
    direction: 'IMPROVED' | 'WORSENED' | 'UNCHANGED';
  }>;
}

