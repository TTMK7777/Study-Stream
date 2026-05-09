-- RLS ポリシー（Drizzle は RLS を自動生成しないため手書き）
-- 適用方法: Supabase SQL Editor でこのファイル全体を貼って実行
-- 前提: drizzle/0000_init.sql を先に適用済み

-- =========================================================
-- 1. 全テーブルで RLS を有効化
-- =========================================================
ALTER TABLE "profiles"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lessons_cache"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "study_history"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "highlights"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "api_calls"      ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 2. profiles: 自分の行のみ操作可
-- =========================================================
CREATE POLICY "profiles_select_own" ON "profiles"
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own" ON "profiles"
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON "profiles"
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- 3. lessons_cache: authenticated 全員 SELECT 可（コスト共有）
--    INSERT/UPDATE/DELETE は service_role のみ（RLS デフォルト deny）
-- =========================================================
CREATE POLICY "lessons_cache_select_all_auth" ON "lessons_cache"
  FOR SELECT TO authenticated
  USING (true);

-- =========================================================
-- 4. study_history: 自分の行のみ
-- =========================================================
CREATE POLICY "study_history_select_own" ON "study_history"
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "study_history_insert_own" ON "study_history"
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "study_history_delete_own" ON "study_history"
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- =========================================================
-- 5. highlights: 自分の行のみ（フル CRUD）
-- =========================================================
CREATE POLICY "highlights_select_own" ON "highlights"
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "highlights_insert_own" ON "highlights"
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "highlights_update_own" ON "highlights"
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "highlights_delete_own" ON "highlights"
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- =========================================================
-- 6. api_calls: service_role のみ（authenticated 公開ポリシー無し）
--    アプリは service_role 経由でのみ INSERT/SELECT する想定
-- =========================================================
-- 明示的にポリシーを作らないことで authenticated からは一切見えない／書けない。
