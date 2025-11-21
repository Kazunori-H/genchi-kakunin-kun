# 承認フロー実装手順書

**作成日**: 2025-01-17
**対象フェーズ**: Phase 5 - 承認ワークフロー
**推定工数**: 2-3週間

## 目次

1. [概要](#概要)
2. [要件定義](#要件定義)
3. [データベース設計](#データベース設計)
4. [実装手順](#実装手順)
5. [テスト項目](#テスト項目)

---

## 概要

現地確認記録の承認フローを実装し、組織内での品質管理とレビュープロセスを確立します。

### 主要機能

- 確認記録の提出と承認申請
- 承認者による承認/差し戻し/却下
- 承認履歴の記録
- コメント・フィードバック機能
- 承認待ち一覧の表示
- 通知機能（メール/アプリ内）

### ワークフロー状態遷移

```
draft (下書き)
  ↓ 提出
pending_approval (承認待ち)
  ↓ 承認              ↓ 差し戻し          ↓ 却下
approved (承認済み)   draft (下書き)    rejected (却下)
```

---

## 要件定義

### 1. ユーザーロールと権限

#### 1.1 ロール定義

| ロール | 権限 |
|--------|------|
| `inspector` (確認者) | 確認記録の作成・編集・提出 |
| `approver` (承認者) | 確認記録の承認・差し戻し・却下 |
| `admin` (管理者) | すべての操作 + 承認者の指定 |

#### 1.2 権限マトリックス

| 操作 | inspector | approver | admin |
|------|-----------|----------|-------|
| 確認記録作成 | ✓ | ✓ | ✓ |
| 下書き編集 | ✓ (自分のみ) | - | ✓ |
| 提出 | ✓ (自分のみ) | - | ✓ |
| 承認 | - | ✓ | ✓ |
| 差し戻し | - | ✓ | ✓ |
| 却下 | - | ✓ | ✓ |
| 承認者指定 | - | - | ✓ |

### 2. 承認フローの詳細仕様

#### 2.1 基本フロー

1. **提出** (`draft` → `pending_approval`)
   - 確認者が記録を完成させ提出
   - 必須項目の入力チェック
   - 承認者に通知

2. **承認** (`pending_approval` → `approved`)
   - 承認者がレビューし承認
   - 承認コメント（オプション）
   - 提出者に通知

3. **差し戻し** (`pending_approval` → `draft`)
   - 承認者が修正を求めて差し戻し
   - 差し戻し理由（必須）
   - 提出者に通知
   - 確認者が修正後、再提出可能

4. **却下** (`pending_approval` → `rejected`)
   - 承認者が記録を却下
   - 却下理由（必須）
   - 提出者に通知
   - 再提出不可（新規作成が必要）

#### 2.2 承認者の指定方法

**パターンA: 組織固定承認者**（今回実装）
- 組織ごとに承認者を指定
- すべての確認記録を同じ承認者が承認

**パターンB: 施設別承認者**（将来拡張）
- 施設ごとに承認者を指定

**パターンC: 多段階承認**（将来拡張）
- 1次承認者 → 2次承認者

---

## データベース設計

### 1. テーブル追加・変更

#### 1.1 `users` テーブル変更

```sql
-- ユーザーロールの追加
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'inspector';
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('inspector', 'approver', 'admin'));

-- ロール用のインデックス
CREATE INDEX idx_users_organization_role ON users(organization_id, role);
```

#### 1.2 `inspections` テーブル変更

```sql
-- ステータスの拡張
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS inspections_status_check;
ALTER TABLE inspections ADD CONSTRAINT inspections_status_check
  CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected'));

-- 承認者と承認日時の追加
ALTER TABLE inspections ADD COLUMN approver_id UUID REFERENCES users(id);
ALTER TABLE inspections ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE inspections ADD COLUMN submitted_at TIMESTAMP WITH TIME ZONE;

-- インデックス
CREATE INDEX idx_inspections_status ON inspections(status);
CREATE INDEX idx_inspections_approver ON inspections(approver_id);
```

#### 1.3 `approval_logs` テーブル新規作成

```sql
-- 承認履歴テーブル
CREATE TABLE approval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL CHECK (action IN ('submit', 'approve', 'reject', 'return')),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT approval_logs_inspection_fkey FOREIGN KEY (inspection_id)
    REFERENCES inspections(id) ON DELETE CASCADE,
  CONSTRAINT approval_logs_actor_fkey FOREIGN KEY (actor_id)
    REFERENCES users(id)
);

-- インデックス
CREATE INDEX idx_approval_logs_inspection ON approval_logs(inspection_id);
CREATE INDEX idx_approval_logs_created_at ON approval_logs(created_at DESC);

-- RLSポリシー
ALTER TABLE approval_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view approval logs in their organization"
  ON approval_logs FOR SELECT
  USING (
    inspection_id IN (
      SELECT i.id FROM inspections i
      JOIN users u ON u.organization_id = i.organization_id
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "Users can create approval logs for inspections in their organization"
  ON approval_logs FOR INSERT
  WITH CHECK (
    inspection_id IN (
      SELECT i.id FROM inspections i
      JOIN users u ON u.organization_id = i.organization_id
      WHERE u.id = auth.uid()
    )
  );
```

#### 1.4 `organization_settings` テーブル新規作成

```sql
-- 組織設定テーブル（承認者管理）
CREATE TABLE organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  default_approver_id UUID REFERENCES users(id),
  require_approval BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT organization_settings_organization_fkey FOREIGN KEY (organization_id)
    REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT organization_settings_approver_fkey FOREIGN KEY (default_approver_id)
    REFERENCES users(id)
);

-- RLSポリシー
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization settings"
  ON organization_settings FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can update their organization settings"
  ON organization_settings FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### 2. マイグレーションファイル

ファイル名: `add-approval-workflow.sql`

```sql
-- ============================================
-- 承認ワークフロー機能追加マイグレーション
-- ============================================

BEGIN;

-- 1. ユーザーロールの追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'inspector';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('inspector', 'approver', 'admin'));

CREATE INDEX IF NOT EXISTS idx_users_organization_role ON users(organization_id, role);

-- 2. inspectionsテーブルの拡張
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS inspections_status_check;
ALTER TABLE inspections ADD CONSTRAINT inspections_status_check
  CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected'));

ALTER TABLE inspections ADD COLUMN IF NOT EXISTS approver_id UUID REFERENCES users(id);
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspections_approver ON inspections(approver_id);

-- 3. 承認履歴テーブル
CREATE TABLE IF NOT EXISTS approval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL CHECK (action IN ('submit', 'approve', 'reject', 'return')),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_approval_logs_inspection ON approval_logs(inspection_id);
CREATE INDEX IF NOT EXISTS idx_approval_logs_created_at ON approval_logs(created_at DESC);

ALTER TABLE approval_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view approval logs in their organization" ON approval_logs;
CREATE POLICY "Users can view approval logs in their organization"
  ON approval_logs FOR SELECT
  USING (
    inspection_id IN (
      SELECT i.id FROM inspections i
      JOIN users u ON u.organization_id = i.organization_id
      WHERE u.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create approval logs" ON approval_logs;
CREATE POLICY "Users can create approval logs"
  ON approval_logs FOR INSERT
  WITH CHECK (
    inspection_id IN (
      SELECT i.id FROM inspections i
      JOIN users u ON u.organization_id = i.organization_id
      WHERE u.id = auth.uid()
    )
  );

-- 4. 組織設定テーブル
CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  default_approver_id UUID REFERENCES users(id),
  require_approval BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization settings" ON organization_settings;
CREATE POLICY "Users can view their organization settings"
  ON organization_settings FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can update their organization settings" ON organization_settings;
CREATE POLICY "Admins can update their organization settings"
  ON organization_settings FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMIT;
```

---

## 実装手順

実装は以下の順序で進めます。

### Phase 1: データベース基盤構築（1-2日）

#### ステップ 1.1: マイグレーション実行

1. `add-approval-workflow.sql` を作成
2. Supabase SQL Editor で実行
3. テーブル・カラムが正しく追加されたか確認

```sql
-- 確認クエリ
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'role';

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'inspections' AND column_name IN ('approver_id', 'approved_at', 'submitted_at');

SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('approval_logs', 'organization_settings');
```

#### ステップ 1.2: 初期データ投入

```sql
-- 既存ユーザーに管理者ロールを付与（組織ごとに1名）
UPDATE users
SET role = 'admin'
WHERE id IN (
  SELECT DISTINCT ON (organization_id) id
  FROM users
  ORDER BY organization_id, created_at
);

-- 組織設定の初期化
INSERT INTO organization_settings (organization_id, require_approval)
SELECT id, true FROM organizations
ON CONFLICT (organization_id) DO NOTHING;
```

### Phase 2: バックエンド API 実装（3-4日）

#### ステップ 2.1: ユーザーロール取得API

ファイル: `src/lib/supabase/auth.ts`

```typescript
import { createClient } from '@/lib/supabase/server'

export async function getCurrentUser() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: userData } = await supabase
    .from('users')
    .select('id, name, email, organization_id, role')
    .eq('id', user.id)
    .single()

  return userData
}

export async function checkPermission(
  requiredRole: 'inspector' | 'approver' | 'admin'
): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false

  const roleHierarchy = {
    inspector: 1,
    approver: 2,
    admin: 3,
  }

  return roleHierarchy[user.role] >= roleHierarchy[requiredRole]
}
```

#### ステップ 2.2: 確認記録提出API

ファイル: `src/app/api/inspections/[id]/submit/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 確認記録の取得と権限チェック
  const { data: inspection, error: fetchError } = await supabase
    .from('inspections')
    .select('*, inspection_items(*)')
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .eq('inspector_id', user.id)
    .single()

  if (fetchError || !inspection) {
    return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
  }

  if (inspection.status !== 'draft') {
    return NextResponse.json(
      { error: 'Only draft inspections can be submitted' },
      { status: 400 }
    )
  }

  // 必須項目のチェック（テンプレートから取得）
  const { data: template } = await supabase
    .from('templates')
    .select('template_items(*)')
    .eq('id', inspection.template_id)
    .single()

  const requiredItems = template?.template_items.filter(
    (item: any) => item.required && item.item_type !== 'section_header'
  )

  const filledItems = inspection.inspection_items.filter(
    (item: any) => item.value && item.value !== ''
  )

  const missingItems = requiredItems?.filter(
    (req: any) =>
      !filledItems.find((filled: any) => filled.template_item_id === req.id)
  )

  if (missingItems && missingItems.length > 0) {
    return NextResponse.json(
      { error: `必須項目が入力されていません（${missingItems.length}件）` },
      { status: 400 }
    )
  }

  // 組織の承認者を取得
  const { data: orgSettings } = await supabase
    .from('organization_settings')
    .select('default_approver_id')
    .eq('organization_id', user.organization_id)
    .single()

  // ステータス更新
  const { data: updatedInspection, error: updateError } = await supabase
    .from('inspections')
    .update({
      status: 'pending_approval',
      submitted_at: new Date().toISOString(),
      approver_id: orgSettings?.default_approver_id || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // 承認履歴の記録
  await supabase.from('approval_logs').insert({
    inspection_id: id,
    actor_id: user.id,
    action: 'submit',
    comment: null,
  })

  // TODO: 承認者への通知

  return NextResponse.json(updatedInspection)
}
```

#### ステップ 2.3: 承認・差し戻し・却下API

ファイル: `src/app/api/inspections/[id]/approve/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getCurrentUser, checkPermission } from '@/lib/supabase/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 承認者権限チェック
  const hasPermission = await checkPermission('approver')
  if (!hasPermission) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { action, comment } = body // action: 'approve' | 'return' | 'reject'

  if (!['approve', 'return', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  // 差し戻し・却下時はコメント必須
  if ((action === 'return' || action === 'reject') && !comment) {
    return NextResponse.json(
      { error: 'Comment is required for return/reject' },
      { status: 400 }
    )
  }

  // 確認記録の取得と権限チェック
  const { data: inspection, error: fetchError } = await supabase
    .from('inspections')
    .select('*')
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .single()

  if (fetchError || !inspection) {
    return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
  }

  if (inspection.status !== 'pending_approval') {
    return NextResponse.json(
      { error: 'Only pending inspections can be approved/rejected' },
      { status: 400 }
    )
  }

  // ステータスマッピング
  const statusMap = {
    approve: 'approved',
    return: 'draft',
    reject: 'rejected',
  }

  const newStatus = statusMap[action as keyof typeof statusMap]

  // ステータス更新
  const updateData: any = {
    status: newStatus,
    approver_id: user.id,
  }

  if (action === 'approve') {
    updateData.approved_at = new Date().toISOString()
  }

  const { data: updatedInspection, error: updateError } = await supabase
    .from('inspections')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // 承認履歴の記録
  await supabase.from('approval_logs').insert({
    inspection_id: id,
    actor_id: user.id,
    action,
    comment: comment || null,
  })

  // TODO: 提出者への通知

  return NextResponse.json(updatedInspection)
}
```

#### ステップ 2.4: 承認履歴取得API

ファイル: `src/app/api/inspections/[id]/logs/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: logs, error } = await supabase
    .from('approval_logs')
    .select(`
      *,
      users!approval_logs_actor_id_fkey (
        id,
        name,
        email
      )
    `)
    .eq('inspection_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(logs)
}
```

#### ステップ 2.5: 承認待ち一覧API

ファイル: `src/app/api/approvals/pending/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getCurrentUser, checkPermission } from '@/lib/supabase/auth'

export async function GET() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hasPermission = await checkPermission('approver')
  if (!hasPermission) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: inspections, error } = await supabase
    .from('inspections')
    .select(`
      *,
      sites (
        id,
        name,
        address
      ),
      templates (
        id,
        name
      ),
      users!inspections_inspector_id_fkey (
        id,
        name
      )
    `)
    .eq('organization_id', user.organization_id)
    .eq('status', 'pending_approval')
    .order('submitted_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(inspections)
}
```

### Phase 3: フロントエンド実装（5-7日）

#### ステップ 3.1: 確認記録詳細ページ更新

ファイル: `src/app/inspections/[id]/page.tsx`

既存の「提出する」ボタンの処理を変更：

```typescript
const handleSubmit = async () => {
  if (!confirm('確認記録を提出しますか？提出後は編集できません。')) {
    return
  }

  setIsSaving(true)
  setError(null)

  try {
    const response = await fetch(`/api/inspections/${params.id}/submit`, {
      method: 'POST',
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to submit inspection')
    }

    alert('確認記録を提出しました')
    router.push('/inspections')
    router.refresh()
  } catch (err: any) {
    setError(err.message || '提出に失敗しました')
  } finally {
    setIsSaving(false)
  }
}
```

承認者向けのアクションボタンを追加：

```typescript
{inspection.status === 'pending_approval' && user?.role !== 'inspector' && (
  <div className="mt-8 pt-6 border-t border-gray-200">
    <h3 className="text-lg font-medium text-gray-900 mb-4">承認アクション</h3>

    <div className="space-y-4">
      <div>
        <label htmlFor="approvalComment" className="block text-sm font-medium text-gray-700">
          コメント
        </label>
        <textarea
          id="approvalComment"
          rows={3}
          value={approvalComment}
          onChange={(e) => setApprovalComment(e.target.value)}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="承認・差し戻し・却下の理由を入力してください"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => handleApprovalAction('approve')}
          disabled={isSaving}
          className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          承認
        </button>
        <button
          onClick={() => handleApprovalAction('return')}
          disabled={isSaving || !approvalComment}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          差し戻し
        </button>
        <button
          onClick={() => handleApprovalAction('reject')}
          disabled={isSaving || !approvalComment}
          className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
        >
          却下
        </button>
      </div>
    </div>
  </div>
)}
```

承認履歴の表示：

```typescript
const [approvalLogs, setApprovalLogs] = useState<any[]>([])

useEffect(() => {
  fetchApprovalLogs()
}, [params.id])

const fetchApprovalLogs = async () => {
  try {
    const response = await fetch(`/api/inspections/${params.id}/logs`)
    if (response.ok) {
      const data = await response.json()
      setApprovalLogs(data)
    }
  } catch (err) {
    console.error('Failed to fetch approval logs', err)
  }
}

// 表示部分
{approvalLogs.length > 0 && (
  <div className="mt-6 bg-gray-50 rounded-lg p-4">
    <h3 className="text-sm font-medium text-gray-900 mb-3">承認履歴</h3>
    <div className="space-y-3">
      {approvalLogs.map((log) => (
        <div key={log.id} className="text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">{log.users.name}</span>
            <span className="text-gray-500">
              {log.action === 'submit' && '提出'}
              {log.action === 'approve' && '承認'}
              {log.action === 'return' && '差し戻し'}
              {log.action === 'reject' && '却下'}
            </span>
            <span className="text-gray-400">
              {new Date(log.created_at).toLocaleString('ja-JP')}
            </span>
          </div>
          {log.comment && (
            <p className="mt-1 text-gray-600 ml-2">{log.comment}</p>
          )}
        </div>
      ))}
    </div>
  </div>
)}
```

#### ステップ 3.2: 承認待ち一覧ページ

ファイル: `src/app/approvals/page.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface PendingInspection {
  id: string
  inspection_date: string
  submitted_at: string
  sites: {
    id: string
    name: string
    address: string | null
  }
  templates: {
    id: string
    name: string
  }
  users: {
    id: string
    name: string
  }
}

export default function ApprovalsPage() {
  const [inspections, setInspections] = useState<PendingInspection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPendingInspections()
  }, [])

  const fetchPendingInspections = async () => {
    try {
      const response = await fetch('/api/approvals/pending')
      if (!response.ok) {
        throw new Error('Failed to fetch pending inspections')
      }
      const data = await response.json()
      setInspections(data)
    } catch (err) {
      setError('承認待ち一覧の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">承認待ち確認記録</h1>
        <p className="mt-2 text-sm text-gray-600">
          承認待ちの確認記録一覧です。内容を確認し、承認・差し戻し・却下を行ってください。
        </p>
      </div>

      {inspections.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            承認待ちの記録はありません
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            すべての確認記録が処理されています
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {inspections.map((inspection) => (
              <li key={inspection.id}>
                <Link
                  href={`/inspections/${inspection.id}`}
                  className="block hover:bg-gray-50 transition"
                >
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          {inspection.sites.name}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                          <span>
                            確認日:{' '}
                            {new Date(inspection.inspection_date).toLocaleDateString(
                              'ja-JP'
                            )}
                          </span>
                          <span>テンプレート: {inspection.templates.name}</span>
                          <span>確認者: {inspection.users.name}</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-400">
                          提出日時:{' '}
                          {new Date(inspection.submitted_at).toLocaleString('ja-JP')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          承認待ち
                        </span>
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

#### ステップ 3.3: ナビゲーション更新

`src/app/dashboard/layout.tsx`, `src/app/inspections/layout.tsx` などに承認ページへのリンクを追加：

```typescript
{user?.role !== 'inspector' && (
  <Link
    href="/approvals"
    className={`px-3 py-2 rounded-md text-sm font-medium ${
      pathname === '/approvals'
        ? 'bg-indigo-700 text-white'
        : 'text-white hover:bg-indigo-600'
    }`}
  >
    承認待ち
  </Link>
)}
```

#### ステップ 3.4: ステータスバッジコンポーネント

ファイル: `src/components/StatusBadge.tsx`

```typescript
interface StatusBadgeProps {
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected'
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    draft: {
      label: '下書き',
      className: 'bg-gray-100 text-gray-800',
    },
    pending_approval: {
      label: '承認待ち',
      className: 'bg-yellow-100 text-yellow-800',
    },
    approved: {
      label: '承認済み',
      className: 'bg-green-100 text-green-800',
    },
    rejected: {
      label: '却下',
      className: 'bg-red-100 text-red-800',
    },
  }

  const { label, className } = config[status]

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {label}
    </span>
  )
}
```

### Phase 4: 管理機能実装（2-3日）

#### ステップ 4.1: 組織設定ページ

ファイル: `src/app/settings/organization/page.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface OrganizationSettings {
  id: string
  default_approver_id: string | null
  require_approval: boolean
}

export default function OrganizationSettingsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [settings, setSettings] = useState<OrganizationSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [usersRes, settingsRes] = await Promise.all([
        fetch('/api/users?role=approver,admin'),
        fetch('/api/settings/organization'),
      ])

      if (!usersRes.ok || !settingsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const usersData = await usersRes.json()
      const settingsData = await settingsRes.json()

      setUsers(usersData)
      setSettings(settingsData)
    } catch (err) {
      setError('設定の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/settings/organization', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      alert('設定を保存しました')
    } catch (err) {
      setError('設定の保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">読み込み中...</div>
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">組織設定</h1>
        <p className="mt-2 text-sm text-gray-600">
          承認フローや組織全体の設定を管理します
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            承認フロー設定
          </h3>

          <div className="space-y-6">
            <div className="flex items-center">
              <input
                id="require_approval"
                type="checkbox"
                checked={settings?.require_approval || false}
                onChange={(e) =>
                  setSettings(
                    settings
                      ? { ...settings, require_approval: e.target.checked }
                      : null
                  )
                }
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label
                htmlFor="require_approval"
                className="ml-2 block text-sm text-gray-900"
              >
                確認記録に承認を必須とする
              </label>
            </div>

            <div>
              <label
                htmlFor="default_approver"
                className="block text-sm font-medium text-gray-700"
              >
                デフォルト承認者
              </label>
              <select
                id="default_approver"
                value={settings?.default_approver_id || ''}
                onChange={(e) =>
                  setSettings(
                    settings
                      ? { ...settings, default_approver_id: e.target.value || null }
                      : null
                  )
                }
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">選択してください</option>
                {users
                  .filter((u) => u.role === 'approver' || u.role === 'admin')
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
              </select>
              <p className="mt-2 text-sm text-gray-500">
                すべての確認記録がこのユーザーに承認依頼されます
              </p>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

#### ステップ 4.2: ユーザー管理ページ（ロール変更）

ファイル: `src/app/settings/users/page.tsx`

管理者がユーザーのロールを変更できる画面を実装。

### Phase 5: テストと調整（2-3日）

---

## テスト項目

### 1. 機能テスト

#### 1.1 基本フロー

- [ ] 確認者が下書きを作成できる
- [ ] 確認者が下書きを提出できる
- [ ] 承認者が承認待ち一覧を表示できる
- [ ] 承認者が記録を承認できる
- [ ] 承認者が記録を差し戻しできる
- [ ] 承認者が記録を却下できる
- [ ] 差し戻された記録を再編集・再提出できる

#### 1.2 権限テスト

- [ ] 確認者は承認アクションを実行できない
- [ ] 他人の記録を編集できない
- [ ] 他組織の記録を閲覧・編集できない
- [ ] 承認者でないユーザーは承認待ち一覧を閲覧できない

#### 1.3 バリデーション

- [ ] 必須項目が未入力の場合、提出できない
- [ ] 差し戻し・却下時、コメントなしで実行できない
- [ ] すでに承認済みの記録を再承認できない

### 2. UI/UXテスト

- [ ] ステータスバッジが正しく表示される
- [ ] 承認履歴が時系列で表示される
- [ ] 承認待ち件数がナビゲーションに表示される
- [ ] モバイルでも操作しやすい

### 3. パフォーマンステスト

- [ ] 承認待ち一覧が高速に表示される
- [ ] 承認履歴取得が高速

---

## 追加機能（オプション）

### 1. 通知機能

- メール通知
- アプリ内通知
- Slack連携

### 2. 多段階承認

- 1次承認者 → 2次承認者
- 条件付き承認ルート

### 3. 一括承認

- 複数の記録を一度に承認

### 4. 承認期限

- 提出から○日以内に承認必須
- 期限超過時の自動リマインド

---

## まとめ

この手順書に従って実装することで、以下が実現されます：

1. ✅ 確認記録の提出・承認フロー
2. ✅ ロールベースのアクセス制御
3. ✅ 承認履歴の記録と表示
4. ✅ 差し戻し・却下機能
5. ✅ 承認待ち一覧の表示

**推定工数**: 2-3週間
**優先度**: 高（MVPに必須）

実装を開始する準備ができましたら、Phase 1から順番に進めていきましょう。
