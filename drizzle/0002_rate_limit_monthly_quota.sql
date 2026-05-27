-- 月次クォータの TOCTOU 競合を排除する RPC 拡張 (Issue #48 H-1)
--
-- 旧設計: checkMonthlyQuota (SELECT count) と check_and_record_rate_limit (advisory lock + INSERT)
--         が別トランザクションで実行されるため、並列リクエストで月次上限を大幅超過した
--         Anthropic API 呼び出しが発生する。
--
-- 新設計: 月次チェック（ユーザー/グローバル）も同一 advisory lock・同一トランザクション内で
--         実行する。p_monthly_limit / p_global_monthly_limit が 0 ならスキップして後方互換維持。
--
-- 旧 4 引数シグネチャは明示的に DROP して TOCTOU の抜け穴を残さない (#48 H-1 取締役会 [I-2])。

DROP FUNCTION IF EXISTS check_and_record_rate_limit(uuid, text, integer, integer);

CREATE OR REPLACE FUNCTION check_and_record_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_limit integer,
  p_window_seconds integer,
  p_monthly_limit integer DEFAULT 0,
  p_global_monthly_limit integer DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock_key bigint;
  v_minute_count integer;
  v_monthly_count integer;
  v_global_count integer;
  -- 月次窓は常に初期化しておく (取締役会 [I-1] 対応: p_monthly_limit=0 && p_global_monthly_limit>0
  -- のケースで NULL 参照になりグローバル月次チェックがスキップされるバグを防ぐ)。
  v_monthly_since timestamptz := now() - interval '30 days';
BEGIN
  -- (user_id, endpoint) ペアごとに直列化。
  v_lock_key := hashtextextended(p_user_id::text || '|' || p_endpoint, 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 分次チェック
  SELECT count(*) INTO v_minute_count
  FROM api_calls
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND called_at >= (now() - make_interval(secs => p_window_seconds));

  IF v_minute_count >= p_limit THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'minute', 'retry_after', p_window_seconds);
  END IF;

  -- 月次ユーザークォータ（p_monthly_limit > 0 の場合のみ）
  IF p_monthly_limit > 0 THEN
    SELECT count(*) INTO v_monthly_count
    FROM api_calls
    WHERE user_id = p_user_id
      AND endpoint = p_endpoint
      AND called_at >= v_monthly_since;

    IF v_monthly_count >= p_monthly_limit THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'monthly_user', 'retry_after', 86400);
    END IF;
  END IF;

  -- 月次グローバルクォータ（p_global_monthly_limit > 0 の場合のみ）
  IF p_global_monthly_limit > 0 THEN
    SELECT count(*) INTO v_global_count
    FROM api_calls
    WHERE endpoint = p_endpoint
      AND called_at >= v_monthly_since;

    IF v_global_count >= p_global_monthly_limit THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'monthly_global', 'retry_after', 86400);
    END IF;
  END IF;

  INSERT INTO api_calls (user_id, endpoint) VALUES (p_user_id, p_endpoint);

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- service_role からのみ呼べるように制限。
REVOKE ALL ON FUNCTION check_and_record_rate_limit(uuid, text, integer, integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_and_record_rate_limit(uuid, text, integer, integer, integer, integer) TO service_role;
