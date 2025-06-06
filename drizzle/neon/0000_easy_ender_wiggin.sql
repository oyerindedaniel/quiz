CREATE TYPE "public"."admin_role" AS ENUM('SUPER_ADMIN', 'ADMIN', 'TEACHER');--> statement-breakpoint
CREATE TYPE "public"."admin_status" AS ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."class" AS ENUM('SS2', 'JSS3', 'BASIC5');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('MALE', 'FEMALE');--> statement-breakpoint
CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(100) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"role" "admin_role" DEFAULT 'ADMIN' NOT NULL,
	"status" "admin_status" DEFAULT 'ACTIVE' NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"profile_image" varchar(500),
	"phone_number" varchar(20),
	CONSTRAINT "admins_email_unique" UNIQUE("email"),
	CONSTRAINT "admins_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"subject_code" varchar(50) NOT NULL,
	"text" text NOT NULL,
	"options" jsonb NOT NULL,
	"answer" varchar(1) NOT NULL,
	"question_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"is_active" boolean DEFAULT true,
	"explanation" text,
	CONSTRAINT "questions_subject_id_order_unique" UNIQUE("subject_id","question_order")
);
--> statement-breakpoint
CREATE TABLE "quiz_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid,
	"total_attempts" integer DEFAULT 0,
	"average_score" integer,
	"pass_rate" integer,
	"calculated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"answers" jsonb,
	"score" integer,
	"total_questions" integer NOT NULL,
	"submitted" boolean DEFAULT false,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"submitted_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"session_duration" integer,
	"ip_address" varchar(45),
	"user_agent" text,
	"version" varchar(20),
	"elapsed_time" integer DEFAULT 0,
	"last_active_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"subject_code" varchar(50) NOT NULL,
	"description" text,
	"class" "class" NOT NULL,
	"total_questions" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true,
	"category" varchar(100),
	"academic_year" varchar(20),
	CONSTRAINT "subjects_subject_code_unique" UNIQUE("subject_code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"student_code" varchar(50) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"class" "class" NOT NULL,
	"gender" "gender" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_login" timestamp,
	"is_active" boolean DEFAULT true,
	"school_id" uuid,
	CONSTRAINT "users_student_code_unique" UNIQUE("student_code")
);
--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_analytics" ADD CONSTRAINT "quiz_analytics_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "questions_subject_code_idx" ON "questions" USING btree ("subject_code");--> statement-breakpoint
CREATE INDEX "questions_question_order_idx" ON "questions" USING btree ("question_order");--> statement-breakpoint
CREATE INDEX "questions_is_active_idx" ON "questions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "questions_created_at_idx" ON "questions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "questions_subject_id_idx" ON "questions" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_user_id_idx" ON "quiz_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_subject_id_idx" ON "quiz_attempts" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_submitted_idx" ON "quiz_attempts" USING btree ("submitted");--> statement-breakpoint
CREATE INDEX "quiz_attempts_started_at_idx" ON "quiz_attempts" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "quiz_attempts_submitted_at_idx" ON "quiz_attempts" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "quiz_attempts_user_subject_idx" ON "quiz_attempts" USING btree ("user_id","subject_id");--> statement-breakpoint
CREATE INDEX "subjects_subject_code_idx" ON "subjects" USING btree ("subject_code");--> statement-breakpoint
CREATE INDEX "subjects_class_idx" ON "subjects" USING btree ("class");--> statement-breakpoint
CREATE INDEX "subjects_is_active_idx" ON "subjects" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "subjects_created_at_idx" ON "subjects" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_student_code_idx" ON "users" USING btree ("student_code");--> statement-breakpoint
CREATE INDEX "users_class_idx" ON "users" USING btree ("class");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_is_active_idx" ON "users" USING btree ("is_active");