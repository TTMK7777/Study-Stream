import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  smallint,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey(),
  displayName: text("display_name"),
  examDate1st: timestamp("exam_date_1st", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const lessonsCache = pgTable(
  "lessons_cache",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topicId: text("topic_id").notNull(),
    modelVersion: text("model_version").notNull(),
    promptVersion: smallint("prompt_version").notNull().default(1),
    lessonJson: jsonb("lesson_json").notNull(),
    quizJson: jsonb("quiz_json").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uxTopicModelPrompt: uniqueIndex("ux_topic_model_prompt").on(
      t.topicId,
      t.modelVersion,
      t.promptVersion,
    ),
  }),
);

export const studyHistory = pgTable(
  "study_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    topicId: text("topic_id").notNull(),
    subjectId: text("subject_id").notNull(),
    quizScore: smallint("quiz_score"),
    quizTotal: smallint("quiz_total").notNull().default(3),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    ixUserCompleted: index("ix_study_history_user_completed").on(
      t.userId,
      t.completedAt,
    ),
    ixUserSubject: index("ix_study_history_user_subject").on(
      t.userId,
      t.subjectId,
    ),
  }),
);

export const highlights = pgTable(
  "highlights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    topicId: text("topic_id").notNull(),
    sectionHeading: text("section_heading").notNull(),
    text: text("text").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    ixUserCreated: index("ix_highlights_user_created").on(
      t.userId,
      t.createdAt,
    ),
  }),
);

export const apiCalls = pgTable(
  "api_calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    endpoint: text("endpoint").notNull(),
    calledAt: timestamp("called_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    ixUserCalledAt: index("ix_api_calls_user_called_at").on(
      t.userId,
      t.calledAt,
    ),
  }),
);
