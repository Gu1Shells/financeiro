/*
  # Add Notification Tracking System

  1. New Tables
    - `notification_views`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `notification_type` (text) - 'new_expense', 'overdue_payment', 'upcoming_payment'
      - `reference_id` (uuid) - ID of the expense or installment
      - `viewed_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `notification_views` table
    - Users can only view and manage their own notification views
    - Users can insert their own notification views
    - Users can delete their own notification views

  3. Indexes
    - Index on user_id for faster queries
    - Index on reference_id for faster lookups
    - Composite index on (user_id, notification_type, reference_id) for efficient checking
*/

CREATE TABLE IF NOT EXISTS notification_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('new_expense', 'overdue_payment', 'upcoming_payment')),
  reference_id uuid NOT NULL,
  viewed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notification_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification views"
  ON notification_views
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification views"
  ON notification_views
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification views"
  ON notification_views
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notification_views_user_id ON notification_views(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_views_reference_id ON notification_views(reference_id);
CREATE INDEX IF NOT EXISTS idx_notification_views_composite ON notification_views(user_id, notification_type, reference_id);