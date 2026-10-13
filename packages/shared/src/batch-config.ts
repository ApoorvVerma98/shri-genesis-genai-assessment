import { z } from "zod";
import { CategorySchema, LayoutFamilySchema } from "./schemas.js";

export const BatchSegmentSchema = z.object({
  category: CategorySchema,
  layoutFamily: LayoutFamilySchema,
  count: z.number().int().min(1).max(200),
});

export type BatchSegment = z.infer<typeof BatchSegmentSchema>;

export const BatchJobRequestSchema = z
  .object({
    /** Legacy total count when `segments` is omitted (default 100). */
    count: z.number().int().min(1).max(200).optional(),
    seed: z.number().int().optional(),
    segments: z.array(BatchSegmentSchema).min(1).max(50).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.segments) {
      const total = data.segments.reduce((sum, s) => sum + s.count, 0);
      if (total < 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Segment counts must sum to at least 1" });
      }
      if (total > 200) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Total designs ${total} exceeds maximum of 200`,
        });
      }
      if (data.count !== undefined && data.count !== total) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `count (${data.count}) must match segment total (${total}) when segments are provided`,
        });
      }
    }
  });

export type BatchJobRequest = z.infer<typeof BatchJobRequestSchema>;

export function resolveBatchJob(request: BatchJobRequest): {
  total: number;
  segments?: BatchSegment[];
  seed: number;
} {
  const seed = request.seed ?? 42;
  if (request.segments?.length) {
    const total = request.segments.reduce((s, x) => s + x.count, 0);
    return { total, segments: request.segments, seed };
  }
  const total = request.count ?? 100;
  return { total, seed };
}
