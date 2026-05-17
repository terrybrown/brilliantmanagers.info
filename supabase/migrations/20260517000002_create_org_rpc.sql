-- Atomic function: creates an org and adds the calling user as org_admin in one
-- transaction. SECURITY DEFINER bypasses RLS so both inserts always succeed.
-- auth.uid() is checked explicitly to prevent anonymous abuse.
CREATE OR REPLACE FUNCTION create_org_with_admin(_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id  uuid := gen_random_uuid();
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO organisations (id, name, created_by)
  VALUES (_org_id, _name, _user_id);

  INSERT INTO org_members (org_id, user_id, role)
  VALUES (_org_id, _user_id, 'org_admin');

  RETURN json_build_object('id', _org_id, 'name', _name);
END;
$$;
