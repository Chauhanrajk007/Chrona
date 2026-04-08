-- Run this in Supabase SQL Editor to create the app_users table
CREATE TABLE IF NOT EXISTS public.app_users (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    username text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    display_name text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT app_users_pkey PRIMARY KEY (id)
);

-- Allow anon key to read/write this table (for hackathon dev)
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON public.app_users FOR ALL USING (true) WITH CHECK (true);
