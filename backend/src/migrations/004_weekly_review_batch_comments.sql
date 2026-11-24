-- Migration 004: Create weekly_review_batch_comments table
CREATE TABLE IF NOT EXISTS weekly_review_batch_comments (
  id SERIAL PRIMARY KEY,
  review_id INTEGER NOT NULL REFERENCES weekly_reviews(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  comments TEXT NOT NULL,
  action_items JSONB DEFAULT '[]',
  solution_text TEXT,
  solution_link VARCHAR(500),
  solution_submitted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  solution_submitted_at TIMESTAMPTZ,
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'needs_revision')),
  coordinator_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_wrbc_review_id ON weekly_review_batch_comments(review_id);
CREATE INDEX IF NOT EXISTS idx_wrbc_team_id ON weekly_review_batch_comments(team_id);
CREATE INDEX IF NOT EXISTS idx_wrbc_status ON weekly_review_batch_comments(status);
