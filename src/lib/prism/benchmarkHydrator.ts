import type {
  BenchmarkFinding,
  BenchmarkTopology,
  CloudBenchmarkEvaluation,
  ReferenceMetric,
  SubjectRatio,
} from '../../types/benchmark';

function normalizeKey(value: string | undefined | null): string {
  return (value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '0';
  }
  const abs = Math.abs(value);
  const maxDigits = abs > 0 && abs < 0.01 ? 4 : 2;
  return value.toLocaleString('en-US', {
    maximumFractionDigits: maxDigits,
  });
}

function formatValueWithUnit(value: number, unit: string): string {
  const formatted = formatNumber(value);
  const trimmedUnit = unit.trim();
  if (!trimmedUnit) {
    return formatted;
  }
  if (trimmedUnit === '%' || trimmedUnit.startsWith('%')) {
    return `${formatted}${trimmedUnit}`;
  }
  return `${formatted} ${trimmedUnit}`;
}

function findMatchingReferenceMetric(
  ratioKey: string,
  label: string,
  unit: string,
  fallbackIndex: number,
  referenceMetrics: ReferenceMetric[],
  usedIndices?: Set<number>,
): { metric: ReferenceMetric; index: number } | undefined {
  if (referenceMetrics.length === 0) {
    return undefined;
  }

  const normKey = normalizeKey(ratioKey);
  const normLabel = normalizeKey(label);
  const normUnit = unit.trim().toLowerCase();

  const isAvailable = (idx: number) => !usedIndices || !usedIndices.has(idx);

  // 1. Exact/normalized key match
  for (let i = 0; i < referenceMetrics.length; i++) {
    if (!isAvailable(i)) continue;
    const metric = referenceMetrics[i];
    if (!metric) continue;
    if (normKey !== '' && normalizeKey(metric.metricKey) === normKey) {
      return { metric, index: i };
    }
  }

  // 2. Normalized label match
  for (let i = 0; i < referenceMetrics.length; i++) {
    if (!isAvailable(i)) continue;
    const metric = referenceMetrics[i];
    if (!metric) continue;
    if (normLabel !== '' && normalizeKey(metric.label) === normLabel) {
      return { metric, index: i };
    }
  }

  // 3. Unit match
  if (normUnit !== '') {
    for (let i = 0; i < referenceMetrics.length; i++) {
      if (!isAvailable(i)) continue;
      const metric = referenceMetrics[i];
      if (!metric) continue;
      if (metric.unit.trim().toLowerCase() === normUnit) {
        return { metric, index: i };
      }
    }
  }

  // 4. Positional fallback
  const positional = referenceMetrics[fallbackIndex];
  if (positional && isAvailable(fallbackIndex)) {
    return { metric: positional, index: fallbackIndex };
  }

  return undefined;
}

function findMatchingLocalRatio(
  evaluation: CloudBenchmarkEvaluation,
  evalIndex: number,
  localSubjectRatios: SubjectRatio[],
  topology: BenchmarkTopology,
  usedLocalIndices: Set<number>,
): { ratio: SubjectRatio; index: number } | undefined {
  const normEvalKey = normalizeKey(evaluation.ratioKey);

  // 1. Exact ratioKey match
  for (let i = 0; i < localSubjectRatios.length; i++) {
    if (usedLocalIndices.has(i)) continue;
    const ratio = localSubjectRatios[i];
    if (!ratio) continue;
    if (ratio.ratioKey === evaluation.ratioKey) {
      return { ratio, index: i };
    }
  }

  // 2. Case-insensitive / normalized ratioKey or label match
  for (let i = 0; i < localSubjectRatios.length; i++) {
    if (usedLocalIndices.has(i)) continue;
    const ratio = localSubjectRatios[i];
    if (!ratio) continue;
    if (
      normEvalKey !== '' &&
      (normalizeKey(ratio.ratioKey) === normEvalKey || normalizeKey(ratio.label) === normEvalKey)
    ) {
      return { ratio, index: i };
    }
  }

  // 3. Unit match via topology subjectRatios or referenceMetrics
  const topoRatio = topology.subjectRatios.find((r) => normalizeKey(r.ratioKey) === normEvalKey);
  const refMetric = topology.referenceMetrics.find((m) => normalizeKey(m.metricKey) === normEvalKey);
  const expectedUnit = (topoRatio?.unit ?? refMetric?.unit ?? '').trim().toLowerCase();

  if (expectedUnit) {
    for (let i = 0; i < localSubjectRatios.length; i++) {
      if (usedLocalIndices.has(i)) continue;
      const ratio = localSubjectRatios[i];
      if (!ratio) continue;
      if (ratio.unit.trim().toLowerCase() === expectedUnit) {
        return { ratio, index: i };
      }
    }
  }

  // 4. Index fallback
  const positional = localSubjectRatios[evalIndex];
  if (positional && !usedLocalIndices.has(evalIndex)) {
    return { ratio: positional, index: evalIndex };
  }

  return undefined;
}

