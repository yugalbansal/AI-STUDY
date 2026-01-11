-- Get exact function signatures with all parameters

SELECT 
  r.routine_name,
  pg_get_function_identity_arguments(p.oid) as full_signature,
  'DROP FUNCTION IF EXISTS ' || r.routine_name || '(' || pg_get_function_identity_arguments(p.oid) || ');' as drop_command
FROM information_schema.routines r
JOIN pg_proc p ON p.proname = r.routine_name AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
WHERE r.routine_schema = 'public'
  AND r.routine_name LIKE 'search_similar%'
  AND pg_get_function_identity_arguments(p.oid) LIKE '%uuid%'
ORDER BY r.routine_name;
