import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import { jsonError } from '@/lib/api/errors'
import { NextResponse } from 'next/server'

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return jsonError('Unauthorized', 401)
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('organizations')
    .select('name, plan, approval_levels, logo_url, settings')
    .eq('id', user.organization_id)
    .single<{
      name: string
      plan: string
      approval_levels: number
      logo_url: string | null
      settings: Record<string, unknown> | null
    }>()

  if (error || !data) {
    return jsonError(error?.message || 'Failed to load organization', 500)
  }

  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return jsonError('Unauthorized', 401)
  }

  if (user.role !== 'admin') {
    return jsonError('管理者のみが組織情報を編集できます', 403)
  }

  const body = (await request.json()) as {
    name?: string
    logo_url?: string | null
    settings?: Record<string, unknown>
  }

  const updates: Record<string, unknown> = {}

  if (body.name !== undefined) {
    if (!body.name || body.name.trim().length === 0) {
      return jsonError('組織名は必須です', 400)
    }
    updates.name = body.name.trim()
  }

  if (body.logo_url !== undefined) {
    updates.logo_url = body.logo_url
  }

  if (body.settings && typeof body.settings === 'object') {
    updates.settings = body.settings
  }

  if (Object.keys(updates).length === 0) {
    return jsonError('更新内容がありません', 400)
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', user.organization_id)

  if (error) {
    return jsonError(error.message, 500)
  }

  return NextResponse.json({ success: true })
}
