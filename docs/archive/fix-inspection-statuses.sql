-- ============================================
-- 確認記録のステータス修正SQL
-- ============================================

BEGIN;

-- 1. 現在のステータスを確認
SELECT status, COUNT(*) as count
FROM inspections
GROUP BY status
ORDER BY status;

-- 2. 'submitted' を 'pending_approval' に変更
UPDATE inspections
SET status = 'pending_approval',
    submitted_at = COALESCE(submitted_at, created_at)
WHERE status = 'submitted';

-- 3. 不正なステータスを 'draft' に変更
UPDATE inspections
SET status = 'draft'
WHERE status NOT IN ('draft', 'pending_approval', 'approved', 'rejected');

-- 4. submitted_at がない pending_approval レコードに日時を設定
UPDATE inspections
SET submitted_at = created_at
WHERE status = 'pending_approval' AND submitted_at IS NULL;

COMMIT;

-- 5. 修正後の確認
SELECT status, COUNT(*) as count
FROM inspections
GROUP BY status
ORDER BY status;

-- 6. pending_approval レコードの詳細確認
SELECT id, status, submitted_at, created_at
FROM inspections
WHERE status = 'pending_approval'
LIMIT 10;
