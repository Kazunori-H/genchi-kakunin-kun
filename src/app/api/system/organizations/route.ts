import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/supabase/auth'

interface CreateOrganizationPayload {
  name: string
  plan?: string
  admin: {
    email: string
    name: string
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser()

  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = (await request.json()) as CreateOrganizationPayload

  if (!body.name?.trim()) {
    return NextResponse.json({ error: '組織名は必須です' }, { status: 400 })
  }
  if (!body.admin?.email?.trim() || !body.admin?.name?.trim()) {
    return NextResponse.json(
      { error: '管理者のメールアドレスと氏名は必須です' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const adminClient = createAdminClient()

  // システム管理者であることをサーバー側でも確認
  const { data: requester } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()

  if (requester?.role !== 'admin') {
    return NextResponse.json({ error: 'System admin only' }, { status: 403 })
  }

  // 1. 組織を作成
  const { data: organization, error: orgError } = await adminClient
    .from('organizations')
    .insert({
      name: body.name.trim(),
      plan: body.plan?.trim() || 'free',
    })
    .select()
    .single()

  if (orgError || !organization) {
    return NextResponse.json(
      { error: orgError?.message || 'Failed to create organization' },
      { status: 500 }
    )
  }

  // 2. 管理者アカウントを作成（仮パスワード発行）
  const tempPassword = `Temp${Math.random().toString(36).slice(2, 8)}!`
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser(
    {
      email: body.admin.email.trim(),
      email_confirm: true,
      password: tempPassword,
    }
  )

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message || 'Failed to create admin user' },
      { status: 500 }
    )
  }

  const adminId = authData.user.id

  // 3. ユーザーレコードを登録
  const { error: userError } = await adminClient
    .from('users')
    .insert({
      id: adminId,
      organization_id: organization.id,
      email: body.admin.email.trim(),
      name: body.admin.name.trim(),
      role: 'admin',
      approval_level: 0,
    })

  if (userError) {
    return NextResponse.json(
      { error: userError.message || 'Failed to insert admin user record' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    organization,
    admin: {
      id: adminId,
      email: body.admin.email.trim(),
      tempPassword,
    },
  })
}
