/** Product feature toggles — flip to re-enable without restoring removed code. */
export const featureFlags = {
  moduleAutomationEnabled: false,
  /** Topic roadmap / episode quota / continuous season planning in Modules. */
  moduleTopicRoadmapEnabled: false,
  /** Agentic Producer tab; backend cohort flags still apply. */
  producerEnabled: true,
} as const;
