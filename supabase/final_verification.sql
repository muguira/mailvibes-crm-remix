

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


CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'Removed auto-organization creation trigger to allow frontend-controlled workflow';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "private"."get_user_organization_ids"("_user_id" "uuid") RETURNS "uuid"[]
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT ARRAY(
    SELECT organization_id
    FROM organization_members
    WHERE user_id = _user_id
  );
$$;


ALTER FUNCTION "private"."get_user_organization_ids"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_organization_member"("_user_id" "uuid", "_organization_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.user_id = _user_id
    AND om.organization_id = _organization_id
  );
$$;


ALTER FUNCTION "private"."is_organization_member"("_user_id" "uuid", "_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_accept_invitation"("p_invitation_id" "uuid", "p_user_id" "uuid") RETURNS TABLE("success" boolean, "organization_id" "uuid", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_invitation RECORD;
    v_org_id UUID;
    v_existing_member UUID;
    v_user_email TEXT;
BEGIN
    -- Debug logging
    RAISE NOTICE 'auto_accept_invitation called with invitation_id: %, user_id: %', p_invitation_id, p_user_id;
    
    -- Get user email
    SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
    
    -- Get invitation details
    SELECT 
        oi.id,
        oi.email,
        oi.role,
        oi.status,
        oi.organization_id,
        oi.expires_at
    INTO v_invitation
    FROM organization_invitations oi
    WHERE oi.id = p_invitation_id
    AND COALESCE(oi.status, 'pending') = 'pending'
    AND oi.expires_at > NOW();

    IF v_invitation IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Invitation not found, expired, or already processed'::TEXT;
        RETURN;
    END IF;

    -- Verify email matches
    IF LOWER(TRIM(v_user_email)) != LOWER(TRIM(v_invitation.email)) THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 
            format('Email mismatch: invitation for %s but user is %s', v_invitation.email, COALESCE(v_user_email, 'unknown'))::TEXT;
        RETURN;
    END IF;

    v_org_id := v_invitation.organization_id;

    -- Check if user is already a member of this organization
    SELECT om.user_id INTO v_existing_member
    FROM organization_members om
    WHERE om.user_id = p_user_id
    AND om.organization_id = v_org_id;

    IF v_existing_member IS NOT NULL THEN
        -- User is already a member, just mark invitation as accepted
        UPDATE organization_invitations
        SET status = 'accepted',
            accepted_at = NOW(),
            updated_at = NOW()
        WHERE id = p_invitation_id;

        RETURN QUERY SELECT TRUE, v_org_id, 'Already a member - invitation marked as accepted'::TEXT;
        RETURN;
    END IF;

    -- Create organization member (user is not already a member)
    INSERT INTO organization_members (
        user_id,
        organization_id,
        role,
        status,
        joined_at,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        v_org_id,
        v_invitation.role::TEXT,
        'active',
        NOW(),
        NOW(),
        NOW()
    );

    -- Update user's profile to set current organization
    INSERT INTO profiles (id, current_organization_id)
    VALUES (p_user_id, v_org_id)
    ON CONFLICT (id) DO UPDATE SET
        current_organization_id = v_org_id,
        updated_at = NOW();

    -- Mark invitation as accepted
    UPDATE organization_invitations
    SET status = 'accepted',
        accepted_at = NOW(),
        updated_at = NOW()
    WHERE id = p_invitation_id;

    -- Update organization member count
    UPDATE organizations
    SET member_count = (
        SELECT COUNT(*)
        FROM organization_members om
        WHERE om.organization_id = v_org_id
        AND om.status = 'active'
    ),
    updated_at = NOW()
    WHERE id = v_org_id;

    RETURN QUERY SELECT TRUE, v_org_id, 'Successfully joined organization'::TEXT;
    
EXCEPTION
    WHEN unique_violation THEN
        -- Handle the case where membership was created between our check and insert
        UPDATE organization_invitations
        SET status = 'accepted',
            accepted_at = NOW(),
            updated_at = NOW()
        WHERE id = p_invitation_id;
        
        RETURN QUERY SELECT TRUE, v_org_id, 'Membership already exists - invitation accepted'::TEXT;
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in auto_accept_invitation: %', SQLERRM;
        RETURN QUERY SELECT FALSE, NULL::UUID, ('Error: ' || SQLERRM)::TEXT;
END;
$$;


ALTER FUNCTION "public"."auto_accept_invitation"("p_invitation_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_organization_invitation"("p_invitation_id" "uuid") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_invitation RECORD;
    v_user_role TEXT;
    v_deleted_count INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    SELECT * INTO v_invitation FROM organization_invitations WHERE id = p_invitation_id;
    
    IF v_invitation IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Invitation not found'::TEXT;
        RETURN;
    END IF;
    
    SELECT om.role INTO v_user_role
    FROM organization_members om
    WHERE om.user_id = v_user_id AND om.organization_id = v_invitation.organization_id;
    
    IF v_user_role != 'admin' THEN
        RETURN QUERY SELECT FALSE, 'Only administrators can cancel invitations'::TEXT;
        RETURN;
    END IF;
    
    DELETE FROM organization_invitations WHERE id = p_invitation_id;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    IF v_deleted_count > 0 THEN
        RETURN QUERY SELECT TRUE, 'Invitation canceled successfully'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, 'Failed to cancel invitation'::TEXT;
    END IF;
END;
$$;


ALTER FUNCTION "public"."cancel_organization_invitation"("p_invitation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_user_organization"("p_user_id" "uuid") RETURNS TABLE("has_organization" boolean, "organization_id" "uuid", "current_organization" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN om.organization_id IS NOT NULL OR p.current_organization IS NOT NULL THEN true
      ELSE false
    END as has_organization,
    om.organization_id,
    p.current_organization
  FROM auth.users u
  LEFT JOIN profiles p ON u.id = p.id
  LEFT JOIN organization_members om ON u.id = om.user_id
  WHERE u.id = p_user_id
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."check_user_organization"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clean_orphaned_invitations"("p_organization_id" "uuid") RETURNS TABLE("cleaned_count" integer, "emails_cleaned" "text"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_user_role TEXT;
    v_cleaned_count INTEGER := 0;
    v_emails_cleaned TEXT[] := ARRAY[]::TEXT[];
    v_invitation RECORD;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Check if user is admin of the organization
    SELECT role INTO v_user_role
    FROM organization_members
    WHERE user_id = v_user_id
    AND organization_id = p_organization_id;
    
    IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'User is not a member of this organization';
    END IF;
    
    IF v_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can clean up invitations';
    END IF;
    
    -- Find and clean orphaned invitations
    FOR v_invitation IN
        SELECT oi.id, oi.email
        FROM organization_invitations oi
        WHERE oi.organization_id = p_organization_id
        AND oi.status = 'pending'
        AND NOT EXISTS (
            SELECT 1 FROM organization_members om
            JOIN auth.users u ON om.user_id = u.id
            WHERE om.organization_id = oi.organization_id
            AND u.email = oi.email
        )
    LOOP
        -- Delete the orphaned invitation
        DELETE FROM organization_invitations 
        WHERE id = v_invitation.id;
        
        v_cleaned_count := v_cleaned_count + 1;
        v_emails_cleaned := array_append(v_emails_cleaned, v_invitation.email);
    END LOOP;
    
    RETURN QUERY SELECT v_cleaned_count, v_emails_cleaned;
END;
$$;


ALTER FUNCTION "public"."clean_orphaned_invitations"("p_organization_id" "uuid") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."count_unique_jsonb_field_values"("p_user_id" "uuid", "p_field_name" "text") RETURNS bigint
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  result_count BIGINT;
BEGIN
  SELECT COUNT(DISTINCT(data->>p_field_name))
  INTO result_count
  FROM contacts 
  WHERE 
    user_id = p_user_id 
    AND data IS NOT NULL 
    AND data->>p_field_name IS NOT NULL 
    AND TRIM(data->>p_field_name) != '';
    
  RETURN result_count;
END;
$$;


ALTER FUNCTION "public"."count_unique_jsonb_field_values"("p_user_id" "uuid", "p_field_name" "text") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."debug_user_org_role"("p_user_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("user_id" "uuid", "org_id" "uuid", "role" "text", "status" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        om.user_id,
        om.organization_id,
        om.role,
        om.status,
        om.created_at
    FROM organization_members om
    WHERE om.user_id = p_user_id
    AND om.organization_id = p_org_id;
END;
$$;


ALTER FUNCTION "public"."debug_user_org_role"("p_user_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_organization_member"("p_member_id" "uuid", "p_organization_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_admin_user_id UUID;
    v_target_user_id UUID;
    v_admin_count INTEGER;
BEGIN
    -- Get the current user
    v_admin_user_id := auth.uid();
    
    -- Verify the admin user is actually an admin of this organization
    IF NOT EXISTS (
        SELECT 1 
        FROM organization_members
        WHERE user_id = v_admin_user_id
        AND organization_id = p_organization_id
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only organization admins can delete members';
    END IF;
    
    -- Get the target user ID
    SELECT user_id INTO v_target_user_id
    FROM organization_members
    WHERE id = p_member_id
    AND organization_id = p_organization_id;
    
    IF v_target_user_id IS NULL THEN
        RAISE EXCEPTION 'Member not found in organization';
    END IF;
    
    -- Prevent admin from deleting themselves
    IF v_target_user_id = v_admin_user_id THEN
        RAISE EXCEPTION 'Cannot delete yourself from the organization';
    END IF;
    
    -- Check if we're deleting the last admin
    SELECT COUNT(*) INTO v_admin_count
    FROM organization_members
    WHERE organization_id = p_organization_id
    AND role = 'admin'
    AND user_id != v_target_user_id; -- Exclude the member being deleted
    
    IF v_admin_count = 0 THEN
        -- Check if the member being deleted is an admin
        IF EXISTS (
            SELECT 1 FROM organization_members
            WHERE id = p_member_id AND role = 'admin'
        ) THEN
            RAISE EXCEPTION 'Cannot delete the last admin of the organization';
        END IF;
    END IF;
    
    -- Perform the deletion
    DELETE FROM organization_members
    WHERE id = p_member_id
    AND organization_id = p_organization_id;
    
    -- Update organization member count
    UPDATE organizations
    SET member_count = (
        SELECT COUNT(*)
        FROM organization_members
        WHERE organization_id = p_organization_id
        AND status = 'active'
    ),
    updated_at = NOW()
    WHERE id = p_organization_id;
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."delete_organization_member"("p_member_id" "uuid", "p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_invitation_details_public"("p_token_or_id" "text") RETURNS TABLE("id" "uuid", "email" "text", "role" "text", "status" "text", "expires_at" timestamp with time zone, "organization_id" "uuid", "organization_name" "text", "invited_by" "uuid", "inviter_email" "text", "inviter_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- This function can be called by anyone (no auth required)
    -- to get basic invitation details for the acceptance flow
    
    RETURN QUERY
    SELECT 
        oi.id,
        oi.email::TEXT,
        oi.role::TEXT,
        COALESCE(oi.status, 'pending')::TEXT,
        oi.expires_at,
        oi.organization_id,
        o.name::TEXT as organization_name,
        oi.invited_by,
        COALESCE(au.email, 'team@company.com')::TEXT as inviter_email,
        COALESCE(
            TRIM(CONCAT(
                COALESCE(au.raw_user_meta_data->>'first_name', ''),
                ' ',
                COALESCE(au.raw_user_meta_data->>'last_name', '')
            )),
            au.email,
            'Team Member'
        )::TEXT as inviter_name
    FROM organization_invitations oi
    JOIN organizations o ON oi.organization_id = o.id
    LEFT JOIN auth.users au ON oi.invited_by = au.id
    WHERE (
        (oi.id::TEXT = p_token_or_id) OR 
        (oi.token = p_token_or_id)
    )
    AND COALESCE(oi.status, 'pending') = 'pending'
    AND oi.expires_at > NOW()
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_invitation_details_public"("p_token_or_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_organization_details_safe"("p_org_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "domain" "text", "plan" "text", "member_count" integer, "max_members" integer, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    -- Return empty if no user
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Only allow if user is a member of this organization
    IF NOT is_organization_member(p_org_id, v_user_id) THEN
        RETURN; -- Return empty result set
    END IF;
    
    RETURN QUERY
    SELECT 
        o.id,
        o.name::TEXT,
        o.domain::TEXT,
        COALESCE(o.plan, 'free')::TEXT,
        COALESCE(o.member_count, 1),
        COALESCE(o.max_members, 25),
        o.created_at,
        o.updated_at
    FROM organizations o
    WHERE o.id = p_org_id;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and return empty set
        RAISE WARNING 'Error in get_organization_details_safe: %', SQLERRM;
        RETURN;
END;
$$;


ALTER FUNCTION "public"."get_organization_details_safe"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_organization_invitations_safe"("p_org_id" "uuid") RETURNS TABLE("id" "uuid", "organization_id" "uuid", "email" "text", "role" "text", "status" "text", "invited_by" "uuid", "expires_at" timestamp with time zone, "accepted_at" timestamp with time zone, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "token" "text", "inviter_email" "text", "inviter_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_user_role TEXT;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    -- Check if user is admin of this organization
    SELECT CAST(om.role AS TEXT) INTO v_user_role
    FROM organization_members om
    WHERE om.user_id = v_user_id 
    AND om.organization_id = p_org_id;
    
    -- Only admins can view invitations
    IF v_user_role != 'admin' THEN
        RETURN; -- Return empty result set
    END IF;
    
    RETURN QUERY
    SELECT 
        oi.id,
        oi.organization_id,
        CAST(oi.email AS TEXT),
        CAST(oi.role AS TEXT),
        CAST(COALESCE(oi.status, 'pending') AS TEXT),
        oi.invited_by,
        oi.expires_at,
        oi.accepted_at,
        oi.created_at,
        oi.updated_at,
        CAST(COALESCE(oi.token, '') AS TEXT),
        CAST(COALESCE(au.email, 'team@company.com') AS TEXT) as inviter_email,
        CAST(COALESCE(
            TRIM(CONCAT(
                COALESCE(au.raw_user_meta_data->>'first_name', ''),
                ' ',
                COALESCE(au.raw_user_meta_data->>'last_name', '')
            )),
            au.email,
            'Team Member'
        ) AS TEXT) as inviter_name
    FROM organization_invitations oi
    LEFT JOIN auth.users au ON oi.invited_by = au.id
    WHERE oi.organization_id = p_org_id
    AND CAST(COALESCE(oi.status, 'pending') AS TEXT) = 'pending'
    ORDER BY oi.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_organization_invitations_safe"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_organization_members_safe"("p_org_id" "uuid") RETURNS TABLE("id" "uuid", "user_id" "uuid", "organization_id" "uuid", "role" "text", "status" "text", "invited_by" "uuid", "joined_at" timestamp with time zone, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "user_email" "text", "user_first_name" "text", "user_last_name" "text", "user_avatar_url" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    -- Return empty if no user
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Only allow if user is a member of this organization
    IF NOT is_organization_member(p_org_id, v_user_id) THEN
        RETURN; -- Return empty result set
    END IF;
    
    RETURN QUERY
    SELECT 
        om.id,
        om.user_id,
        om.organization_id,
        COALESCE(om.role, 'member')::TEXT,
        COALESCE(om.status, 'active')::TEXT,
        om.invited_by,
        COALESCE(om.joined_at, om.created_at) as joined_at,
        om.created_at,
        om.updated_at,
        COALESCE(au.email, '')::TEXT as user_email,
        COALESCE(au.raw_user_meta_data->>'first_name', '')::TEXT as user_first_name,
        COALESCE(au.raw_user_meta_data->>'last_name', '')::TEXT as user_last_name,
        COALESCE(au.raw_user_meta_data->>'avatar_url', '')::TEXT as user_avatar_url
    FROM organization_members om
    LEFT JOIN auth.users au ON om.user_id = au.id
    WHERE om.organization_id = p_org_id
    ORDER BY om.created_at ASC;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and return empty set
        RAISE WARNING 'Error in get_organization_members_safe: %', SQLERRM;
        RETURN;
END;
$$;


ALTER FUNCTION "public"."get_organization_members_safe"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pending_invitations_for_email"("p_email" "text") RETURNS TABLE("id" "uuid", "organization_id" "uuid", "role" "text", "invited_by" "uuid", "expires_at" timestamp with time zone, "organization_name" "text", "organization_domain" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT 
        oi.id,
        oi.organization_id,
        oi.role::TEXT,
        oi.invited_by,
        oi.expires_at,
        o.name::TEXT as organization_name,
        o.domain::TEXT as organization_domain
    FROM organization_invitations oi
    JOIN organizations o ON o.id = oi.organization_id
    WHERE LOWER(TRIM(oi.email)) = LOWER(TRIM(p_email))
    AND COALESCE(oi.status, 'pending') = 'pending'
    AND oi.expires_at > NOW()
    ORDER BY oi.created_at DESC;
$$;


ALTER FUNCTION "public"."get_pending_invitations_for_email"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_unique_jsonb_field_values"("p_user_id" "uuid", "p_field_name" "text", "p_limit" integer DEFAULT 100) RETURNS TABLE("value" "text", "count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DISTINCT(data->>p_field_name)::TEXT as value,
    COUNT(*)::BIGINT as count
  FROM contacts 
  WHERE 
    user_id = p_user_id 
    AND data IS NOT NULL 
    AND data->>p_field_name IS NOT NULL 
    AND TRIM(data->>p_field_name) != ''
  GROUP BY data->>p_field_name
  ORDER BY value
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_unique_jsonb_field_values"("p_user_id" "uuid", "p_field_name" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_organization"("p_user_id" "uuid") RETURNS TABLE("organization_id" "uuid", "role" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    om.organization_id,
    om.role::TEXT
  FROM organization_members om
  WHERE om.user_id = p_user_id
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_user_organization"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_organization_safe"("p_user_id" "uuid") RETURNS TABLE("organization_id" "uuid", "role" "text", "status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Return empty if no user
    IF p_user_id IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        om.organization_id,
        COALESCE(om.role, 'member')::TEXT,
        COALESCE(om.status, 'active')::TEXT
    FROM organization_members om
    WHERE om.user_id = p_user_id
    LIMIT 1;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and return empty set
        RAISE WARNING 'Error in get_user_organization_safe: %', SQLERRM;
        RETURN;
END;
$$;


ALTER FUNCTION "public"."get_user_organization_safe"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_invitation_acceptance"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
  v_existing_member BOOLEAN;
BEGIN
  -- Only process if invitation was just accepted (accepted_at changed from NULL)
  IF NEW.accepted_at IS NOT NULL AND OLD.accepted_at IS NULL THEN
    -- Get the user ID based on the email
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = NEW.email
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'User not found for email: %', NEW.email;
    END IF;
    
    -- Check if user is already a member
    SELECT EXISTS(
      SELECT 1 FROM organization_members
      WHERE organization_id = NEW.organization_id
      AND user_id = v_user_id
    ) INTO v_existing_member;
    
    IF NOT v_existing_member THEN
      -- Add user to organization with invited role
      INSERT INTO organization_members (organization_id, user_id, role)
      VALUES (NEW.organization_id, v_user_id, NEW.role);
      
      -- Update user's current organization if they don't have one
      UPDATE profiles
      SET current_organization_id = NEW.organization_id
      WHERE id = v_user_id
      AND current_organization_id IS NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_invitation_acceptance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_minimal"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Create organization
  INSERT INTO organizations (name)
  VALUES (NEW.email || '''s Organization')
  RETURNING id INTO new_org_id;
  
  -- Create profile
  INSERT INTO profiles (id, email, current_organization_id)
  VALUES (NEW.id, NEW.email, new_org_id);
  
  -- Add user as admin member
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'admin');
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user_minimal"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_profile_only"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Only create user profile, no organization logic
  INSERT INTO public.profiles (id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail user creation
  RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user_profile_only"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_organization"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_has_org BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 
    FROM organization_members 
    WHERE user_id = p_user_id
  ) INTO v_has_org;
  
  RETURN v_has_org;
END;
$$;


ALTER FUNCTION "public"."has_organization"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_organization_member"("p_org_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM organization_members 
        WHERE organization_id = p_org_id 
        AND user_id = p_user_id
    );
END;
$$;


ALTER FUNCTION "public"."is_organization_member"("p_org_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resend_organization_invitation"("p_invitation_id" "uuid") RETURNS TABLE("success" boolean, "invitation_id" "uuid", "new_expires_at" timestamp with time zone, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_invitation RECORD;
    v_user_role TEXT;
    v_new_expires_at TIMESTAMPTZ;
    v_updated_count INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    SELECT * INTO v_invitation FROM organization_invitations WHERE id = p_invitation_id;
    
    IF v_invitation IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TIMESTAMPTZ, 'Invitation not found'::TEXT;
        RETURN;
    END IF;
    
    SELECT om.role INTO v_user_role
    FROM organization_members om
    WHERE om.user_id = v_user_id AND om.organization_id = v_invitation.organization_id;
    
    IF v_user_role != 'admin' THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TIMESTAMPTZ, 'Only administrators can resend invitations'::TEXT;
        RETURN;
    END IF;
    
    v_new_expires_at := NOW() + INTERVAL '7 days';
    
    UPDATE organization_invitations
    SET expires_at = v_new_expires_at, updated_at = NOW(), status = 'pending'
    WHERE id = p_invitation_id;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    IF v_updated_count > 0 THEN
        RETURN QUERY SELECT TRUE, p_invitation_id, v_new_expires_at, 'Invitation resent successfully'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TIMESTAMPTZ, 'Failed to update invitation'::TEXT;
    END IF;
END;
$$;


ALTER FUNCTION "public"."resend_organization_invitation"("p_invitation_id" "uuid") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."send_organization_invitations"("p_organization_id" "uuid", "p_emails" "text"[], "p_role" "text", "p_message" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "organization_id" "uuid", "email" character varying, "role" character varying, "status" character varying, "invited_by" "uuid", "expires_at" timestamp with time zone, "created_at" timestamp with time zone, "token" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_user_role TEXT;
    v_expires_at TIMESTAMPTZ;
    v_email TEXT;
    v_token TEXT;
    v_existing_invitation UUID;
    v_invitation_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    SELECT om.role INTO v_user_role
    FROM organization_members om
    WHERE om.organization_id = p_organization_id
    AND om.user_id = v_user_id;
    
    IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'User is not a member of this organization';
    END IF;
    
    IF v_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can invite users';
    END IF;
    
    v_expires_at := NOW() + INTERVAL '7 days';
    
    -- Create temp table to collect results
    CREATE TEMP TABLE temp_invitations (
        id UUID,
        organization_id UUID,
        email VARCHAR,
        role VARCHAR,
        status VARCHAR,
        invited_by UUID,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ,
        token VARCHAR
    ) ON COMMIT DROP;
    
    FOR i IN 1..array_length(p_emails, 1) LOOP
        v_email := LOWER(TRIM(p_emails[i]));
        v_token := gen_random_uuid()::TEXT;
        
        -- Check for existing pending invitation
        SELECT oi.id INTO v_existing_invitation
        FROM organization_invitations oi
        WHERE oi.organization_id = p_organization_id
        AND oi.email = v_email
        AND oi.status = 'pending';
        
        IF v_existing_invitation IS NOT NULL THEN
            -- Update existing invitation
            UPDATE organization_invitations
            SET expires_at = v_expires_at,
                role = p_role,
                invited_by = v_user_id,
                token = v_token,
                updated_at = NOW()
            WHERE id = v_existing_invitation
            RETURNING id INTO v_invitation_id;
        ELSE
            -- Check for any existing invitation (even non-pending)
            SELECT oi.id INTO v_existing_invitation
            FROM organization_invitations oi
            WHERE oi.organization_id = p_organization_id
            AND oi.email = v_email;
            
            IF v_existing_invitation IS NOT NULL THEN
                -- Update the existing invitation to pending
                UPDATE organization_invitations
                SET status = 'pending',
                    expires_at = v_expires_at,
                    role = p_role,
                    invited_by = v_user_id,
                    token = v_token,
                    updated_at = NOW()
                WHERE id = v_existing_invitation
                RETURNING id INTO v_invitation_id;
            ELSE
                -- Create new invitation
                INSERT INTO organization_invitations (
                    organization_id, email, role, status, invited_by,
                    expires_at, token, created_at, updated_at
                ) VALUES (
                    p_organization_id, v_email, p_role, 'pending', v_user_id,
                    v_expires_at, v_token, NOW(), NOW()
                )
                RETURNING id INTO v_invitation_id;
            END IF;
        END IF;
        
        -- Add to temp table
        INSERT INTO temp_invitations
        SELECT 
            oi.id, oi.organization_id, oi.email, oi.role, oi.status,
            oi.invited_by, oi.expires_at, oi.created_at, oi.token
        FROM organization_invitations oi
        WHERE oi.id = v_invitation_id;
    END LOOP;
    
    -- Return all processed invitations
    RETURN QUERY SELECT * FROM temp_invitations;
END;
$$;


ALTER FUNCTION "public"."send_organization_invitations"("p_organization_id" "uuid", "p_emails" "text"[], "p_role" "text", "p_message" "text") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."update_opportunities_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_opportunities_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_organization_member_role"("p_member_id" "uuid", "p_organization_id" "uuid", "p_new_role" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_admin_user_id UUID;
    v_target_user_id UUID;
    v_current_role TEXT;
BEGIN
    -- Get the current user
    v_admin_user_id := auth.uid();
    
    -- Verify the admin user is actually an admin of this organization
    IF NOT EXISTS (
        SELECT 1 
        FROM organization_members
        WHERE user_id = v_admin_user_id
        AND organization_id = p_organization_id
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only organization admins can update member roles';
    END IF;
    
    -- Validate the new role
    IF p_new_role NOT IN ('admin', 'user') THEN
        RAISE EXCEPTION 'Invalid role. Must be either admin or user';
    END IF;
    
    -- Get the target member info
    SELECT user_id, role INTO v_target_user_id, v_current_role
    FROM organization_members
    WHERE id = p_member_id
    AND organization_id = p_organization_id;
    
    IF v_target_user_id IS NULL THEN
        RAISE EXCEPTION 'Member not found in organization';
    END IF;
    
    -- Don't allow changing your own role from admin to user if you're the last admin
    IF v_target_user_id = v_admin_user_id 
       AND v_current_role = 'admin' 
       AND p_new_role = 'user' THEN
        
        -- Check if this user is the last admin
        IF (SELECT COUNT(*) FROM organization_members 
            WHERE organization_id = p_organization_id 
            AND role = 'admin' 
            AND user_id != v_target_user_id) = 0 THEN
            RAISE EXCEPTION 'Cannot demote yourself from admin - you are the last admin';
        END IF;
    END IF;
    
    -- Perform the role update
    UPDATE organization_members
    SET role = p_new_role,
        updated_at = NOW()
    WHERE id = p_member_id
    AND organization_id = p_organization_id;
    
    -- Update organization's updated_at timestamp
    UPDATE organizations
    SET updated_at = NOW()
    WHERE id = p_organization_id;
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."update_organization_member_role"("p_member_id" "uuid", "p_organization_id" "uuid", "p_new_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_organization_name"("p_organization_id" "uuid", "p_new_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_user_role TEXT;
    v_updated_count INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    IF p_new_name IS NULL OR TRIM(p_new_name) = '' THEN
        RAISE EXCEPTION 'Organization name cannot be empty';
    END IF;
    
    SELECT om.role INTO v_user_role
    FROM organization_members om
    WHERE om.user_id = v_user_id
    AND om.organization_id = p_organization_id;
    
    IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'User is not a member of this organization';
    END IF;
    
    IF v_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can update organization name';
    END IF;
    
    UPDATE organizations
    SET name = TRIM(p_new_name), updated_at = NOW()
    WHERE id = p_organization_id;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RETURN v_updated_count > 0;
END;
$$;


ALTER FUNCTION "public"."update_organization_name"("p_organization_id" "uuid", "p_new_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_needs_organization"("p_user_id" "uuid") RETURNS TABLE("needs_org" boolean, "has_pending_invitation" boolean, "user_email" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_email TEXT;
    v_has_org BOOLEAN := FALSE;
    v_has_pending BOOLEAN := FALSE;
BEGIN
    -- Get user email
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = p_user_id;

    IF v_user_email IS NULL THEN
        RETURN QUERY SELECT TRUE, FALSE, NULL::TEXT;
        RETURN;
    END IF;

    -- Check if user has an organization
    SELECT EXISTS(
        SELECT 1
        FROM organization_members
        WHERE user_id = p_user_id
    ) INTO v_has_org;

    -- Check if user has pending invitations
    SELECT EXISTS(
        SELECT 1
        FROM organization_invitations
        WHERE email = v_user_email
        AND status = 'pending'
        AND expires_at > NOW()
    ) INTO v_has_pending;

    -- User needs organization if they don't have one AND don't have pending invitations
    RETURN QUERY SELECT (NOT v_has_org AND NOT v_has_pending), v_has_pending, v_user_email;
END;
$$;


ALTER FUNCTION "public"."user_needs_organization"("p_user_id" "uuid") OWNER TO "postgres";


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
    "last_history_id" "text",
    CONSTRAINT "email_accounts_provider_check" CHECK ((("provider")::"text" = ANY (ARRAY[('gmail'::character varying)::"text", ('outlook'::character varying)::"text", ('other'::character varying)::"text"])))
);


ALTER TABLE "public"."email_accounts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."email_accounts"."last_history_id" IS 'Latest Gmail History ID for this account. Used to determine starting point for incremental sync.';



CREATE TABLE IF NOT EXISTS "public"."email_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email_id" "uuid" NOT NULL,
    "gmail_attachment_id" character varying(500),
    "filename" character varying(1000) NOT NULL,
    "mime_type" character varying(500),
    "size_bytes" bigint,
    "inline" boolean DEFAULT false,
    "content_id" character varying(500),
    "storage_path" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_attachments" OWNER TO "postgres";


COMMENT ON TABLE "public"."email_attachments" IS 'Email attachments table with increased varchar limits (manual fix applied 2025-07-18)';



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
    "created_at" timestamp with time zone DEFAULT "now"(),
    "gmail_history_id" "text"
);


ALTER TABLE "public"."email_sync_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."email_sync_log" IS 'RLS permanently disabled - chosen solution for this private CRM system for optimal reliability and performance';



COMMENT ON COLUMN "public"."email_sync_log"."gmail_history_id" IS 'Gmail History ID returned by Gmail API after sync operation. Used for incremental sync.';



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
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "message_id" "text"
);


ALTER TABLE "public"."emails" OWNER TO "postgres";


COMMENT ON TABLE "public"."emails" IS 'RLS permanently disabled - chosen solution for this private CRM system for optimal reliability and performance';



COMMENT ON COLUMN "public"."emails"."message_id" IS 'RFC 2822 Message-ID header value for proper email threading';



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



CREATE TABLE IF NOT EXISTS "public"."opportunities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "opportunity" "text" NOT NULL,
    "status" "text" DEFAULT 'Discovered'::"text" NOT NULL,
    "revenue" numeric(12,2),
    "revenue_display" "text",
    "close_date" "date",
    "owner" "text",
    "website" "text",
    "company_name" "text",
    "company_linkedin" "text",
    "employees" integer,
    "last_contacted" "date",
    "next_meeting" "date",
    "lead_source" "text",
    "priority" "text" DEFAULT 'Medium'::"text",
    "original_contact_id" "text",
    "converted_at" timestamp with time zone DEFAULT "now"(),
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid" NOT NULL,
    CONSTRAINT "opportunities_priority_check" CHECK (("priority" = ANY (ARRAY['High'::"text", 'Medium'::"text", 'Low'::"text"])))
);


ALTER TABLE "public"."opportunities" OWNER TO "postgres";


COMMENT ON TABLE "public"."opportunities" IS 'Stores sales opportunities with pipeline stage tracking';



COMMENT ON COLUMN "public"."opportunities"."status" IS 'Pipeline stage: Discovered, Qualified, Contract Sent, In Procurement, Deal Won, Not Now';



COMMENT ON COLUMN "public"."opportunities"."organization_id" IS 'Organization ID for multi-tenant access. All organization members can view and manage these opportunities.';



CREATE TABLE IF NOT EXISTS "public"."organization_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'user'::character varying NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "status" "text" DEFAULT 'pending'::character varying,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "organization_invitations_role_check" CHECK (("role" = ANY (ARRAY[('admin'::character varying)::"text", ('user'::character varying)::"text"])))
);


ALTER TABLE "public"."organization_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'user'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'active'::"text",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "invited_by" "uuid",
    CONSTRAINT "organization_members_role_check" CHECK (("role" = ANY (ARRAY[('admin'::character varying)::"text", ('user'::character varying)::"text"])))
);


ALTER TABLE "public"."organization_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "domain" "text",
    "plan" "text" DEFAULT 'starter'::"text",
    "member_count" integer DEFAULT 1,
    "max_members" integer DEFAULT 5
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


COMMENT ON TABLE "public"."organizations" IS 'Organizations table with RLS policies allowing authenticated users to create orgs and admins to manage them';



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


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "avatar_url" "text",
    "current_organization_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "current_organization" "uuid"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


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



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_user_id_key" UNIQUE ("organization_id", "user_id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_domain_unique" UNIQUE ("domain");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pinned_emails"
    ADD CONSTRAINT "pinned_emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "unique_pending_invitation" UNIQUE ("organization_id", "email");



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



CREATE INDEX "idx_contacts_company" ON "public"."contacts" USING "btree" ((("data" ->> 'company'::"text"))) WHERE (("data" ->> 'company'::"text") IS NOT NULL);



CREATE INDEX "idx_contacts_company_search" ON "public"."contacts" USING "gin" ("to_tsvector"('"english"'::"regconfig", COALESCE("company", ''::"text")));



CREATE INDEX "idx_contacts_data_gin" ON "public"."contacts" USING "gin" ("data");



CREATE INDEX "idx_contacts_email_search" ON "public"."contacts" USING "gin" ("to_tsvector"('"english"'::"regconfig", COALESCE("email", ''::"text")));



CREATE INDEX "idx_contacts_industry" ON "public"."contacts" USING "btree" ((("data" ->> 'industry'::"text"))) WHERE (("data" ->> 'industry'::"text") IS NOT NULL);



CREATE INDEX "idx_contacts_job_title" ON "public"."contacts" USING "btree" ((("data" ->> 'jobTitle'::"text"))) WHERE (("data" ->> 'jobTitle'::"text") IS NOT NULL);



CREATE INDEX "idx_contacts_name_search" ON "public"."contacts" USING "gin" ("to_tsvector"('"english"'::"regconfig", COALESCE("name", ''::"text")));



CREATE INDEX "idx_contacts_phone" ON "public"."contacts" USING "btree" ("phone");



CREATE INDEX "idx_contacts_search_fields" ON "public"."contacts" USING "btree" ("user_id", "name", "email", "company", "phone");



CREATE INDEX "idx_contacts_source" ON "public"."contacts" USING "btree" ((("data" ->> 'source'::"text"))) WHERE (("data" ->> 'source'::"text") IS NOT NULL);



CREATE INDEX "idx_contacts_user_created" ON "public"."contacts" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_deleted_contacts_expiry" ON "public"."deleted_contacts" USING "btree" ("expiry_date");



CREATE INDEX "idx_deleted_contacts_user_deleted" ON "public"."deleted_contacts" USING "btree" ("user_id", "deleted_at" DESC);



CREATE INDEX "idx_deleted_contacts_user_id" ON "public"."deleted_contacts" USING "btree" ("user_id");



CREATE INDEX "idx_email_accounts_history_id" ON "public"."email_accounts" USING "btree" ("last_history_id");



CREATE INDEX "idx_email_accounts_user_email" ON "public"."email_accounts" USING "btree" ("user_id", "email");



CREATE UNIQUE INDEX "idx_email_attachments_email_gmail_unique" ON "public"."email_attachments" USING "btree" ("email_id", "gmail_attachment_id") WHERE ("gmail_attachment_id" IS NOT NULL);



COMMENT ON INDEX "public"."idx_email_attachments_email_gmail_unique" IS 'Prevents duplicate Gmail attachments for the same email';



CREATE UNIQUE INDEX "idx_email_attachments_gmail_id_unique" ON "public"."email_attachments" USING "btree" ("gmail_attachment_id") WHERE ("gmail_attachment_id" IS NOT NULL);



COMMENT ON INDEX "public"."idx_email_attachments_gmail_id_unique" IS 'Ensures gmail_attachment_id is unique when not null, allowing UPSERT operations';



CREATE INDEX "idx_email_attachments_storage_path" ON "public"."email_attachments" USING "btree" ("storage_path") WHERE ("storage_path" IS NOT NULL);



CREATE INDEX "idx_email_sync_log_contact_completed" ON "public"."email_sync_log" USING "btree" ((("metadata" ->> 'contact_email'::"text")), "completed_at" DESC) WHERE (("status")::"text" = 'completed'::"text");



CREATE INDEX "idx_email_sync_log_contact_lookup" ON "public"."email_sync_log" USING "btree" ("email_account_id", "completed_at" DESC) WHERE (("status")::"text" = 'completed'::"text");



CREATE INDEX "idx_email_sync_log_history_id" ON "public"."email_sync_log" USING "btree" ("gmail_history_id");



CREATE INDEX "idx_emails_contact_id" ON "public"."emails" USING "btree" ("contact_id");



CREATE INDEX "idx_emails_date" ON "public"."emails" USING "btree" ("date" DESC);



CREATE INDEX "idx_emails_email_account_id" ON "public"."emails" USING "btree" ("email_account_id");



CREATE INDEX "idx_emails_from_email" ON "public"."emails" USING "btree" ("from_email");



CREATE INDEX "idx_emails_gmail_thread_id" ON "public"."emails" USING "btree" ("gmail_thread_id");



CREATE INDEX "idx_emails_message_id" ON "public"."emails" USING "btree" ("message_id");



CREATE INDEX "idx_emails_user_id" ON "public"."emails" USING "btree" ("user_id");



CREATE INDEX "idx_invitations_token" ON "public"."organization_invitations" USING "btree" ("token");



CREATE INDEX "idx_oauth_tokens_email_account" ON "public"."oauth_tokens" USING "btree" ("email_account_id");



CREATE INDEX "idx_opportunities_close_date" ON "public"."opportunities" USING "btree" ("close_date");



CREATE INDEX "idx_opportunities_created_at" ON "public"."opportunities" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_opportunities_data_gin" ON "public"."opportunities" USING "gin" ("data");



CREATE INDEX "idx_opportunities_organization_id" ON "public"."opportunities" USING "btree" ("organization_id");



CREATE INDEX "idx_opportunities_original_contact" ON "public"."opportunities" USING "btree" ("original_contact_id");



CREATE INDEX "idx_opportunities_original_contact_id" ON "public"."opportunities" USING "btree" ("original_contact_id");



CREATE INDEX "idx_opportunities_owner" ON "public"."opportunities" USING "btree" ("owner");



CREATE INDEX "idx_opportunities_priority" ON "public"."opportunities" USING "btree" ("priority");



CREATE INDEX "idx_opportunities_search" ON "public"."opportunities" USING "gin" ("to_tsvector"('"english"'::"regconfig", ((((((COALESCE("opportunity", ''::"text") || ' '::"text") || COALESCE("company_name", ''::"text")) || ' '::"text") || COALESCE("owner", ''::"text")) || ' '::"text") || COALESCE("lead_source", ''::"text"))));



CREATE INDEX "idx_opportunities_status" ON "public"."opportunities" USING "btree" ("status");



CREATE INDEX "idx_opportunities_user_created" ON "public"."opportunities" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_opportunities_user_id" ON "public"."opportunities" USING "btree" ("user_id");



CREATE INDEX "idx_opportunities_user_status" ON "public"."opportunities" USING "btree" ("user_id", "status");



CREATE INDEX "idx_org_members_org" ON "public"."organization_members" USING "btree" ("organization_id");



CREATE INDEX "idx_org_members_user" ON "public"."organization_members" USING "btree" ("user_id");



CREATE INDEX "idx_organization_invitations_email" ON "public"."organization_invitations" USING "btree" ("email");



CREATE INDEX "idx_organization_invitations_org_id" ON "public"."organization_invitations" USING "btree" ("organization_id");



CREATE INDEX "idx_organization_invitations_organization_id" ON "public"."organization_invitations" USING "btree" ("organization_id");



CREATE INDEX "idx_organization_invitations_status" ON "public"."organization_invitations" USING "btree" ("status");



CREATE INDEX "idx_organization_invitations_token" ON "public"."organization_invitations" USING "btree" ("token");



CREATE INDEX "idx_organization_members_org_id" ON "public"."organization_members" USING "btree" ("organization_id");



CREATE INDEX "idx_organization_members_organization_id" ON "public"."organization_members" USING "btree" ("organization_id");



CREATE INDEX "idx_organization_members_user_id" ON "public"."organization_members" USING "btree" ("user_id");



CREATE INDEX "idx_pinned_emails_contact_email" ON "public"."pinned_emails" USING "btree" ("contact_email");



CREATE INDEX "idx_pinned_emails_email_id" ON "public"."pinned_emails" USING "btree" ("email_id");



CREATE UNIQUE INDEX "idx_pinned_emails_unique" ON "public"."pinned_emails" USING "btree" ("user_id", "email_id", "contact_email");



CREATE INDEX "idx_pinned_emails_user_id" ON "public"."pinned_emails" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_current_org" ON "public"."profiles" USING "btree" ("current_organization_id");



CREATE INDEX "idx_profiles_current_organization" ON "public"."profiles" USING "btree" ("current_organization");



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



CREATE OR REPLACE TRIGGER "on_invitation_accepted" AFTER UPDATE ON "public"."organization_invitations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_invitation_acceptance"();



CREATE OR REPLACE TRIGGER "opportunities_updated_at_trigger" BEFORE UPDATE ON "public"."opportunities" FOR EACH ROW EXECUTE FUNCTION "public"."update_opportunities_updated_at"();



CREATE OR REPLACE TRIGGER "update_email_accounts_updated_at" BEFORE UPDATE ON "public"."email_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_emails_updated_at" BEFORE UPDATE ON "public"."emails" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_oauth_tokens_updated_at" BEFORE UPDATE ON "public"."oauth_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_opportunities_updated_at" BEFORE UPDATE ON "public"."opportunities" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organization_invitations_updated_at" BEFORE UPDATE ON "public"."organization_invitations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organization_members_updated_at" BEFORE UPDATE ON "public"."organization_members" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



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



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pinned_emails"
    ADD CONSTRAINT "pinned_emails_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_current_organization_fkey" FOREIGN KEY ("current_organization") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_current_organization_id_fkey" FOREIGN KEY ("current_organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



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



CREATE POLICY "Admins can manage invitations" ON "public"."organization_invitations" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."organization_id" = "organization_invitations"."organization_id") AND ("om"."role" = 'admin'::"text")))));



CREATE POLICY "Allow delete access to leads_rows" ON "public"."leads_rows" FOR DELETE USING (true);



CREATE POLICY "Allow insert access to leads_rows" ON "public"."leads_rows" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow read access to leads_rows" ON "public"."leads_rows" FOR SELECT USING (true);



CREATE POLICY "Allow update access to leads_rows" ON "public"."leads_rows" FOR UPDATE USING (true);



CREATE POLICY "Anyone can view invitations" ON "public"."organization_invitations" FOR SELECT USING (true);



CREATE POLICY "Anyone can view pending invitations" ON "public"."organization_invitations" FOR SELECT USING (("status" = 'pending'::"text"));



CREATE POLICY "Auth users can access their own contacts" ON "public"."contacts" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Auth users can upsert their own contacts" ON "public"."contacts" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Contacts: user can delete own rows" ON "public"."contacts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Contacts: user can insert own rows" ON "public"."contacts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Contacts: user can select own rows" ON "public"."contacts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Contacts: user can update own rows" ON "public"."contacts" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Organization members can delete opportunities" ON "public"."opportunities" FOR DELETE USING (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE ("om"."user_id" = "auth"."uid"()))));



CREATE POLICY "Organization members can insert opportunities" ON "public"."opportunities" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE ("om"."user_id" = "auth"."uid"()))));



CREATE POLICY "Organization members can update opportunities" ON "public"."opportunities" FOR UPDATE USING (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE ("om"."user_id" = "auth"."uid"()))));



CREATE POLICY "Organization members can view opportunities" ON "public"."opportunities" FOR SELECT USING (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE ("om"."user_id" = "auth"."uid"()))));



CREATE POLICY "Service role can access all sessions" ON "public"."zapier_sessions" USING (true);



CREATE POLICY "Service role can manage all tokens" ON "public"."oauth_tokens" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can accept their invitations" ON "public"."organization_invitations" FOR UPDATE USING ((("email" = (( SELECT "users"."email"
   FROM "auth"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text") AND ("status" = 'pending'::"text")));



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



CREATE POLICY "Users can delete own tokens" ON "public"."oauth_tokens" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own API keys" ON "public"."user_api_keys" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own activities" ON "public"."user_activities" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own comments" ON "public"."comments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own deleted contacts" ON "public"."deleted_contacts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own opportunities" ON "public"."opportunities" FOR DELETE USING (("auth"."uid"() = "user_id"));



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



CREATE POLICY "Users can insert own tokens" ON "public"."oauth_tokens" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own comments" ON "public"."comments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own deleted contacts" ON "public"."deleted_contacts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own opportunities" ON "public"."opportunities" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own pinned emails" ON "public"."pinned_emails" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own sessions" ON "public"."zapier_sessions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own settings" ON "public"."user_settings" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update attachments of own emails" ON "public"."email_attachments" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."emails"
  WHERE (("emails"."id" = "email_attachments"."email_id") AND ("emails"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update own email accounts" ON "public"."email_accounts" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own tokens" ON "public"."oauth_tokens" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own API keys" ON "public"."user_api_keys" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own activities" ON "public"."user_activities" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own comments" ON "public"."comments" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own opportunities" ON "public"."opportunities" FOR UPDATE USING (("auth"."uid"() = "user_id"));



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



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own tokens" ON "public"."oauth_tokens" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own API keys" ON "public"."user_api_keys" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own activities" ON "public"."user_activities" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own deleted contacts" ON "public"."deleted_contacts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own opportunities" ON "public"."opportunities" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own pinned emails" ON "public"."pinned_emails" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own sessions" ON "public"."zapier_sessions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own tasks" ON "public"."tasks" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "admin_delete_members" ON "public"."organization_members" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "existing"
  WHERE (("existing"."user_id" = "auth"."uid"()) AND ("existing"."organization_id" = "organization_members"."organization_id") AND ("existing"."role" = 'admin'::"text")))));



CREATE POLICY "admin_insert_members" ON "public"."organization_members" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "existing"
  WHERE (("existing"."user_id" = "auth"."uid"()) AND ("existing"."organization_id" = "organization_members"."organization_id") AND ("existing"."role" = 'admin'::"text")))));



CREATE POLICY "admin_update_members" ON "public"."organization_members" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "existing"
  WHERE (("existing"."user_id" = "auth"."uid"()) AND ("existing"."organization_id" = "organization_members"."organization_id") AND ("existing"."role" = 'admin'::"text")))));



CREATE POLICY "admins_can_delete_organizations" ON "public"."organizations" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "organizations"."id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = 'admin'::"text")))));



CREATE POLICY "admins_can_update_organizations" ON "public"."organizations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "organizations"."id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "organizations"."id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = 'admin'::"text")))));



CREATE POLICY "authenticated_users_can_create_organizations" ON "public"."organizations" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_users_can_view_organizations" ON "public"."organizations" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."deleted_contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_attachments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "email_sync_log_final_access_policy" ON "public"."email_sync_log" TO "authenticated", "anon", "service_role" USING ((("auth"."role"() = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."email_accounts"
  WHERE (("email_accounts"."id" = "email_sync_log"."email_account_id") AND (("email_accounts"."user_id" = "auth"."uid"()) OR (("email_accounts"."user_id")::"text" = ("auth"."uid"())::"text"))))))) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."email_accounts"
  WHERE (("email_accounts"."id" = "email_sync_log"."email_account_id") AND (("email_accounts"."user_id" = "auth"."uid"()) OR (("email_accounts"."user_id")::"text" = ("auth"."uid"())::"text")))))));



COMMENT ON POLICY "email_sync_log_final_access_policy" ON "public"."email_sync_log" IS 'Final comprehensive RLS policy for email sync logs - supports background operations';



CREATE POLICY "emails_final_access_policy" ON "public"."emails" TO "authenticated", "anon", "service_role" USING ((("auth"."role"() = 'service_role'::"text") OR (("auth"."role"() = 'authenticated'::"text") AND ("user_id" = "auth"."uid"())) OR (("user_id")::"text" = ("auth"."uid"())::"text"))) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR (("user_id" IS NOT NULL) AND (("user_id")::"text" = ("auth"."uid"())::"text"))));



COMMENT ON POLICY "emails_final_access_policy" ON "public"."emails" IS 'Final comprehensive RLS policy for emails - supports all operations including background sync';



ALTER TABLE "public"."leads_rows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."oauth_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."opportunities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pinned_emails" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_activity_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_api_keys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "view_org_members" ON "public"."organization_members" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_organization_member"("organization_id", "auth"."uid"())));



CREATE POLICY "view_own_membership" ON "public"."organization_members" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."zapier_sessions" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."auto_accept_invitation"("p_invitation_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."auto_accept_invitation"("p_invitation_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_accept_invitation"("p_invitation_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_organization_invitation"("p_invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_organization_invitation"("p_invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_organization_invitation"("p_invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_user_organization"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_organization"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_organization"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."clean_orphaned_invitations"("p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."clean_orphaned_invitations"("p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."clean_orphaned_invitations"("p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_deleted_contacts"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_deleted_contacts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_deleted_contacts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_zapier_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_zapier_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_zapier_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."count_unique_jsonb_field_values"("p_user_id" "uuid", "p_field_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."count_unique_jsonb_field_values"("p_user_id" "uuid", "p_field_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_unique_jsonb_field_values"("p_user_id" "uuid", "p_field_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_api_key"("p_user_id" "uuid", "p_api_key" "text", "p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_api_key"("p_user_id" "uuid", "p_api_key" "text", "p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_api_key"("p_user_id" "uuid", "p_api_key" "text", "p_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_user_org_role"("p_user_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."debug_user_org_role"("p_user_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_user_org_role"("p_user_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_organization_member"("p_member_id" "uuid", "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_organization_member"("p_member_id" "uuid", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_organization_member"("p_member_id" "uuid", "p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_invitation_details_public"("p_token_or_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_invitation_details_public"("p_token_or_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_invitation_details_public"("p_token_or_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_organization_details_safe"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organization_details_safe"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organization_details_safe"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_organization_invitations_safe"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organization_invitations_safe"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organization_invitations_safe"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_organization_members_safe"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organization_members_safe"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organization_members_safe"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pending_invitations_for_email"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_pending_invitations_for_email"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pending_invitations_for_email"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unique_jsonb_field_values"("p_user_id" "uuid", "p_field_name" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_unique_jsonb_field_values"("p_user_id" "uuid", "p_field_name" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unique_jsonb_field_values"("p_user_id" "uuid", "p_field_name" "text", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_organization"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_organization"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_organization"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_organization_safe"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_organization_safe"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_organization_safe"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_invitation_acceptance"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_invitation_acceptance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_invitation_acceptance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_minimal"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_minimal"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_minimal"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_profile_only"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_profile_only"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_profile_only"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_organization"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_organization"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_organization"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_organization_member"("p_org_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_organization_member"("p_org_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_organization_member"("p_org_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."resend_organization_invitation"("p_invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."resend_organization_invitation"("p_invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resend_organization_invitation"("p_invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."restore_deleted_contact"("contact_id_param" "uuid", "user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."restore_deleted_contact"("contact_id_param" "uuid", "user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_deleted_contact"("contact_id_param" "uuid", "user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."send_organization_invitations"("p_organization_id" "uuid", "p_emails" "text"[], "p_role" "text", "p_message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."send_organization_invitations"("p_organization_id" "uuid", "p_emails" "text"[], "p_role" "text", "p_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_organization_invitations"("p_organization_id" "uuid", "p_emails" "text"[], "p_role" "text", "p_message" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."soft_delete_contacts"("contact_ids" "uuid"[], "user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."soft_delete_contacts"("contact_ids" "uuid"[], "user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."soft_delete_contacts"("contact_ids" "uuid"[], "user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_api_key_usage"("p_api_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_api_key_usage"("p_api_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_api_key_usage"("p_api_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_comments_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_comments_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_comments_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_opportunities_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_opportunities_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_opportunities_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_organization_member_role"("p_member_id" "uuid", "p_organization_id" "uuid", "p_new_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_organization_member_role"("p_member_id" "uuid", "p_organization_id" "uuid", "p_new_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_organization_member_role"("p_member_id" "uuid", "p_organization_id" "uuid", "p_new_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_organization_name"("p_organization_id" "uuid", "p_new_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_organization_name"("p_organization_id" "uuid", "p_new_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_organization_name"("p_organization_id" "uuid", "p_new_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_needs_organization"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_needs_organization"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_needs_organization"("p_user_id" "uuid") TO "service_role";



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



GRANT ALL ON TABLE "public"."opportunities" TO "anon";
GRANT ALL ON TABLE "public"."opportunities" TO "authenticated";
GRANT ALL ON TABLE "public"."opportunities" TO "service_role";



GRANT ALL ON TABLE "public"."organization_invitations" TO "anon";
GRANT ALL ON TABLE "public"."organization_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."organization_members" TO "anon";
GRANT ALL ON TABLE "public"."organization_members" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_members" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."pinned_emails" TO "anon";
GRANT ALL ON TABLE "public"."pinned_emails" TO "authenticated";
GRANT ALL ON TABLE "public"."pinned_emails" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



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
