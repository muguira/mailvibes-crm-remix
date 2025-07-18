

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_deleted_contacts"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM public.deleted_contacts
  WHERE expiry_date < NOW();
  
  -- Log the cleanup operation
  RAISE NOTICE 'Cleaned up expired deleted contacts at %', NOW();
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_deleted_contacts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_zapier_sessions"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM zapier_sessions 
  WHERE expires_at < NOW();
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_zapier_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_api_key"("p_user_id" "uuid", "p_api_key" "text", "p_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO user_api_keys (user_id, api_key, name, is_active)
  VALUES (p_user_id, p_api_key, p_name, true)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;


ALTER FUNCTION "public"."create_user_api_key"("p_user_id" "uuid", "p_api_key" "text", "p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."restore_deleted_contact"("contact_id_param" "uuid", "user_id_param" "uuid") RETURNS TABLE("restored" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  contact_record RECORD;
  restored_val BOOLEAN := FALSE;
BEGIN
  -- Get the deleted contact
  SELECT * INTO contact_record 
  FROM public.deleted_contacts 
  WHERE id = contact_id_param AND user_id = user_id_param;
  
  IF FOUND THEN
    -- Insert back into contacts table
    INSERT INTO public.contacts (
      id, user_id, name, email, phone, company, status,
      last_activity, created_at, updated_at, data, list_id
    ) VALUES (
      contact_record.id, contact_record.user_id, contact_record.name, 
      contact_record.email, contact_record.phone, contact_record.company, 
      contact_record.status, contact_record.last_activity, 
      contact_record.created_at, NOW(), contact_record.data, contact_record.list_id
    );
    
    -- Remove from deleted_contacts table
    DELETE FROM public.deleted_contacts 
    WHERE id = contact_id_param AND user_id = user_id_param;
    
    restored_val := TRUE;
  END IF;
  
  RETURN QUERY SELECT restored_val;
END;
$$;


ALTER FUNCTION "public"."restore_deleted_contact"("contact_id_param" "uuid", "user_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."soft_delete_contacts"("contact_ids" "uuid"[], "user_id_param" "uuid") RETURNS TABLE("moved_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  expiry_date_val TIMESTAMP WITH TIME ZONE;
  moved_count_val INTEGER := 0;
BEGIN
  -- Calculate expiry date (90 days from now)
  expiry_date_val := NOW() + INTERVAL '90 days';
  
  -- Move contacts to deleted_contacts table
  INSERT INTO public.deleted_contacts (
    id, user_id, name, email, phone, company, status, 
    last_activity, created_at, updated_at, deleted_at, data, list_id, expiry_date
  )
  SELECT 
    c.id, c.user_id, c.name, c.email, c.phone, c.company, c.status,
    c.last_activity, c.created_at, c.updated_at, NOW(), c.data, c.list_id, expiry_date_val
  FROM public.contacts c
  WHERE c.id = ANY(contact_ids) AND c.user_id = user_id_param;
  
  GET DIAGNOSTICS moved_count_val = ROW_COUNT;
  
  -- Delete from contacts table
  DELETE FROM public.contacts 
  WHERE id = ANY(contact_ids) AND user_id = user_id_param;
  
  RETURN QUERY SELECT moved_count_val;
END;
$$;


ALTER FUNCTION "public"."soft_delete_contacts"("contact_ids" "uuid"[], "user_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_api_key_usage"("p_api_key" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE user_api_keys
  SET last_used_at = NOW()
  WHERE api_key = p_api_key;
END;
$$;


ALTER FUNCTION "public"."update_api_key_usage"("p_api_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_comments_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_comments_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_api_key"("p_api_key" "text") RETURNS TABLE("user_id" "uuid", "name" "text", "is_active" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT uak.user_id, uak.name, uak.is_active
  FROM user_api_keys uak
  WHERE uak.api_key = p_api_key
    AND uak.is_active = true
    AND (uak.expires_at IS NULL OR uak.expires_at > NOW());
END;
$$;


ALTER FUNCTION "public"."validate_api_key"("p_api_key" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "list_id" "uuid",
    "name" "text" NOT NULL,
    "company" "text",
    "email" "text",
    "phone" "text",
    "status" "text",
    "last_activity" timestamp with time zone,
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."deleted_contacts" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "company" "text",
    "status" "text",
    "last_activity" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "deleted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "data" "jsonb",
    "list_id" "uuid",
    "expiry_date" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."deleted_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email" character varying(255) NOT NULL,
    "provider" character varying(50) DEFAULT 'gmail'::character varying,
    "sync_enabled" boolean DEFAULT true,
    "sync_frequency_minutes" integer DEFAULT 5,
    "last_sync_at" timestamp with time zone,
    "last_sync_status" character varying(50) DEFAULT 'pending'::character varying,
    "last_sync_error" "text",
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "email_accounts_provider_check" CHECK ((("provider")::"text" = ANY ((ARRAY['gmail'::character varying, 'outlook'::character varying, 'other'::character varying])::"text"[])))
);


ALTER TABLE "public"."email_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email_id" "uuid" NOT NULL,
    "gmail_attachment_id" character varying(255),
    "filename" character varying(500) NOT NULL,
    "mime_type" character varying(255),
    "size_bytes" bigint,
    "inline" boolean DEFAULT false,
    "content_id" character varying(255),
    "storage_path" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_sync_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email_account_id" "uuid" NOT NULL,
    "sync_type" character varying(50) NOT NULL,
    "status" character varying(50) NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "emails_synced" integer DEFAULT 0,
    "emails_created" integer DEFAULT 0,
    "emails_updated" integer DEFAULT 0,
    "error_message" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_sync_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."emails" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email_account_id" "uuid" NOT NULL,
    "contact_id" "uuid",
    "gmail_id" character varying(255) NOT NULL,
    "gmail_thread_id" character varying(255),
    "gmail_history_id" bigint,
    "subject" "text",
    "snippet" "text",
    "body_text" "text",
    "body_html" "text",
    "from_email" character varying(255) NOT NULL,
    "from_name" character varying(255),
    "to_emails" "jsonb" DEFAULT '[]'::"jsonb",
    "cc_emails" "jsonb" DEFAULT '[]'::"jsonb",
    "bcc_emails" "jsonb" DEFAULT '[]'::"jsonb",
    "reply_to" character varying(255),
    "date" timestamp with time zone NOT NULL,
    "is_sent" boolean DEFAULT false,
    "is_draft" boolean DEFAULT false,
    "is_read" boolean DEFAULT false,
    "is_starred" boolean DEFAULT false,
    "is_important" boolean DEFAULT false,
    "is_spam" boolean DEFAULT false,
    "is_trash" boolean DEFAULT false,
    "labels" "jsonb" DEFAULT '[]'::"jsonb",
    "categories" "jsonb" DEFAULT '[]'::"jsonb",
    "has_attachments" boolean DEFAULT false,
    "attachment_count" integer DEFAULT 0,
    "size_bytes" bigint,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."emails" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leads_rows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "row_id" integer NOT NULL,
    "data" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."leads_rows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."oauth_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email_account_id" "uuid" NOT NULL,
    "access_token" "text" NOT NULL,
    "refresh_token" "text",
    "token_type" character varying(50) DEFAULT 'Bearer'::character varying,
    "expires_at" timestamp with time zone NOT NULL,
    "scope" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_refresh_attempt" timestamp with time zone,
    "refresh_attempts" integer DEFAULT 0
);


ALTER TABLE "public"."oauth_tokens" OWNER TO "postgres";


COMMENT ON COLUMN "public"."oauth_tokens"."refresh_token" IS 'Google OAuth refresh token for obtaining new access tokens';



COMMENT ON COLUMN "public"."oauth_tokens"."last_refresh_attempt" IS 'Timestamp of the last token refresh attempt';



COMMENT ON COLUMN "public"."oauth_tokens"."refresh_attempts" IS 'Number of refresh attempts since last successful refresh';



CREATE TABLE IF NOT EXISTS "public"."pinned_emails" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email_id" "text" NOT NULL,
    "contact_email" "text" NOT NULL,
    "is_pinned" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pinned_emails" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "deadline" timestamp with time zone,
    "contact" "text",
    "description" "text",
    "display_status" "text" DEFAULT 'upcoming'::"text" NOT NULL,
    "status" "text" DEFAULT 'on-track'::"text" NOT NULL,
    "type" "text" DEFAULT 'task'::"text" NOT NULL,
    "tag" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "priority" "text" DEFAULT 'medium'::"text"
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_activities" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_name" "text" NOT NULL,
    "user_email" "text",
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "activity_type" "text" NOT NULL,
    "entity_id" "text",
    "entity_type" "text",
    "entity_name" "text",
    "field_name" "text",
    "old_value" "jsonb",
    "new_value" "jsonb",
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_pinned" boolean DEFAULT false
);


ALTER TABLE "public"."user_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_activity_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "comment_id" "uuid" NOT NULL,
    "user_activity_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."user_activity_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_api_keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "api_key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "last_used_at" timestamp with time zone,
    "expires_at" timestamp with time zone
);


ALTER TABLE "public"."user_api_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "setting_key" "text" NOT NULL,
    "setting_value" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_settings" IS 'Stores user preferences including grid column configurations, filters, and other settings';



COMMENT ON COLUMN "public"."user_settings"."setting_key" IS 'Key identifier for the setting (e.g., grid_columns, filters)';



COMMENT ON COLUMN "public"."user_settings"."setting_value" IS 'JSONB value containing the setting data';



CREATE TABLE IF NOT EXISTS "public"."zapier_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_used_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."zapier_sessions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_user_id_email_key" UNIQUE ("user_id", "email");



ALTER TABLE ONLY "public"."deleted_contacts"
    ADD CONSTRAINT "deleted_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_accounts"
    ADD CONSTRAINT "email_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_accounts"
    ADD CONSTRAINT "email_accounts_user_id_email_key" UNIQUE ("user_id", "email");



ALTER TABLE ONLY "public"."email_attachments"
    ADD CONSTRAINT "email_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_sync_log"
    ADD CONSTRAINT "email_sync_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."emails"
    ADD CONSTRAINT "emails_gmail_id_key" UNIQUE ("gmail_id");



ALTER TABLE ONLY "public"."emails"
    ADD CONSTRAINT "emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leads_rows"
    ADD CONSTRAINT "leads_rows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leads_rows"
    ADD CONSTRAINT "leads_rows_row_id_key" UNIQUE ("row_id");



ALTER TABLE ONLY "public"."oauth_tokens"
    ADD CONSTRAINT "oauth_tokens_email_account_id_key" UNIQUE ("email_account_id");



ALTER TABLE ONLY "public"."oauth_tokens"
    ADD CONSTRAINT "oauth_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pinned_emails"
    ADD CONSTRAINT "pinned_emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_activities"
    ADD CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_activity_comments"
    ADD CONSTRAINT "user_activity_comments_comment_id_user_activity_id_key" UNIQUE ("comment_id", "user_activity_id");



ALTER TABLE ONLY "public"."user_activity_comments"
    ADD CONSTRAINT "user_activity_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_api_keys"
    ADD CONSTRAINT "user_api_keys_api_key_key" UNIQUE ("api_key");



ALTER TABLE ONLY "public"."user_api_keys"
    ADD CONSTRAINT "user_api_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_setting_key_key" UNIQUE ("user_id", "setting_key");



ALTER TABLE ONLY "public"."zapier_sessions"
    ADD CONSTRAINT "zapier_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zapier_sessions"
    ADD CONSTRAINT "zapier_sessions_session_token_key" UNIQUE ("session_token");



CREATE INDEX "comments_user_id_idx" ON "public"."comments" USING "btree" ("user_id");



CREATE INDEX "contacts_user_id_idx" ON "public"."contacts" USING "btree" ("user_id");



CREATE INDEX "idx_attachments_email_id" ON "public"."email_attachments" USING "btree" ("email_id");



CREATE INDEX "idx_contacts_company_search" ON "public"."contacts" USING "gin" ("to_tsvector"('"english"'::"regconfig", COALESCE("company", ''::"text")));



CREATE INDEX "idx_contacts_email_search" ON "public"."contacts" USING "gin" ("to_tsvector"('"english"'::"regconfig", COALESCE("email", ''::"text")));



CREATE INDEX "idx_contacts_name_search" ON "public"."contacts" USING "gin" ("to_tsvector"('"english"'::"regconfig", COALESCE("name", ''::"text")));



CREATE INDEX "idx_contacts_phone" ON "public"."contacts" USING "btree" ("phone");



CREATE INDEX "idx_contacts_search_fields" ON "public"."contacts" USING "btree" ("user_id", "name", "email", "company", "phone");



CREATE INDEX "idx_contacts_user_created" ON "public"."contacts" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_deleted_contacts_expiry" ON "public"."deleted_contacts" USING "btree" ("expiry_date");



CREATE INDEX "idx_deleted_contacts_user_deleted" ON "public"."deleted_contacts" USING "btree" ("user_id", "deleted_at" DESC);



CREATE INDEX "idx_deleted_contacts_user_id" ON "public"."deleted_contacts" USING "btree" ("user_id");



CREATE INDEX "idx_email_accounts_user_email" ON "public"."email_accounts" USING "btree" ("user_id", "email");



CREATE INDEX "idx_emails_contact_id" ON "public"."emails" USING "btree" ("contact_id");



CREATE INDEX "idx_emails_date" ON "public"."emails" USING "btree" ("date" DESC);



CREATE INDEX "idx_emails_email_account_id" ON "public"."emails" USING "btree" ("email_account_id");



CREATE INDEX "idx_emails_from_email" ON "public"."emails" USING "btree" ("from_email");



CREATE INDEX "idx_emails_gmail_thread_id" ON "public"."emails" USING "btree" ("gmail_thread_id");



CREATE INDEX "idx_emails_user_id" ON "public"."emails" USING "btree" ("user_id");



CREATE INDEX "idx_oauth_tokens_email_account" ON "public"."oauth_tokens" USING "btree" ("email_account_id");



CREATE INDEX "idx_pinned_emails_contact_email" ON "public"."pinned_emails" USING "btree" ("contact_email");



CREATE INDEX "idx_pinned_emails_email_id" ON "public"."pinned_emails" USING "btree" ("email_id");



CREATE UNIQUE INDEX "idx_pinned_emails_unique" ON "public"."pinned_emails" USING "btree" ("user_id", "email_id", "contact_email");



CREATE INDEX "idx_pinned_emails_user_id" ON "public"."pinned_emails" USING "btree" ("user_id");



CREATE INDEX "idx_tasks_contact" ON "public"."tasks" USING "btree" ("contact");



CREATE INDEX "idx_tasks_display_status" ON "public"."tasks" USING "btree" ("display_status");



CREATE INDEX "idx_tasks_user_id" ON "public"."tasks" USING "btree" ("user_id");



CREATE INDEX "idx_user_activities_pinned" ON "public"."user_activities" USING "btree" ("is_pinned", "timestamp" DESC);



CREATE INDEX "idx_user_activities_user_id" ON "public"."user_activities" USING "btree" ("user_id");



CREATE INDEX "idx_user_api_keys_api_key" ON "public"."user_api_keys" USING "btree" ("api_key");



CREATE INDEX "idx_user_api_keys_user_id" ON "public"."user_api_keys" USING "btree" ("user_id");



CREATE INDEX "idx_user_settings_user_id_key" ON "public"."user_settings" USING "btree" ("user_id", "setting_key");



CREATE INDEX "idx_zapier_sessions_expires" ON "public"."zapier_sessions" USING "btree" ("expires_at");



CREATE INDEX "idx_zapier_sessions_token" ON "public"."zapier_sessions" USING "btree" ("session_token");



CREATE INDEX "idx_zapier_sessions_user" ON "public"."zapier_sessions" USING "btree" ("user_id");



CREATE INDEX "tasks_user_id_idx" ON "public"."tasks" USING "btree" ("user_id");



CREATE INDEX "user_activity_comments_comment_id_idx" ON "public"."user_activity_comments" USING "btree" ("comment_id");



CREATE INDEX "user_activity_comments_user_activity_id_idx" ON "public"."user_activity_comments" USING "btree" ("user_activity_id");



CREATE OR REPLACE TRIGGER "update_email_accounts_updated_at" BEFORE UPDATE ON "public"."email_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_emails_updated_at" BEFORE UPDATE ON "public"."emails" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_oauth_tokens_updated_at" BEFORE UPDATE ON "public"."oauth_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_settings_updated_at" BEFORE UPDATE ON "public"."user_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deleted_contacts"
    ADD CONSTRAINT "deleted_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_accounts"
    ADD CONSTRAINT "email_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_attachments"
    ADD CONSTRAINT "email_attachments_email_id_fkey" FOREIGN KEY ("email_id") REFERENCES "public"."emails"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_sync_log"
    ADD CONSTRAINT "email_sync_log_email_account_id_fkey" FOREIGN KEY ("email_account_id") REFERENCES "public"."email_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."emails"
    ADD CONSTRAINT "emails_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."emails"
    ADD CONSTRAINT "emails_email_account_id_fkey" FOREIGN KEY ("email_account_id") REFERENCES "public"."email_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."emails"
    ADD CONSTRAINT "emails_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leads_rows"
    ADD CONSTRAINT "leads_rows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."oauth_tokens"
    ADD CONSTRAINT "oauth_tokens_email_account_id_fkey" FOREIGN KEY ("email_account_id") REFERENCES "public"."email_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."oauth_tokens"
    ADD CONSTRAINT "oauth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pinned_emails"
    ADD CONSTRAINT "pinned_emails_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_activities"
    ADD CONSTRAINT "user_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_activity_comments"
    ADD CONSTRAINT "user_activity_comments_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_activity_comments"
    ADD CONSTRAINT "user_activity_comments_user_activity_id_fkey" FOREIGN KEY ("user_activity_id") REFERENCES "public"."user_activities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_api_keys"
    ADD CONSTRAINT "user_api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."zapier_sessions"
    ADD CONSTRAINT "zapier_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow delete access to leads_rows" ON "public"."leads_rows" FOR DELETE USING (true);



CREATE POLICY "Allow insert access to leads_rows" ON "public"."leads_rows" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow read access to leads_rows" ON "public"."leads_rows" FOR SELECT USING (true);



CREATE POLICY "Allow update access to leads_rows" ON "public"."leads_rows" FOR UPDATE USING (true);



CREATE POLICY "Auth users can access their own contacts" ON "public"."contacts" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Auth users can upsert their own contacts" ON "public"."contacts" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Contacts: user can delete own rows" ON "public"."contacts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Contacts: user can insert own rows" ON "public"."contacts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Contacts: user can select own rows" ON "public"."contacts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Contacts: user can update own rows" ON "public"."contacts" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Service role can access all sessions" ON "public"."zapier_sessions" USING (true);



CREATE POLICY "Service role can manage all tokens" ON "public"."oauth_tokens" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can create tasks" ON "public"."tasks" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own API keys" ON "public"."user_api_keys" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own activities" ON "public"."user_activities" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own tasks" ON "public"."tasks" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete activity comments" ON "public"."user_activity_comments" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."comments" "c"
  WHERE (("c"."id" = "user_activity_comments"."comment_id") AND ("c"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete attachments of own emails" ON "public"."email_attachments" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."emails"
  WHERE (("emails"."id" = "email_attachments"."email_id") AND ("emails"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete own email accounts" ON "public"."email_accounts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own emails" ON "public"."emails" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own tokens" ON "public"."oauth_tokens" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own API keys" ON "public"."user_api_keys" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own activities" ON "public"."user_activities" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own comments" ON "public"."comments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own deleted contacts" ON "public"."deleted_contacts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own pinned emails" ON "public"."pinned_emails" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own sessions" ON "public"."zapier_sessions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own tasks" ON "public"."tasks" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert activity comments" ON "public"."user_activity_comments" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."comments" "c"
  WHERE (("c"."id" = "user_activity_comments"."comment_id") AND ("c"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert attachments for own emails" ON "public"."email_attachments" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."emails"
  WHERE (("emails"."id" = "email_attachments"."email_id") AND ("emails"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert own email accounts" ON "public"."email_accounts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own emails" ON "public"."emails" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own tokens" ON "public"."oauth_tokens" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert sync logs for own accounts" ON "public"."email_sync_log" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."email_accounts"
  WHERE (("email_accounts"."id" = "email_sync_log"."email_account_id") AND ("email_accounts"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert their own comments" ON "public"."comments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own deleted contacts" ON "public"."deleted_contacts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own pinned emails" ON "public"."pinned_emails" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own sessions" ON "public"."zapier_sessions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own settings" ON "public"."user_settings" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update attachments of own emails" ON "public"."email_attachments" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."emails"
  WHERE (("emails"."id" = "email_attachments"."email_id") AND ("emails"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update own email accounts" ON "public"."email_accounts" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own emails" ON "public"."emails" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own tokens" ON "public"."oauth_tokens" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update sync logs for own accounts" ON "public"."email_sync_log" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."email_accounts"
  WHERE (("email_accounts"."id" = "email_sync_log"."email_account_id") AND ("email_accounts"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own API keys" ON "public"."user_api_keys" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own activities" ON "public"."user_activities" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own comments" ON "public"."comments" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own pinned emails" ON "public"."pinned_emails" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own sessions" ON "public"."zapier_sessions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own tasks" ON "public"."tasks" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view activity comments" ON "public"."user_activity_comments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."comments" "c"
  WHERE (("c"."id" = "user_activity_comments"."comment_id") AND ("c"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view attachments of own emails" ON "public"."email_attachments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."emails"
  WHERE (("emails"."id" = "email_attachments"."email_id") AND ("emails"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view comments" ON "public"."comments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own email accounts" ON "public"."email_accounts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own emails" ON "public"."emails" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own sync logs" ON "public"."email_sync_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."email_accounts"
  WHERE (("email_accounts"."id" = "email_sync_log"."email_account_id") AND ("email_accounts"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own tokens" ON "public"."oauth_tokens" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own API keys" ON "public"."user_api_keys" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own activities" ON "public"."user_activities" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own deleted contacts" ON "public"."deleted_contacts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own pinned emails" ON "public"."pinned_emails" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own sessions" ON "public"."zapier_sessions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own tasks" ON "public"."tasks" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."deleted_contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_sync_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."emails" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leads_rows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."oauth_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pinned_emails" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_activity_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_api_keys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zapier_sessions" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_deleted_contacts"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_deleted_contacts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_deleted_contacts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_zapier_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_zapier_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_zapier_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_api_key"("p_user_id" "uuid", "p_api_key" "text", "p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_api_key"("p_user_id" "uuid", "p_api_key" "text", "p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_api_key"("p_user_id" "uuid", "p_api_key" "text", "p_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."restore_deleted_contact"("contact_id_param" "uuid", "user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."restore_deleted_contact"("contact_id_param" "uuid", "user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_deleted_contact"("contact_id_param" "uuid", "user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."soft_delete_contacts"("contact_ids" "uuid"[], "user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."soft_delete_contacts"("contact_ids" "uuid"[], "user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."soft_delete_contacts"("contact_ids" "uuid"[], "user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_api_key_usage"("p_api_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_api_key_usage"("p_api_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_api_key_usage"("p_api_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_comments_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_comments_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_comments_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_api_key"("p_api_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_api_key"("p_api_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_api_key"("p_api_key" "text") TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON TABLE "public"."contacts" TO "anon";
GRANT ALL ON TABLE "public"."contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."contacts" TO "service_role";



GRANT ALL ON TABLE "public"."deleted_contacts" TO "anon";
GRANT ALL ON TABLE "public"."deleted_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."deleted_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."email_accounts" TO "anon";
GRANT ALL ON TABLE "public"."email_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."email_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."email_attachments" TO "anon";
GRANT ALL ON TABLE "public"."email_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."email_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."email_sync_log" TO "anon";
GRANT ALL ON TABLE "public"."email_sync_log" TO "authenticated";
GRANT ALL ON TABLE "public"."email_sync_log" TO "service_role";



GRANT ALL ON TABLE "public"."emails" TO "anon";
GRANT ALL ON TABLE "public"."emails" TO "authenticated";
GRANT ALL ON TABLE "public"."emails" TO "service_role";



GRANT ALL ON TABLE "public"."leads_rows" TO "anon";
GRANT ALL ON TABLE "public"."leads_rows" TO "authenticated";
GRANT ALL ON TABLE "public"."leads_rows" TO "service_role";



GRANT ALL ON TABLE "public"."oauth_tokens" TO "anon";
GRANT ALL ON TABLE "public"."oauth_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."oauth_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."pinned_emails" TO "anon";
GRANT ALL ON TABLE "public"."pinned_emails" TO "authenticated";
GRANT ALL ON TABLE "public"."pinned_emails" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."user_activities" TO "anon";
GRANT ALL ON TABLE "public"."user_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."user_activities" TO "service_role";



GRANT ALL ON TABLE "public"."user_activity_comments" TO "anon";
GRANT ALL ON TABLE "public"."user_activity_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."user_activity_comments" TO "service_role";



GRANT ALL ON TABLE "public"."user_api_keys" TO "anon";
GRANT ALL ON TABLE "public"."user_api_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."user_api_keys" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";



GRANT ALL ON TABLE "public"."zapier_sessions" TO "anon";
GRANT ALL ON TABLE "public"."zapier_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."zapier_sessions" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






RESET ALL;
