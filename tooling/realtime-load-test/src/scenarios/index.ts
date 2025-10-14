import { connectionQuotaScenario } from './connection-quota.js';
import { originQuotaScenario } from './origin-quota.js';
import { subscriptionCapScenario } from './subscription-cap.js';
import { idleEvictionScenario } from './idle-eviction.js';
import { catchUpBurstScenario } from './catch-up-burst.js';
import { broadcastBurstScenario } from './broadcast-burst.js';
import type { ScenarioDefinition } from '../types.js';

export const scenarioRegistry = {
  'connection-quota': connectionQuotaScenario,
  'origin-quota': originQuotaScenario,
  'subscription-cap': subscriptionCapScenario,
  'idle-eviction': idleEvictionScenario,
  'catch-up-burst': catchUpBurstScenario,
  'broadcast-burst': broadcastBurstScenario,
} satisfies Record<string, ScenarioDefinition>;

export type ScenarioName = keyof typeof scenarioRegistry;

export function getScenario(name: string): ScenarioDefinition | undefined {
  if (name in scenarioRegistry) {
    return scenarioRegistry[name as ScenarioName];
  }
  return undefined;
}

export function listScenarios(): ScenarioDefinition[] {
  return Object.values(scenarioRegistry);
}
