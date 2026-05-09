import { z } from "zod";

const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;

export const VisualBarSchema = z.object({
  type: z.literal("bar"),
  title: z.string().optional(),
  data: z
    .array(
      z.object({
        label: z.string().min(1),
        value: z.number().min(0).max(100),
        color: z.string().regex(HEX_COLOR),
      }),
    )
    .min(1)
    .max(5),
});

export const VisualMetricsSchema = z.object({
  type: z.literal("metrics"),
  data: z
    .array(
      z.object({
        icon: z.string().min(1),
        label: z.string().min(1),
        value: z.string().min(1),
      }),
    )
    .min(1)
    .max(4),
});

export const VisualComparisonSchema = z.object({
  type: z.literal("comparison"),
  title: z.string().optional(),
  labels: z.object({
    left: z.string().min(1),
    right: z.string().min(1),
  }),
  data: z
    .array(
      z.object({
        aspect: z.string().min(1),
        left: z.string().min(1),
        right: z.string().min(1),
      }),
    )
    .min(1)
    .max(4),
});

export const VisualNoneSchema = z.object({
  type: z.literal("none"),
});

export const VisualSchema = z.discriminatedUnion("type", [
  VisualBarSchema,
  VisualMetricsSchema,
  VisualComparisonSchema,
  VisualNoneSchema,
]);

export const LessonSectionSchema = z.object({
  icon: z.string().min(1),
  heading: z.string().min(1),
  content: z.string().min(40).max(220),
  visual: VisualSchema,
});

export const LessonSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1),
  sections: z.array(LessonSectionSchema).length(4),
  key_points: z.array(z.string().min(1)).length(3),
});

export const QuizQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correct: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
});

export const QuizSchema = z.array(QuizQuestionSchema).length(3);

export type Lesson = z.infer<typeof LessonSchema>;
export type LessonSection = z.infer<typeof LessonSectionSchema>;
export type Visual = z.infer<typeof VisualSchema>;
export type VisualBar = z.infer<typeof VisualBarSchema>;
export type VisualMetrics = z.infer<typeof VisualMetricsSchema>;
export type VisualComparison = z.infer<typeof VisualComparisonSchema>;
export type Quiz = z.infer<typeof QuizSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