function deriveStanding(value: number, metric: ReferenceMetric, targetGapRatio: number): string {
  const diff = value - metric.targetValue;
  if (Math.abs(diff) <= 1e-9 || Math.abs(targetGapRatio) < 0.0005) {
    return 'On Target';
  }
  if (diff > 0) {
    if (metric.topQuartile !== undefined && value >= metric.topQuartile) {
      return 'Above Top Quartile';
    }
    if (metric.peerMedian !== undefined && value >= metric.peerMedian) {
      return 'Above Peer Median';
    }
    return 'Above Target';
  }
  if (metric.peerMedian !== undefined && value < metric.peerMedian) {
    return 'Below Peer Median';
  }
  return 'Below Target';
}

function buildLocalImpactSummary(
  localRatio: SubjectRatio,
  observedDisplay: string,
  benchmarkDisplay: string,
  targetGapRatio: number,
  matchedMetric: ReferenceMetric | undefined,
): string {
  const { label, value, unit, rawNumerator } = localRatio;

  if (
    rawNumerator !== undefined &&
    Number.isFinite(rawNumerator) &&
    Number.isFinite(targetGapRatio)
  ) {
    const delta = Math.abs(rawNumerator * targetGapRatio);
    if (Math.abs(targetGapRatio) < 1e-9 || delta === 0) {
      return `${label} matches the benchmark (${observedDisplay} vs ${benchmarkDisplay}), with 0 variance on base ${formatNumber(rawNumerator)}.`;
    }
    const direction = targetGapRatio > 0 ? 'above' : 'below';
    const gapPct = formatNumber(Math.abs(targetGapRatio) * 100);
    return `${label} is ${gapPct}% ${direction} benchmark (${observedDisplay} vs ${benchmarkDisplay}), representing a local delta of ${formatValueWithUnit(delta, unit)} on ${formatNumber(rawNumerator)}.`;
  }

  if (matchedMetric !== undefined && Number.isFinite(matchedMetric.targetValue)) {
    const valueDelta = Math.abs(value - matchedMetric.targetValue);
    if (valueDelta < 1e-9) {
      return `${label} matches the benchmark (${observedDisplay} vs ${benchmarkDisplay}), with 0 variance.`;
    }
    const direction = value >= matchedMetric.targetValue ? 'above' : 'below';
    return `${label} is ${direction} benchmark (${observedDisplay} vs ${benchmarkDisplay}), a variance of ${formatValueWithUnit(valueDelta, unit)}.`;
  }

  if (!Number.isFinite(targetGapRatio) || Math.abs(targetGapRatio) < 1e-9) {
    return `${label} is aligned with benchmark (${observedDisplay} vs ${benchmarkDisplay}).`;
  }

  const direction = targetGapRatio > 0 ? 'above' : 'below';
  const gapPct = formatNumber(Math.abs(targetGapRatio) * 100);
  return `${label} is ${gapPct}% ${direction} benchmark (${observedDisplay} vs ${benchmarkDisplay}).`;
}

/**
 * Purely mathematical offline comparison between anonymized subject ratios
 * and user-supplied reference metrics. Returns `[]` when no reference metrics exist.
 */
