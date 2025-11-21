import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ユーザーの所属組織IDを取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // 組織の確認記録を取得
  const { data: inspections, error } = await supabase
    .from('inspections')
    .select(`
      *,
      sites (
        id,
        name
      ),
      templates (
        id,
        name
      ),
      inspector:users!inspector_id (
        id,
        name,
        email
      )
    `)
    .eq('organization_id', userData.organization_id)
    .order('inspection_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(inspections)
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ユーザーの所属組織IDを取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const body = await request.json()

  // 確認記録を作成
  const { data: inspection, error: inspectionError } = await supabase
    .from('inspections')
    .insert({
      organization_id: userData.organization_id,
      site_id: body.siteId,
      template_id: body.templateId,
      inspector_id: user.id,
      inspection_date: body.inspectionDate,
      status: 'draft',
      summary: body.summary || null,
    })
    .select()
    .single()

  if (inspectionError) {
    return NextResponse.json(
      { error: inspectionError.message },
      { status: 500 }
    )
  }

  return NextResponse.json(inspection)
}
