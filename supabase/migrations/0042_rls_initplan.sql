-- 0042: RLS speed-up. Supabase advisor "auth_rls_initplan" (129 warnings).
--
-- Inside a policy, a bare auth.uid() is re-evaluated for EVERY row. Wrapped as
-- (select auth.uid()) Postgres evaluates it once per query. The meaning of the
-- policy is identical; only the plan changes.
--
-- This rewrites every public-schema policy that still contains a bare
-- auth.uid() / auth.role() / auth.jwt(). Already wrapped calls are kept as is,
-- so it is safe to run twice (the notice count is then only a re-write to the same text). Run it in a transaction first if you like:
--   begin; <this file>; select ...; rollback;
-- Rollback: there is no semantic change; to undo, re-create the policies from
-- the earlier migrations.

do $$
declare
  r record;
  new_using text;
  new_check text;
  stmt text;
  n int := 0;
  -- bare call not already preceded by "select "
  fn text[] := array['auth.uid()', 'auth.role()', 'auth.jwt()'];
  f text;
  i int;
begin
  for r in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') ~ 'auth\.(uid|role|jwt)\(\)'
        or coalesce(with_check, '') ~ 'auth\.(uid|role|jwt)\(\)')
  loop
    new_using := r.qual;
    new_check := r.with_check;
    for i in 1 .. array_length(fn, 1) loop
      f := fn[i];
      -- pg_policies renders an already wrapped call as "( SELECT auth.uid() AS uid)";
      -- protect those by temporarily tagging them.
      if new_using is not null then
        new_using := regexp_replace(new_using, '\(\s*SELECT\s+' || replace(replace(f,'(','\('),')','\)') || '\s+AS\s+\w+\)', '@@W' || i || '@@', 'gi');
        new_using := replace(new_using, f, '(select ' || f || ')');
        new_using := replace(new_using, '@@W' || i || '@@', '(select ' || f || ')');
      end if;
      if new_check is not null then
        new_check := regexp_replace(new_check, '\(\s*SELECT\s+' || replace(replace(f,'(','\('),')','\)') || '\s+AS\s+\w+\)', '@@W' || i || '@@', 'gi');
        new_check := replace(new_check, f, '(select ' || f || ')');
        new_check := replace(new_check, '@@W' || i || '@@', '(select ' || f || ')');
      end if;
    end loop;

    if new_using is distinct from r.qual or new_check is distinct from r.with_check then
      stmt := format('alter policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
      if new_using is not null then stmt := stmt || ' using (' || new_using || ')'; end if;
      if new_check is not null then stmt := stmt || ' with check (' || new_check || ')'; end if;
      execute stmt;
      n := n + 1;
    end if;
  end loop;
  raise notice 'rewrote % policies', n;
end $$;
