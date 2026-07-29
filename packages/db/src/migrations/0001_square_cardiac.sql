CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."memory_mode" AS ENUM('default', 'project');--> statement-breakpoint
CREATE TYPE "public"."project_file_status" AS ENUM('pending', 'indexed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."project_icon_kind" AS ENUM('emoji', 'lucide');--> statement-breakpoint
CREATE TYPE "public"."memory_item_type" AS ENUM('fact', 'preference', 'goal', 'decision', 'constraint');--> statement-breakpoint
CREATE TYPE "public"."memory_job_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."memory_job_type" AS ENUM('extract', 'summarize', 'file_index', 'chat_reindex');--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"icon_kind" "project_icon_kind" DEFAULT 'emoji' NOT NULL,
	"icon_value" text DEFAULT '📁' NOT NULL,
	"icon_color" text DEFAULT 'neutral' NOT NULL,
	"memory_mode" "memory_mode" DEFAULT 'default' NOT NULL,
	"instructions" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_file" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"filename" text NOT NULL,
	"media_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"extracted_text" text,
	"status" "project_file_status" DEFAULT 'pending' NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_file_chunk" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"project_id" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_summary" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"user_id" text NOT NULL,
	"summary" text NOT NULL,
	"last_message_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chat_summary_chat_id_unique" UNIQUE("chat_id")
);
--> statement-breakpoint
CREATE TABLE "memory_item" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text,
	"source_chat_id" text,
	"source_message_id" text,
	"memory_key" text NOT NULL,
	"memory_type" "memory_item_type" NOT NULL,
	"content" text NOT NULL,
	"importance" double precision DEFAULT 0.5 NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_job" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "memory_job_type" NOT NULL,
	"status" "memory_job_status" DEFAULT 'pending' NOT NULL,
	"chat_id" text,
	"project_id" text,
	"file_id" text,
	"dedupe_key" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"lease_until" timestamp,
	"error" text,
	"payload" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat" ADD COLUMN "project_id" text;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_file" ADD CONSTRAINT "project_file_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_file" ADD CONSTRAINT "project_file_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_file_chunk" ADD CONSTRAINT "project_file_chunk_file_id_project_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."project_file"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_file_chunk" ADD CONSTRAINT "project_file_chunk_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_summary" ADD CONSTRAINT "chat_summary_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_summary" ADD CONSTRAINT "chat_summary_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_summary" ADD CONSTRAINT "chat_summary_last_message_id_message_id_fk" FOREIGN KEY ("last_message_id") REFERENCES "public"."message"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_item" ADD CONSTRAINT "memory_item_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_item" ADD CONSTRAINT "memory_item_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_item" ADD CONSTRAINT "memory_item_source_chat_id_chat_id_fk" FOREIGN KEY ("source_chat_id") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_item" ADD CONSTRAINT "memory_item_source_message_id_message_id_fk" FOREIGN KEY ("source_message_id") REFERENCES "public"."message"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_job" ADD CONSTRAINT "memory_job_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_job" ADD CONSTRAINT "memory_job_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_job" ADD CONSTRAINT "memory_job_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_userId_idx" ON "project" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_file_projectId_idx" ON "project_file" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_file_userId_idx" ON "project_file" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_file_chunk_fileId_idx" ON "project_file_chunk" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "project_file_chunk_projectId_idx" ON "project_file_chunk" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_file_chunk_embedding_idx" ON "project_file_chunk" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "project_file_chunk_content_trgm_idx" ON "project_file_chunk" USING gin ("content" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "chat_summary_chatId_idx" ON "chat_summary" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "chat_summary_userId_idx" ON "chat_summary" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "memory_item_userId_idx" ON "memory_item" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "memory_item_projectId_idx" ON "memory_item" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "memory_item_sourceChatId_idx" ON "memory_item" USING btree ("source_chat_id");--> statement-breakpoint
CREATE INDEX "memory_item_user_key_idx" ON "memory_item" USING btree ("user_id","memory_key");--> statement-breakpoint
CREATE INDEX "memory_item_embedding_idx" ON "memory_item" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "memory_item_content_trgm_idx" ON "memory_item" USING gin ("content" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "memory_job_dedupeKey_idx" ON "memory_job" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "memory_job_status_lease_idx" ON "memory_job" USING btree ("status","lease_until");--> statement-breakpoint
CREATE INDEX "memory_job_userId_idx" ON "memory_job" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "memory_job_chatId_idx" ON "memory_job" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "memory_job_projectId_idx" ON "memory_job" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "chat" ADD CONSTRAINT "chat_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_projectId_idx" ON "chat" USING btree ("project_id");