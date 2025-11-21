-- ============================================
-- 取り下げアクションの追加
-- ============================================

BEGIN;

-- approval_logs テーブルの action 制約を更新
ALTER TABLE approval_logs DROP CONSTRAINT IF EXISTS approval_logs_action_check;
ALTER TABLE approval_logs ADD CONSTRAINT approval_logs_action_check
  CHECK (action IN ('submit', 'approve', 'reject', 'return', 'withdraw'));

COMMIT;

-- 確認
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'approval_logs_action_check';
