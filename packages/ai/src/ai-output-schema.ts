import { z } from "zod";

/** Subset of brief fields the model may populate (renderer adds id, category, layout, canvas). */
export const AiContentPartialSchema = z.object({
  headline: z.string().min(3).max(100),
  subtitle: z.string().max(160).optional(),
  supportingText: z.string().max(400).optional(),
  keyPoints: z.array(z.string().max(140)).max(8).optional(),
  steps: z
    .array(
      z.object({
        title: z.string().max(60),
        description: z.string().max(200),
      }),
    )
    .max(6)
    .optional(),
  comparison: z
    .object({
      leftTitle: z.string().max(60),
      rightTitle: z.string().max(60),
      items: z
        .array(
          z.object({
            name: z.string().max(60),
            points: z.array(z.string().max(120)).min(1).max(5),
          }),
        )
        .length(2),
    })
    .optional(),
  metrics: z
    .array(
      z.object({
        label: z.string().max(80),
        value: z.string().max(24),
        note: z.string().max(120).optional(),
        illustrative: z.boolean().optional(),
      }),
    )
    .max(6)
    .optional(),
  quote: z
    .object({
      text: z.string().max(280),
      attribution: z.string().max(80).optional(),
    })
    .optional(),
  visualMotifs: z.array(z.string().max(60)).max(6).optional(),
  layoutRecommendation: z.string().max(200).optional(),
  styleDirection: z.string().max(120).optional(),
});

export type AiContentPartial = z.infer<typeof AiContentPartialSchema>;