export function computeLocalBenchmarkEvaluations(
  topology: BenchmarkTopology,
): CloudBenchmarkEvaluation[] {
  if (!topology.referenceMetrics || topology.referenceMetrics.length === 0) {
    return [];
  }
  if (!topology.subjectRatios || topology.subjectRatios.length === 0) {
    return [];
  }

  const usedMetricIndices = new Set<number>();
  const evaluations: CloudBenchmarkEvaluation[] = [];

  for (let i = 0; i < topology.subjectRatios.length; i++) {
    const ratio = topology.subjectRatios[i];
    if (!ratio) continue;

    const match = findMatchingReferenceMetric(
      ratio.ratioKey,
      ratio.label,
      ratio.unit,
      i,
      topology.referenceMetrics,
      usedMetricIndices,
    );
    if (!match) {
      continue;
    }

    usedMetricIndices.add(match.index);
    const { metric } = match;
    const target = metric.targetValue;
    const rawGapRatio =
      target !== 0
        ? (ratio.value - target) / Math.abs(target)
        : ratio.value === 0
          ? 0
          : ratio.value > 0
            ? 1
            : -1;
    const targetGapRatio = Number.isFinite(rawGapRatio) ? rawGapRatio : 0;

    evaluations.push({
      ratioKey: ratio.ratioKey,
      standing: deriveStanding(ratio.value, metric, targetGapRatio),
      targetGapRatio,
      benchmarkValueDisplay: formatValueWithUnit(target, metric.unit || ratio.unit),
      sourceCitation: metric.sourceCitation,
    });
  }

  return evaluations;
}

/**
 * Hydrates anonymized cloud (or offline mathematical) benchmark evaluations
 * against local on-device SubjectRatios to compute concrete local impacts.
 */
export function hydrateBenchmarkFindings(
  topology: BenchmarkTopology,
  localSubjectRatios: SubjectRatio[],
  cloudEvaluations: CloudBenchmarkEvaluation[],
): BenchmarkFinding[] {
  const evaluations =
    cloudEvaluations.length > 0
      ? cloudEvaluations
      : topology.referenceMetrics.length > 0
        ? computeLocalBenchmarkEvaluations(topology)
        : [];

  if (evaluations.length === 0) {
    return [];
  }

  const usedLocalIndices = new Set<number>();
  const findings: BenchmarkFinding[] = [];

  for (let i = 0; i < evaluations.length; i++) {
    const evaluation = evaluations[i];
    if (!evaluation) continue;

    const localMatch = findMatchingLocalRatio(
      evaluation,
      i,
      localSubjectRatios,
      topology,
      usedLocalIndices,
    );

    let localRatio: SubjectRatio | undefined;
    if (localMatch) {
      usedLocalIndices.add(localMatch.index);
      localRatio = localMatch.ratio;
    } else {
      localRatio = topology.subjectRatios[i];
    }

    if (!localRatio) {
      continue;
    }

    const metricMatch = findMatchingReferenceMetric(
      evaluation.ratioKey,
      localRatio.label,
      localRatio.unit,
      i,
      topology.referenceMetrics,
    );
    const matchedMetric = metricMatch?.metric;

    const observedDisplay = formatValueWithUnit(localRatio.value, localRatio.unit);
    const benchmarkDisplay =
      evaluation.benchmarkValueDisplay ||
      (matchedMetric
        ? formatValueWithUnit(matchedMetric.targetValue, matchedMetric.unit || localRatio.unit)
        : 'N/A');

    const localImpactSummary = buildLocalImpactSummary(
      localRatio,
      observedDisplay,
      benchmarkDisplay,
      evaluation.targetGapRatio,
      matchedMetric,
    );

    const sourceType: BenchmarkFinding['sourceType'] =
      Boolean(topology.userProvidedSourceTitle?.trim()) || matchedMetric !== undefined
        ? 'USER_SUPPLIED'
        : 'STANDARD_BASELINE';

    const sourceCitation = evaluation.sourceCitation || matchedMetric?.sourceCitation || '';

    findings.push({
      ratioKey: localRatio.ratioKey,
      label: localRatio.label,
      observedDisplay,
      benchmarkDisplay,
      percentileOrStanding: evaluation.standing,
      localImpactSummary,
      sourceCitation,
      sourceType,
    });
  }

  return findings;
}
