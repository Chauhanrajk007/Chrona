-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.behavior_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_id uuid,
  event_type text NOT NULL,
  scheduled_start timestamp with time zone,
  scheduled_end timestamp with time zone,
  actual_complete timestamp with time zone,
  confirmed_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  logged_at timestamp with time zone DEFAULT now(),
  CONSTRAINT behavior_events_pkey PRIMARY KEY (id),
  CONSTRAINT behavior_events_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.schedule_items(id)
);
CREATE TABLE public.behavior_profiles (
  user_id uuid NOT NULL,
  slot_weights jsonb DEFAULT '{"night": 0.5, "evening": 0.5, "morning": 0.5, "afternoon": 0.5}'::jsonb,
  type_weights jsonb DEFAULT '{}'::jsonb,
  avg_delay_min double precision DEFAULT 0.0,
  sample_count integer DEFAULT 0,
  archetype text DEFAULT 'student_balanced'::text,
  last_updated timestamp with time zone DEFAULT now(),
  CONSTRAINT behavior_profiles_pkey PRIMARY KEY (user_id)
);
CREATE TABLE public.capacity_profiles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  weekly_capacity numeric NOT NULL DEFAULT 40,
  deep_work_hours numeric NOT NULL DEFAULT 20,
  efficiency_factor numeric NOT NULL DEFAULT 0.8,
  stress_tolerance integer NOT NULL DEFAULT 5,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT capacity_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT capacity_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.dependencies (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  goal_id uuid,
  depends_on_goal_id uuid,
  CONSTRAINT dependencies_pkey PRIMARY KEY (id),
  CONSTRAINT dependencies_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id),
  CONSTRAINT dependencies_depends_on_goal_id_fkey FOREIGN KEY (depends_on_goal_id) REFERENCES public.goals(id)
);
CREATE TABLE public.drafts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text,
  venue text,
  event_datetime timestamp with time zone,
  severity_level text DEFAULT 'medium'::text,
  complexity_score integer DEFAULT 5,
  estimated_prep_hours integer DEFAULT 2,
  status text DEFAULT 'pending'::text,
  original_event_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  archived_at timestamp with time zone DEFAULT now(),
  notes text,
  CONSTRAINT drafts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text,
  category text,
  venue text,
  event_datetime timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  user_id uuid,
  source_hash text UNIQUE,
  key_topics ARRAY,
  action_items jsonb,
  CONSTRAINT events_pkey PRIMARY KEY (id)
);
CREATE TABLE public.goals (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  deadline timestamp with time zone NOT NULL,
  estimated_hours numeric NOT NULL,
  impact_score integer DEFAULT 5,
  risk_score integer DEFAULT 5,
  priority_weight numeric DEFAULT 1.0,
  status text DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT goals_pkey PRIMARY KEY (id),
  CONSTRAINT goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.onboarding_responses (
  user_id uuid NOT NULL,
  productive_time text,
  work_type text,
  task_preference text,
  study_hours integer DEFAULT 4,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT onboarding_responses_pkey PRIMARY KEY (user_id)
);
CREATE TABLE public.repair_proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conflict_hash text,
  proposals jsonb NOT NULL,
  accepted boolean,
  accepted_idx integer,
  agent_reasoning text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT repair_proposals_pkey PRIMARY KEY (id)
);
CREATE TABLE public.schedule_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid,
  title text NOT NULL,
  task_type text DEFAULT 'task'::text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  deadline timestamp with time zone,
  priority integer DEFAULT 3,
  flexibility boolean DEFAULT true,
  status text DEFAULT 'scheduled'::text,
  actual_start timestamp with time zone,
  actual_end timestamp with time zone,
  completion_note text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT schedule_items_pkey PRIMARY KEY (id),
  CONSTRAINT schedule_items_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);