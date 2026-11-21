/** Batch helpers: chunking and aggregate reporting around batch.execute. */

import { config } from "../config.js";
import type { MohoClient } from "../moho-client.js";
import { callMoho } from "./define.js";

export interface Operation {
  method: string;
  params?: Record<string, unknown>;
}

export interface BatchSummary {
  total: number;
  succeeded: number;
  failed: number;
  /** First failures (capped) so the model can see what went wrong. */
  errors: Array<{ index: number; method: string; message: string }>;
}

const MAX_REPORTED_ERRORS = 10;

export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size < 1) throw new Error("chunk size must be >= 1");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

interface RawBatchResult {
  results?: Array<{ success: boolean; error?: { message?: string } | string }>;
}

function errorMessage(e: unknown): string {
  if (typeof e === "string") return e;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "unknown error";
}

/**
 * Run any number of operations, splitting into chunks the plugin accepts.
 * Stops after the first chunk with a failure when stopOnError is set.
 */
export async function runBatch(
  client: MohoClient,
  operations: readonly Operation[],
  options: { stopOnError?: boolean } = {},
): Promise<BatchSummary> {
  const summary: BatchSummary = { total: operations.length, succeeded: 0, failed: 0, errors: [] };
  let offset = 0;

  for (const part of chunk(operations, config.moho.maxBatchSize)) {
    const timeout = config.moho.requestTimeout + part.length * config.moho.batchTimeoutPerOp;
    const raw = (await callMoho(
      client,
      "batch.execute",
      { operations: part, stopOnError: options.stopOnError ?? false },
      { timeout },
    )) as RawBatchResult;

    const results = raw.results ?? [];
    results.forEach((r, i) => {
      if (r.success) {
        summary.succeeded += 1;
      } else {
        summary.failed += 1;
        if (summary.errors.length < MAX_REPORTED_ERRORS) {
          summary.errors.push({
            index: offset + i,
            method: part[i]?.method ?? "?",
            message: errorMessage(r.error),
          });
        }
      }
    });
    offset += part.length;
    if (options.stopOnError && summary.failed > 0) break;
  }
  return summary;
}
