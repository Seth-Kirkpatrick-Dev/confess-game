-- ============================================================
-- CONFESS GAME - Supabase SQL Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  is_premium BOOLEAN DEFAULT false NOT NULL,
  is_banned BOOLEAN DEFAULT false NOT NULL,
  confession_points INTEGER DEFAULT 0 NOT NULL,
  detection_points INTEGER DEFAULT 0 NOT NULL,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Confessions table
CREATE TABLE IF NOT EXISTS confessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 300 AND char_length(content) > 0),
  real_votes INTEGER DEFAULT 0 NOT NULL,
  fake_votes INTEGER DEFAULT 0 NOT NULL,
  is_resolved BOOLEAN DEFAULT false NOT NULL,
  is_deleted BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Votes table (one vote per user per confession)
CREATE TABLE IF NOT EXISTS votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  confession_id UUID REFERENCES confessions(id) ON DELETE CASCADE NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('real', 'fake')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, confession_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE confessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone can view, only owner can update
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Confessions: anyone can view non-deleted, auth users can insert
DROP POLICY IF EXISTS "confessions_select" ON confessions;
DROP POLICY IF EXISTS "confessions_insert" ON confessions;
CREATE POLICY "confessions_select" ON confessions FOR SELECT USING (is_deleted = false);
CREATE POLICY "confessions_insert" ON confessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Votes: anyone can view, auth users can insert own votes
DROP POLICY IF EXISTS "votes_select" ON votes;
DROP POLICY IF EXISTS "votes_insert" ON votes;
CREATE POLICY "votes_select" ON votes FOR SELECT USING (true);
CREATE POLICY "votes_insert" ON votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(SPLIT_PART(NEW.email, '@', 1), ''), 'user') || '_' || SUBSTRING(REPLACE(NEW.id::TEXT, '-', ''), 1, 6)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- FUNCTIONS: Points updates (runs with elevated privileges)
-- ============================================================
CREATE OR REPLACE FUNCTION add_detection_points(user_id_param UUID, points_param INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET detection_points = detection_points + points_param
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION add_confession_points(user_id_param UUID, points_param INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET confession_points = confession_points + points_param
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
