import fs from "node:fs/promises";
import path from "node:path";
import type { BatchProgressDetail } from "./pipeline.js";
import { REPORTS_DIR } from "./paths.js";

export interface BatchProgressFile {
  runId: string;
  collection: "assessment" | "targeted";
  requested: number;
  done: number;
  total: number;
  startedAt: string;
  updatedAt: string;
  last?: BatchProgressDetail & { index: number };
  status: "in_progress" | "completed" | "failed" | "interrupted";
  error?: string;
}

export const BATCH_PROGRESS_PATH = path.join(REPORTS_DIR, "batch-progress.json");

export async function writeBatchProgress(state: BatchProgressFile): Promise<void> {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  await fs.writeFile(BATCH_PROGRESS_PATH, JSON.stringify(state, null, 2), "utf8");
}
