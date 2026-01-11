-- Check what functions actually exist in the database

SELECT 
  r.routine_name,
  r.routine_type,
  pg_get_function_identity_arguments(p.oid) as arguments
FROM information_schema.routines r
JOIN pg_proc p ON p.proname = r.routine_name AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
WHERE r.routine_schema = 'public'
  AND r.routine_name LIKE 'search_similar%'
ORDER BY r.routine_name, arguments;
