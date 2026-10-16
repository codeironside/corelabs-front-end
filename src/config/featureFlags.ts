/** Product feature toggles — flip to re-enable without restoring removed code. */
const producerAgentV1 =
  import.meta.env.VITE_PRODUCER_AGENT_V1 !== 'false'
  && import.meta.env.VITE_PRODUCER_ENABLED !== 'false';

export const featureFlags = {
  moduleAutomationEnabled: false,
  /** Topic roadmap / episode quota / continuous season planning in Modules. */
  moduleTopicRoadmapEnabled: false,
  /** Agentic Producer orchestrator v1; backend cohort flags still apply. */
  producer_agent_v1: producerAgentV1,
  /** Alias for producer_agent_v1 — keeps existing tab wiring working. */
  producerEnabled: producerAgentV1,
} as const;
