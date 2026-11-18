-- ============================================================================
-- Seed: Colformly Super Admin Account (Idempotent)
-- Email: core@edgecors.com | Role: SUPER_ADMIN | Providers: email + google
-- ============================================================================

DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'core@edgecors.com';
  v_password text := 'testing1.8899';
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email LIMIT 1;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      recovery_token,
      email_change,
      email_change_token_new,
      email_change_token_current,
      phone_change,
      phone_change_token,
      reauthentication_token,
      raw_app_meta_data,
      raw_user_meta_data,
      is_sso_user,
      is_anonymous,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      extensions.crypt(v_password, extensions.gen_salt('bf')),
      now(),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      jsonb_build_object(
        'provider', 'email',
        'providers', jsonb_build_array('email', 'google'),
        'role', 'SUPER_ADMIN'
      ),
      jsonb_build_object(
        'full_name', 'Colformly Super Admin',
        'email', v_email,
        'email_verified', true,
        'phone_verified', false
      ),
      false,
      false,
      now(),
      now()
    );
  ELSE
    UPDATE auth.users
    SET
      encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
        'provider', 'email',
        'providers', jsonb_build_array('email', 'google'),
        'role', 'SUPER_ADMIN'
      ),
      updated_at = now()
    WHERE id = v_user_id;
  END IF;

  INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    v_user_id::text,
    'email',
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
    now(), now(), now()
  )
  ON CONFLICT (provider_id, provider) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    v_email,
    'google',
    jsonb_build_object('sub', v_email, 'email', v_email, 'email_verified', true, 'full_name', 'Colformly Super Admin', 'provider_id', v_email),
    now(), now(), now()
  )
  ON CONFLICT (provider_id, provider) DO NOTHING;

  INSERT INTO public.users (id, email, full_name, global_role)
  VALUES (v_user_id, v_email, 'Colformly Super Admin', 'SUPER_ADMIN')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    global_role = 'SUPER_ADMIN',
    updated_at = now();
END $$;
