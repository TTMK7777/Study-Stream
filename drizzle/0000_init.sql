CREATE TABLE "api_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"called_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "highlights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"topic_id" text NOT NULL,
	"section_heading" text NOT NULL,
	"text" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lessons_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" text NOT NULL,
	"model_version" text NOT NULL,
	"prompt_version" smallint DEFAULT 1 NOT NULL,
	"lesson_json" jsonb NOT NULL,
	"quiz_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"exam_date_1st" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"topic_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"quiz_score" smallint,
	"quiz_total" smallint DEFAULT 3 NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ix_api_calls_user_called_at" ON "api_calls" USING btree ("user_id","called_at");--> statement-breakpoint
CREATE INDEX "ix_highlights_user_created" ON "highlights" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_topic_model_prompt" ON "lessons_cache" USING btree ("topic_id","model_version","prompt_version");--> statement-breakpoint
CREATE INDEX "ix_study_history_user_completed" ON "study_history" USING btree ("user_id","completed_at");--> statement-breakpoint
CREATE INDEX "ix_study_history_user_subject" ON "study_history" USING btree ("user_id","subject_id");