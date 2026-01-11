-- Verify RPC function signatures are correct for TEXT user_id

SELECT 
  routine_name,
  routine_type,
  data_type as return_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'search_similar%'
ORDER BY routine_name;

-- Check specific parameter types
SELECT 
  r.routine_name,
  p.parameter_name,
  p.data_type,
  p.parameter_mode
FROM information_schema.routines r
JOIN information_schema.parameters p ON r.specific_name = p.specific_name
WHERE r.routine_schema = 'public'
  AND r.routine_name LIKE 'search_similar%'
  AND p.parameter_name = 'user_id_param'
ORDER BY r.routine_name;
