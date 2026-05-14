-- Update RPCs to also track weekly_points and monthly_points alongside main totals.
-- The rollover cron will zero these out at period end.

CREATE OR REPLACE FUNCTION add_detection_points(user_id_param UUID, points_param INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET
    detection_points = detection_points + points_param,
    weekly_points    = weekly_points    + points_param,
    monthly_points   = monthly_points   + points_param
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION add_confession_points(user_id_param UUID, points_param INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET
    confession_points = confession_points + points_param,
    weekly_points     = weekly_points     + points_param,
    monthly_points    = monthly_points    + points_param
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
