import type {
  CognitivePosture,
  DeviceContext,
  RemoteThresholds,
  RouterDecision,
} from '../../types/prism';

/**
 * Bounds Remote Config thresholds within safe, operational boundaries
 * to prevent misconfiguration from degrading user experience.
 */
export function clampThresholds(raw: RemoteThresholds): RemoteThresholds {
  const minBattery = Math.max(0.05, Math.min(0.95, raw.minBatteryForCloud ?? 0.2));
  const maxRtt = Math.max(100, Math.min(30000, raw.maxRttForCloud ?? 2000));

  return {
    minBatteryForCloud: minBattery,
    maxRttForCloud: maxRtt,
    vaultForceLocal: raw.vaultForceLocal ?? true,
    frontierForceCloud: raw.frontierForceCloud ?? true,
  };
}

/**
 * Adaptive Utility Router
 *
 * Dynamically resolves execution strategy (on-device Nano vs. Cloud Gemini)
 * based on user cognitive posture dial, live device battery, network latency (RTT),
 * connectivity status, and browser capability.
 */
export function computeRoute(
  posture: CognitivePosture,
  device: DeviceContext,
  thresholds: RemoteThresholds
): RouterDecision {
  const config = clampThresholds(thresholds);
  const useNano = device.nanoAvailable;

  // 1. Vault Mode: Absolute Privacy Guarantee
  if (posture === 'vault') {
    return {
      effectivePosture: 'vault',
      useNano,
      useCloud: false,
      reason: 'Vault mode selected: all reasoning forced on-device with zero cloud telemetry.',
    };
  }

  // 2. Offline Detection: Fallback to local on-device / local cache
  if (!device.online) {
    return {
      effectivePosture: posture === 'frontier' ? 'balanced' : posture,
      useNano,
      useCloud: false,
      reason: `${posture === 'frontier' ? 'Frontier downgraded to balanced' : 'Balanced mode'}: device is offline, relying on cached Firestore blueprints and local hydration.`,
    };
  }

  // 3. Battery Constraints Check
  if (device.batteryLevel < config.minBatteryForCloud) {
    return {
      effectivePosture: 'balanced',
      useNano,
      useCloud: false,
      reason: `Constrained battery (${Math.round(device.batteryLevel * 100)}% < ${Math.round(config.minBatteryForCloud * 100)}%): falling back to local processing to conserve power.`,
    };
  }

  // 4. Network Latency Constraints Check
  if (device.networkRttMs > config.maxRttForCloud) {
    return {
      effectivePosture: 'balanced',
      useNano,
      useCloud: false,
      reason: `High network latency RTT (${device.networkRttMs}ms > ${config.maxRttForCloud}ms): avoiding cloud round-trip delay.`,
    };
  }

  // 5. Frontier Mode: Maximum Intelligence via Cloud Gemini
  if (posture === 'frontier') {
    return {
      effectivePosture: 'frontier',
      useNano,
      useCloud: true,
      reason: 'Frontier mode active: optimal network & battery detected; cloud reasoning enabled for maximum cognitive depth.',
    };
  }

  // 6. Balanced Mode: Adaptive Hybrid
  return {
    effectivePosture: 'balanced',
    useNano,
    useCloud: true,
    reason: 'Balanced mode active: healthy network & battery detected; cloud blueprint generation enabled over abstract topology.',
  };
}
