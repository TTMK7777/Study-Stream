-- check_and_record_rate_limit: per-(user, endpoint) advisory lock で
-- count + INSERT を 1 トランザクションに閉じ、TOCTOU 競合を排除する。
-- service_role 経由でのみ呼ばれる想定 (api_calls の RLS と整合)。

CREATE OR REPLACE FUNCTION check_and_record_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_limit integer,
  p_window_seconds integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_lock_key bigint;
BEGIN
  -- (user_id, endpoint) ペアごとに直列化。
  -- pg_advisory_xact_lock はトランザクション終了時に自動解放されるため
  -- 明示的な unlock 呼び出しは不要。
  v_lock_key := hashtextextended(p_user_id::text || '|' || p_endpoint, 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT count(*) INTO v_count
  FROM api_calls
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND called_at >= (now() - make_interval(secs => p_window_seconds));

  IF v_count >= p_limit THEN
    RETURN jsonb_build_object('ok', false, 'retry_after', p_window_seconds);
  END IF;

  INSERT INTO api_calls (user_id, endpoint) VALUES (p_user_id, p_endpoint);

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- service_role からのみ呼べるように制限。
REVOKE ALL ON FUNCTION check_and_record_rate_limit(uuid, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_and_record_rate_limit(uuid, text, integer, integer) TO service_role;
