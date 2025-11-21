import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { TemplatePayload, TemplateItemPayload } from '@/types/template'

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

  // 組織のテンプレート + システムテンプレートを取得（テンプレート項目も含む）
  const { data: templates, error } = await supabase
    .from('templates')
    .select(`
      *,
      template_items (
        id,
        item_type,
        label,
        description,
        options,
        required,
        sort_order,
        display_facility_types
      )
    `)
    .or(`organization_id.eq.${userData.organization_id},is_system_template.eq.true`)
    .order('is_system_template', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(templates)
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

  const body = (await request.json()) as TemplatePayload

  // テンプレートを作成
  const { data: template, error: templateError } = await supabase
    .from('templates')
    .insert({
      organization_id: userData.organization_id,
      name: body.name,
      description: body.description,
      category: body.category,
      is_default: body.isDefault || false,
      sort_order: body.sortOrder || 0,
    })
    .select()
    .single()

  if (templateError) {
    return NextResponse.json(
      { error: templateError.message },
      { status: 500 }
    )
  }

  // テンプレート項目を作成
  if (body.items && body.items.length > 0) {
    const items = body.items.map((item: TemplateItemPayload, index: number) => ({
      template_id: template.id,
      item_type: item.itemType,
      label: item.label,
      description: item.description ?? null,
      options: item.options || {},
      required: item.required ?? false,
      sort_order: item.sortOrder ?? index,
      display_facility_types: item.displayFacilityTypes ?? [],
    }))

    const { error: itemsError } = await supabase
      .from('template_items')
      .insert(items)

    if (itemsError) {
      // テンプレート項目の作成に失敗した場合、テンプレートも削除
      await supabase.from('templates').delete().eq('id', template.id)
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }
  }

  // 作成したテンプレートをテンプレート項目と一緒に取得
  const { data: createdTemplate } = await supabase
    .from('templates')
    .select(`
      *,
      template_items (
        id,
        item_type,
        label,
        description,
        options,
        required,
        sort_order
      )
    `)
    .eq('id', template.id)
    .single()

  return NextResponse.json(createdTemplate)
}
