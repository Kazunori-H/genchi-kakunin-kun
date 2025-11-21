import { createAdminClient } from '@/lib/supabase/admin'
import { jsonError } from '@/lib/api/errors'
import { clampApprovalLevel, requireAdmin } from '@/lib/api/authz'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ALLOWED_ROLES = ['inspector', 'approver', 'admin'] as const
type AllowedRole = (typeof ALLOWED_ROLES)[number]

interface InvitePayload {
  email?: string
  name?: string
  role?: AllowedRole
  approval_level?: number
}

export async function GET() {
  const { user, error, status } = await requireAdmin()
  if (!user) return jsonError(error ?? 'Unauthorized', status)

  const supabase = await createClient()
  const { data, error: fetchError } = await supabase
    .from('users')
    .select('id, name, email, role, approval_level, is_active, created_at')
    .eq('organization_id', user.organization_id)
    .order('created_at', { ascending: true })

  if (fetchError || !data) {
    return jsonError(fetchError?.message || 'Failed to fetch users', 500)
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const { user, error, status } = await requireAdmin()
  if (!user) return jsonError(error ?? 'Unauthorized', status)

  const body = (await request.json()) as InvitePayload
  const email = (body.email || '').trim().toLowerCase()
  const name = (body.name || '').trim()
  const role: AllowedRole = ALLOWED_ROLES.includes(body.role as AllowedRole)
    ? (body.role as AllowedRole)
    : 'inspector'
  const supabase = await createClient()

  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .select('approval_levels')
    .eq('id', user.organization_id)
    .single<{ approval_levels: number }>()

  if (orgError || !orgData) {
    return jsonError('組織情報の取得に失敗しました', 500)
  }

  const orgApprovalLevel = clampApprovalLevel(orgData.approval_levels)
  const approvalLevel = Math.min(orgApprovalLevel, clampApprovalLevel(body.approval_level))

  if (!email || !email.includes('@')) {
    return jsonError('有効なメールアドレスを入力してください', 400)
  }

  if (!name) {
    return jsonError('氏名は必須です', 400)
  }

  const adminClient = createAdminClient()
  const appUrl =
    process.env.APP_URL?.replace(/\/+$/, '') || 'http://localhost:3000'
  // 招待ユーザーは認証コールバックで自動的に /auth/set-password にリダイレクトされる
  const inviteRedirect = `${appUrl}/auth/callback`

  // 既に同じメールが同組織に存在するか確認
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .eq('organization_id', user.organization_id)
    .single()

  if (existingUser) {
    return jsonError('同じメールアドレスのユーザーが既に存在します', 400)
  }

  // Supabase Authの招待メールを送信
  const { data: invited, error: inviteError } =
    await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: inviteRedirect,
    })

  if (inviteError || !invited?.user) {
    console.error('Admin inviteUserByEmail failed', inviteError)
    return jsonError('招待メールの送信に失敗しました', 500, {
      details: inviteError?.message || inviteError?.name,
      code: inviteError?.status || inviteError?.code,
    })
  }

  const { data: insertedUser, error: insertError } = await adminClient
    .from('users')
    .upsert(
      {
        id: invited.user.id,
        email,
        name,
        role,
        organization_id: user.organization_id,
        approval_level: approvalLevel,
        is_active: true,
      },
      { onConflict: 'id' }
    )
    .select('id, name, email, role, approval_level, is_active, created_at')
    .single()

  if (insertError || !insertedUser) {
    console.error('Failed to insert user row', insertError)
    return jsonError('ユーザー情報の保存に失敗しました', 500)
  }

  return NextResponse.json({
    user: insertedUser,
    message: '招待メールを送信しました',
  })
}
