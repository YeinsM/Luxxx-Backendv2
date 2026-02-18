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
  CONSTRAINT valid_age CHECK (age IS NULL OR (age >= 18 AND age <= 99)),
  
  -- Type-specific field requirements
  CONSTRAINT escort_fields CHECK (
    user_type != 'escort' OR (name IS NOT NULL AND phone IS NOT NULL AND city IS NOT NULL AND age IS NOT NULL)
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
