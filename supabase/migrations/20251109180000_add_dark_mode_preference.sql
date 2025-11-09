/*
  # Add Dark Mode User Preference

  1. Changes
    - Add `dark_mode` column to `profiles` table
      - Boolean field with default value `false`
      - Allows users to toggle dark mode independently

  2. Security
    - Users can only update their own dark mode preference
    - Existing RLS policies apply
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'dark_mode'
  ) THEN
    ALTER TABLE profiles ADD COLUMN dark_mode boolean DEFAULT false;
  END IF;
END $$;
