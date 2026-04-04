-- Luxxx Database Schema for Supabase
-- Run this script in your Supabase SQL editor to create the required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user types
CREATE TYPE user_type AS ENUM ('escort', 'member', 'agency', 'club');

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  user_type user_type NOT NULL,
  token_version INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(255),
  email_verification_expires TIMESTAMP WITH TIME ZONE,
  password_reset_token_hash VARCHAR(255),
  password_reset_expires TIMESTAMP WITH TIME ZONE,
  password_reset_used_at TIMESTAMP WITH TIME ZONE,
  privacy_consent_accepted_at TIMESTAMP WITH TIME ZONE,
  soft_deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Escort specific fields
  name VARCHAR(100),
  phone VARCHAR(50),
  city VARCHAR(100),
  age INTEGER,
  date_of_birth DATE,
  
  -- Member specific fields
  username VARCHAR(50),
  
  -- Agency specific fields
  agency_name VARCHAR(100),
  
  -- Club specific fields
  club_name VARCHAR(100),
  address VARCHAR(255),
  opening_hours VARCHAR(100),
  
  -- Common optional fields
  website VARCHAR(255),
  
  -- Constraints
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_age CHECK (age IS NULL OR (age >= 21 AND age <= 99)),
  
  -- Type-specific field requirements
  CONSTRAINT escort_fields CHECK (
    user_type != 'escort' OR (name IS NOT NULL AND phone IS NOT NULL AND city IS NOT NULL AND date_of_birth IS NOT NULL)
  ),
  CONSTRAINT member_fields CHECK (
    user_type != 'member' OR (username IS NOT NULL AND city IS NOT NULL)
  ),
  CONSTRAINT agency_fields CHECK (
    user_type != 'agency' OR (agency_name IS NOT NULL AND phone IS NOT NULL AND city IS NOT NULL)
  ),
  CONSTRAINT club_fields CHECK (
    user_type != 'club' OR (club_name IS NOT NULL AND phone IS NOT NULL AND address IS NOT NULL AND city IS NOT NULL)
  )
);

-- Create indexes for better query performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_soft_deleted_at ON users(soft_deleted_at);
CREATE INDEX idx_users_verification_token ON users(email_verification_token);
CREATE INDEX idx_users_password_reset_token_hash ON users(password_reset_token_hash);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY users_select_own
  ON users
  FOR SELECT
  USING (auth.uid()::text = id::text);

-- Policy: Users can update their own data (except email and user_type)
CREATE POLICY users_update_own
  ON users
  FOR UPDATE
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- Policy: Anyone can insert (for registration)
CREATE POLICY users_insert_all
  ON users
  FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO anon;

-- Comments for documentation
COMMENT ON TABLE users IS 'Stores all user types: escorts, members, agencies, and clubs';
COMMENT ON COLUMN users.user_type IS 'Type of user account';
COMMENT ON COLUMN users.email_verified IS 'Whether the user has verified their email address';
COMMENT ON COLUMN users.is_active IS 'Whether the account is active';
COMMENT ON COLUMN users.privacy_consent_accepted_at IS 'Timestamp when user accepted privacy policy';
COMMENT ON COLUMN users.soft_deleted_at IS 'Soft delete timestamp; null means active account';

-- Promotion plans
-- NOTE: This file is legacy and does not yet reflect the full production schema.
-- Keep the promotion_plans contract aligned with migrations 010 + 024 + 028.
-- promotion_plans.expires_at TIMESTAMP WITH TIME ZONE allows admin-configured cutoffs.
-- Advertisement subscription contract (migrations 013 + 015 + 018 + 026 + 027 + 028):
-- advertisements.selected_plan VARCHAR(20)
-- advertisements.selected_duration VARCHAR(10)
-- advertisements.selected_addons TEXT[] DEFAULT '{}'
-- advertisements.plan_priority INTEGER NOT NULL DEFAULT 0
-- advertisements.boosted_until TIMESTAMP WITH TIME ZONE
-- advertisements.plan_expires_at TIMESTAMP WITH TIME ZONE
-- advertisements.reviews_visible BOOLEAN NOT NULL DEFAULT TRUE
-- advertisements.telegram_username VARCHAR(100)
-- advertisements.last_seen_online_at TIMESTAMP WITH TIME ZONE
-- advertisements.presence_expires_at TIMESTAMP WITH TIME ZONE
-- If the selected plan has promotion_plans.expires_at, that cutoff overrides duration-based expiry.
-- Job: cron "downgrade-expired-advertisement-plans" executes
--       SELECT downgrade_expired_advertisement_plans() every minute.
-- Real presence contract (migration 029):
--   visible profile = advertisements.is_online = true
--   currently online = visible profile + presence_expires_at > NOW()
--   last seen online = last_seen_online_at
-- Viewer simulation contract (migration 036):
--   public_viewer_sessions tracks active browser sessions across public/admin pages.
--   admin_settings.key = 'viewer_simulation_range_max' controls the random upper bound.
--   admin_settings.key = 'viewer_simulation_started_at' anchors the daily +2 progression.

CREATE TABLE IF NOT EXISTS promotion_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(20) NOT NULL UNIQUE,
  display_name VARCHAR(80) NOT NULL,
  price_per_day DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_per_week DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_per_month DECIMAL(10,2) NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  availability_status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT promotion_plans_availability_status_check
    CHECK (availability_status IN ('AVAILABLE', 'COMING_SOON', 'HIDDEN'))
);

CREATE TABLE IF NOT EXISTS public_viewer_sessions (
  session_id VARCHAR(120) PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  current_path VARCHAR(255),
  is_authenticated BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_viewer_sessions_expires_at
  ON public_viewer_sessions (expires_at);

CREATE INDEX IF NOT EXISTS idx_public_viewer_sessions_user_id
  ON public_viewer_sessions (user_id)
  WHERE user_id IS NOT NULL;
