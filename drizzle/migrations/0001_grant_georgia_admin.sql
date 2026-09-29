-- Grants the admin role to Georgia Adams's account, so APIs & Credentials is reachable.
-- Idempotent: safe to run more than once.
insert into public.user_roles (user_id, role)
select id, 'admin'
from auth.users
where email = 'info@georgiaadams.co.za'
on conflict do nothing;
