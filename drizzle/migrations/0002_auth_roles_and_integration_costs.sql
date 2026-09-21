-- 1. Profile fields for the one-time email verification flow
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS login_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

CREATE OR REPLACE FUNCTION public.bump_login_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  n integer;
begin
  if auth.uid() is null then
    return 0;
  end if;
  update public.profiles
     set login_count = login_count + 1
   where id = auth.uid()
  returning login_count into n;
  return coalesce(n, 0);
end;
$$;

CREATE OR REPLACE FUNCTION public.mark_email_verified()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  update public.profiles
     set email_verified_at = coalesce(email_verified_at, now())
   where id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.mark_email_verified_if_oauth()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  provider text;
begin
  select coalesce(u.raw_app_meta_data ->> 'provider', 'email') into provider
    from auth.users u where u.id = auth.uid();
  if provider is not null and provider <> 'email' then
    update public.profiles
       set email_verified_at = coalesce(email_verified_at, now())
     where id = auth.uid();
  end if;
end;
$$;

GRANT EXECUTE ON FUNCTION public.bump_login_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_email_verified() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_email_verified_if_oauth() TO authenticated;

-- 2. Requests for roles that an administrator must approve
CREATE TABLE IF NOT EXISTS public.role_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_role public.app_role NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid REFERENCES auth.users(id)
);

GRANT SELECT, INSERT ON public.role_requests TO authenticated;
GRANT ALL ON public.role_requests TO service_role;
ALTER TABLE public.role_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own role requests readable" ON public.role_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own role request insert" ON public.role_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins manage role requests" ON public.role_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. New signups pick a role; sensitive roles are requested, not granted
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  wanted text;
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.email, ''))
  on conflict (id) do nothing;

  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
    insert into public.user_roles (user_id, role) values (new.id, 'advisor') on conflict do nothing;
    return new;
  end if;

  wanted := coalesce(new.raw_user_meta_data ->> 'requested_role', 'advisor');

  if wanted in ('advisor', 'client', 'insurer') then
    insert into public.user_roles (user_id, role) values (new.id, wanted::public.app_role)
    on conflict do nothing;
  else
    -- admin, compliance and fsp need approval; give a baseline role meanwhile
    insert into public.user_roles (user_id, role) values (new.id, 'advisor') on conflict do nothing;
    insert into public.role_requests (user_id, requested_role) values (new.id, wanted::public.app_role);
  end if;

  return new;
end;
$$;

-- 4. Integration catalogue metadata: pricing per unit, top-up and docs links
ALTER TABLE public.api_integrations ADD COLUMN IF NOT EXISTS unit_price numeric(12,4);
ALTER TABLE public.api_integrations ADD COLUMN IF NOT EXISTS unit_label text NOT NULL DEFAULT '';
ALTER TABLE public.api_integrations ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'ZAR';
ALTER TABLE public.api_integrations ADD COLUMN IF NOT EXISTS top_up_url text NOT NULL DEFAULT '';
ALTER TABLE public.api_integrations ADD COLUMN IF NOT EXISTS docs_url text NOT NULL DEFAULT '';
ALTER TABLE public.api_integrations ADD COLUMN IF NOT EXISTS portal_url text NOT NULL DEFAULT '';
ALTER TABLE public.api_integrations ADD COLUMN IF NOT EXISTS portal_username text NOT NULL DEFAULT '';
ALTER TABLE public.api_integrations ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.api_integrations ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 5. Multi-field secret store (username/password/api key/webhook secret per provider)
CREATE TABLE IF NOT EXISTS public.api_secrets (
  integration_id text NOT NULL,
  field_key text NOT NULL,
  secret_value text NOT NULL,
  rotated_at timestamptz NOT NULL DEFAULT now(),
  rotated_by uuid REFERENCES auth.users(id),
  PRIMARY KEY (integration_id, field_key)
);
GRANT ALL ON public.api_secrets TO service_role;
ALTER TABLE public.api_secrets ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.api_credentials IS 'DEPRECATED: replaced by public.api_secrets (multi-field per provider).';