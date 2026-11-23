-- Migration 001: Initial Schema
-- College Project Monitoring Portal

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Batches table
CREATE TABLE IF NOT EXISTS batches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'faculty', 'student')),
  password_hash VARCHAR(255) NOT NULL,
  must_change_password BOOLEAN DEFAULT TRUE,
  batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_batch_id ON users(batch_id);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  project_title VARCHAR(300),
  project_description TEXT,
  lead_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  guide_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'pending_review', 'completed')),
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_batch_id ON teams(batch_id);
CREATE INDEX IF NOT EXISTS idx_teams_lead_id ON teams(lead_id);
CREATE INDEX IF NOT EXISTS idx_teams_guide_id ON teams(guide_id);
CREATE INDEX IF NOT EXISTS idx_teams_status ON teams(status);

-- Team Members junction table
CREATE TABLE IF NOT EXISTS team_members (
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- Daily Updates table
CREATE TABLE IF NOT EXISTS daily_updates (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  submitted_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  update_date DATE NOT NULL,
  done_today TEXT NOT NULL,
  plan_tomorrow TEXT,
  blockers TEXT,
  percent_complete INTEGER DEFAULT 0 CHECK (percent_complete >= 0 AND percent_complete <= 100),
  link VARCHAR(500),
  is_late BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, update_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_updates_team_id ON daily_updates(team_id);
CREATE INDEX IF NOT EXISTS idx_daily_updates_update_date ON daily_updates(update_date);
CREATE INDEX IF NOT EXISTS idx_daily_updates_submitted_by ON daily_updates(submitted_by);

-- Daily Update History (edit tracking)
CREATE TABLE IF NOT EXISTS daily_update_history (
  id SERIAL PRIMARY KEY,
  update_id INTEGER NOT NULL REFERENCES daily_updates(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  edited_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_update_history_update_id ON daily_update_history(update_id);

-- Update Comments
CREATE TABLE IF NOT EXISTS update_comments (
  id SERIAL PRIMARY KEY,
  update_id INTEGER NOT NULL REFERENCES daily_updates(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_update_comments_update_id ON update_comments(update_id);

-- Weekly Reviews
CREATE TABLE IF NOT EXISTS weekly_reviews (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  week_no INTEGER NOT NULL,
  review_date DATE NOT NULL,
  suggestions TEXT,
  action_items JSONB DEFAULT '[]',
  attachment_link VARCHAR(500),
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_reviews_batch_id ON weekly_reviews(batch_id);

-- Review Acknowledgements
CREATE TABLE IF NOT EXISTS review_acks (
  review_id INTEGER NOT NULL REFERENCES weekly_reviews(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seen_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (review_id, user_id)
);

-- Review Remarks
CREATE TABLE IF NOT EXISTS review_remarks (
  id SERIAL PRIMARY KEY,
  review_id INTEGER NOT NULL REFERENCES weekly_reviews(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  remark TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'needs_work')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_remarks_review_id ON review_remarks(review_id);
CREATE INDEX IF NOT EXISTS idx_review_remarks_team_id ON review_remarks(team_id);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  audience_type VARCHAR(20) NOT NULL CHECK (audience_type IN ('all', 'batch', 'team')),
  batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
  team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  message TEXT NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_audience ON announcements(audience_type);
CREATE INDEX IF NOT EXISTS idx_announcements_batch_id ON announcements(batch_id);

-- Papers
CREATE TABLE IF NOT EXISTS papers (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  venue_or_journal VARCHAR(300),
  submission_id VARCHAR(100),
  status VARCHAR(30) DEFAULT 'not_started' CHECK (status IN ('not_started', 'writing', 'submitted', 'under_review', 'accepted', 'rejected', 'published')),
  status_date DATE,
  plagiarism_percent NUMERIC(5,2),
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_papers_team_id ON papers(team_id);
CREATE INDEX IF NOT EXISTS idx_papers_status ON papers(status);

-- Follow-ups
CREATE TABLE IF NOT EXISTS followups (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  called_on TIMESTAMPTZ DEFAULT NOW(),
  note TEXT NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_followups_team_id ON followups(team_id);

-- Holidays
CREATE TABLE IF NOT EXISTS holidays (
  id SERIAL PRIMARY KEY,
  holiday_date DATE UNIQUE NOT NULL,
  reason VARCHAR(300) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(holiday_date);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(100),
  entity_id INTEGER,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(300) NOT NULL,
  message TEXT,
  entity VARCHAR(50),
  entity_id INTEGER,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Migrations tracking table
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);
