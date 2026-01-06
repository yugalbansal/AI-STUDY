-- ================================================================
-- RLS DIAGNOSTICS SCRIPT
-- ================================================================
-- Run this script to check the current state of RLS policies
-- and identify any issues before applying fixes
-- ================================================================

-- ================================================================
-- 1. CHECK RLS STATUS ON ALL TABLES
-- ================================================================
    SELECT 
        schemaname,
        tablename,
        CASE 
            WHEN rowsecurity THEN '✅ ENABLED'
            ELSE '❌ DISABLED'
        END as rls_status
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename IN (
            'users', 'chats', 'chat_messages', 'chat_history', 
            'documents', 'chat_embeddings', 'document_embeddings', 'user_sessions'
        )
    ORDER BY tablename;

-- ================================================================
-- 2. LIST ALL CURRENT POLICIES
-- ================================================================
SELECT 
    tablename,
    policyname,
    cmd as operation,
    CASE 
        WHEN qual IS NULL THEN '(no USING clause)'
        ELSE LEFT(qual::text, 100) || CASE WHEN LENGTH(qual::text) > 100 THEN '...' ELSE '' END
    END as using_clause,
    CASE 
        WHEN with_check IS NULL THEN '(no WITH CHECK clause)'
        ELSE LEFT(with_check::text, 100) || CASE WHEN LENGTH(with_check::text) > 100 THEN '...' ELSE '' END
    END as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- ================================================================
-- 3. CHECK FOR CIRCULAR DEPENDENCIES
-- ================================================================
-- Look for policies on 'users' table that reference 'users' table
SELECT 
    '⚠️ POTENTIAL CIRCULAR DEPENDENCY' as warning,
    tablename,
    policyname,
    cmd,
    qual::text as policy_definition
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'users'
    AND (
        qual::text LIKE '%FROM users%'
        OR qual::text LIKE '%FROM public.users%'
    );

-- ================================================================
-- 4. COUNT POLICIES PER TABLE
-- ================================================================
SELECT 
    tablename,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
    COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
    COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
    COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies,
    COUNT(CASE WHEN cmd = 'ALL' THEN 1 END) as all_policies
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'users', 'chats', 'chat_messages', 'chat_history', 
        'documents', 'chat_embeddings', 'document_embeddings', 'user_sessions'
    )
GROUP BY tablename
ORDER BY tablename;

-- ================================================================
-- 5. CHECK GRANTS ON TABLES
-- ================================================================
SELECT 
    table_schema,
    table_name,
    privilege_type,
    grantee
FROM information_schema.table_privileges
WHERE table_schema = 'public'
    AND table_name IN (
        'users', 'chats', 'chat_messages', 'chat_history', 
        'documents', 'chat_embeddings', 'document_embeddings', 'user_sessions'
    )
    AND grantee IN ('authenticated', 'anon', 'public')
ORDER BY table_name, privilege_type;

-- ================================================================
-- 6. CHECK FOR POLICIES WITH 'admin' CHECKS
-- ================================================================
SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN qual::text LIKE '%role%=%admin%' THEN '✅ Has admin check'
        WHEN qual::text LIKE '%users%' THEN '⚠️ References users table'
        ELSE '❌ No admin check'
    END as admin_check_status,
    qual::text as full_definition
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ================================================================
-- 7. CHECK CURRENT USER ROLES
-- ================================================================
SELECT 
    id,
    email,
    role,
    created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- ================================================================
-- 8. IDENTIFY MISSING POLICIES
-- ================================================================
-- Check if essential policies exist for each table
WITH required_policies AS (
    SELECT 
        t.tablename,
        op.operation
    FROM (
        VALUES 
            ('users'), ('chats'), ('chat_messages'), ('chat_history'),
            ('documents'), ('chat_embeddings'), ('document_embeddings'), ('user_sessions')
    ) AS t(tablename)
    CROSS JOIN (
        VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')
    ) AS op(operation)
),
existing_policies AS (
    SELECT 
        tablename,
        cmd as operation
    FROM pg_policies
    WHERE schemaname = 'public'
)
SELECT 
    rp.tablename,
    rp.operation,
    CASE 
        WHEN ep.operation IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM required_policies rp
LEFT JOIN existing_policies ep 
    ON rp.tablename = ep.tablename 
    AND rp.operation = ep.operation
WHERE ep.operation IS NULL
ORDER BY rp.tablename, rp.operation;

-- ================================================================
-- 9. CHECK FOR OVERLAPPING OR DUPLICATE POLICIES
-- ================================================================
SELECT 
    tablename,
    cmd,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ') as policy_names
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename, cmd
HAVING COUNT(*) > 1
ORDER BY tablename, cmd;

-- ================================================================
-- 10. TEST QUERY SIMULATION (for debugging)
-- ================================================================
-- This shows what queries are being attempted
SELECT 
    '📊 DIAGNOSTIC SUMMARY' as info,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
    (SELECT COUNT(DISTINCT tablename) FROM pg_policies WHERE schemaname = 'public') as tables_with_policies,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND qual::text LIKE '%users%') as policies_referencing_users;

-- ================================================================
-- END OF DIAGNOSTICS
-- ================================================================
-- Review the output above to identify:
-- 1. Tables with RLS disabled
-- 2. Circular dependencies (users table policies referencing users)
-- 3. Missing policies (INSERT/UPDATE/DELETE)
-- 4. Duplicate or conflicting policies
-- ================================================================
