export const SCENE_GENERATION_TIMEOUT_MS = 5 * 60 * 1000;

export type SceneApprovalStatus =
  | "unrendered"
  | "generating"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "queued"
  | "ready"
  | "failed";

export type SceneApprovalRecord = {
  order?: number;
  sceneNumber?: number;
  status?: SceneApprovalStatus;
  catalogStatus?: SceneApprovalStatus;
  chapterIndex?: number;
  chapterTitle?: string;
  chapterLabel?: string;
  generationStartedAt?: Date | string;
  updatedAt?: Date | string;
};

function statusOf(scene: SceneApprovalRecord): SceneApprovalStatus {
  return scene.catalogStatus ?? scene.status ?? "unrendered";
}

export function sceneOrderOf(scene: Pick<SceneApprovalRecord, "order" | "sceneNumber">): number {
  return scene.order ?? scene.sceneNumber ?? 0;
}

export function isGenerationTimestampStale(
  startedAt: Date | string | undefined,
  now = Date.now(),
  timeoutMs = SCENE_GENERATION_TIMEOUT_MS,
): boolean {
  if (!startedAt) return false;
  const ts = startedAt instanceof Date ? startedAt.getTime() : Date.parse(String(startedAt));
  if (!Number.isFinite(ts)) return false;
  return now - ts > timeoutMs;
}

export function isSceneGenerationStuck(scene: SceneApprovalRecord, now = Date.now()): boolean {
  const status = statusOf(scene);
  if (status !== "generating" && status !== "queued") return false;
  return isGenerationTimestampStale(scene.generationStartedAt ?? scene.updatedAt, now);
}

export function unapprovedSceneCount(scenes: SceneApprovalRecord[]): number {
  return scenes.filter((scene) => statusOf(scene) !== "approved").length;
}

export function stitchBlockedMessage(remaining: number): string {
  if (remaining <= 0) return "";
  if (remaining === 1) return "1 scene still needs approval before rendering the full episode.";
  return `${remaining} scenes still need approval before rendering the full episode.`;
}

export function focusApprovalScene<T extends SceneApprovalRecord>(scenes: T[], now = Date.now()): T | undefined {
  const ordered = [...scenes].sort((left, right) => sceneOrderOf(left) - sceneOrderOf(right));
  const stuck = ordered.find((scene) => isSceneGenerationStuck(scene, now));
  const generating = ordered.find((scene) => {
    const status = statusOf(scene);
    return (status === "generating" || status === "queued") && !isSceneGenerationStuck(scene, now);
  });
  const pending = ordered.find((scene) => statusOf(scene) === "pending_approval");
  return stuck ?? generating ?? pending;
}

export function approvalProgress(scenes: SceneApprovalRecord[], now = Date.now()): {
  current: number;
  total: number;
  phase: "generating" | "pending_approval" | "approved" | "idle" | "stuck";
  text: string;
} {
  const ordered = [...scenes].sort((left, right) => sceneOrderOf(left) - sceneOrderOf(right));
  const total = ordered.length;
  const stuck = ordered.find((scene) => isSceneGenerationStuck(scene, now));
  const generating = ordered.find((scene) => {
    const status = statusOf(scene);
    return (status === "generating" || status === "queued") && !isSceneGenerationStuck(scene, now);
  });
  const pending = ordered.find((scene) => statusOf(scene) === "pending_approval");
  const approvedCount = ordered.filter((scene) => statusOf(scene) === "approved").length;
  const focus = stuck ?? generating ?? pending ?? ordered[Math.min(approvedCount, Math.max(0, total - 1))];
  const current = focus ? sceneOrderOf(focus) : approvedCount;
  const useChapterChrome = new Set(ordered.map((scene) => scene.chapterIndex ?? 0)).size > 1;
  const foundInChapter = focus && useChapterChrome
    ? ordered
      .filter((scene) => (scene.chapterIndex ?? 0) === (focus.chapterIndex ?? 0))
      .findIndex((scene) => sceneOrderOf(scene) === sceneOrderOf(focus))
    : -1;
  const chapterSceneNumber = foundInChapter >= 0 ? foundInChapter + 1 : current;

  let phase: "generating" | "pending_approval" | "approved" | "idle" | "stuck" = "idle";
  if (stuck) phase = "stuck";
  else if (generating) phase = "generating";
  else if (pending) phase = "pending_approval";
  else if (total > 0 && approvedCount === total) phase = "approved";

  const sceneLabel = total === 0
    ? "No scenes yet"
    : useChapterChrome && focus
      ? `Chapter ${(focus.chapterIndex ?? 0) + 1}, Scene ${chapterSceneNumber} (overall ${current} of ${total})`
      : `Scene ${current} of ${total}`;

  const suffix =
    phase === "stuck" ? "generation may have failed"
    : phase === "generating" ? "generating"
    : phase === "pending_approval" ? "awaiting your approval"
    : phase === "approved" ? "all scenes approved"
    : approvedCount > 0 ? "ready for the next scene"
    : "not started";

  return {
    current,
    total,
    phase,
    text: total === 0 ? sceneLabel : `${sceneLabel} — ${suffix}`,
  };
}
