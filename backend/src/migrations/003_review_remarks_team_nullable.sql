-- Migration 003: Make team_id nullable in review_remarks so any batch student or guide can submit answers/remarks
ALTER TABLE review_remarks ALTER COLUMN team_id DROP NOT NULL;
