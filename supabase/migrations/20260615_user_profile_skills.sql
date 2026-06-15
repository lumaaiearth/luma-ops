-- Migration: User Profile — Bio Role + Skills (2026-06-15)
-- Run in Supabase SQL Editor

ALTER TABLE user_profile
  ADD COLUMN IF NOT EXISTS bio_rolle TEXT,
  ADD COLUMN IF NOT EXISTS skills    TEXT[] DEFAULT '{}';
