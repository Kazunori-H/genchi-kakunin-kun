import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { TemplatePayload, TemplateItemPayload } from '@/types/template'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

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

  // テンプレートを取得（組織のテンプレート または システムテンプレート）
  const { data: template, error } = await supabase
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
    .eq('id', id)
    .or(`organization_id.eq.${userData.organization_id},is_system_template.eq.true`)
    .single()

  if (error) {
    console.error('Template fetch error:', error)
    return NextResponse.json({
      error: 'Failed to fetch template',
      details: error.message,
      code: error.code
    }, { status: 500 })
  }

  if (!template) {
    console.error('Template not found:', id)
    return NextResponse.json({
      error: 'Template not found',
      templateId: id
    }, { status: 404 })
  }

  return NextResponse.json(template)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

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

  // Check if this is a system template (cannot be edited)
  const { data: existingTemplate } = await supabase
    .from('templates')
    .select('is_system_template')
    .eq('id', id)
    .single()

  if (existingTemplate?.is_system_template) {
    return NextResponse.json(
      { error: 'システムテンプレートは編集できません' },
      { status: 403 }
    )
  }

  const body = (await request.json()) as TemplatePayload

  // テンプレートを更新（組織の確認）
  const { data: template, error: templateError } = await supabase
    .from('templates')
    .update({
      name: body.name,
      description: body.description,
      category: body.category,
      is_default: body.isDefault,
      sort_order: body.sortOrder,
    })
    .eq('id', id)
    .eq('organization_id', userData.organization_id)
    .select()
    .single()

  if (templateError) {
    return NextResponse.json(
      { error: templateError.message },
      { status: 500 }
    )
  }

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  // テンプレート項目を更新（既存の項目を削除して新しく作成）
  if (body.items !== undefined) {
    // 既存の項目を削除
    await supabase.from('template_items').delete().eq('template_id', id)

    // 新しい項目を作成
    if (body.items && body.items.length > 0) {
      const items = body.items.map((item: TemplateItemPayload, index: number) => ({
        template_id: id,
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
        return NextResponse.json(
          { error: itemsError.message },
          { status: 500 }
        )
      }
    }
  }

  // 更新されたテンプレートをテンプレート項目と一緒に取得
  const { data: updatedTemplate } = await supabase
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
    .eq('id', id)
    .single()

  return NextResponse.json(updatedTemplate)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

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

  // Check if this is a system template (cannot be deleted)
  const { data: existingTemplate } = await supabase
    .from('templates')
    .select('is_system_template')
    .eq('id', id)
    .single()

  if (existingTemplate?.is_system_template) {
    return NextResponse.json(
      { error: 'システムテンプレートは削除できません' },
      { status: 403 }
    )
  }

  // テンプレートを削除（組織の確認）
  // template_items は onDelete: Cascade で自動削除される
  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', id)
    .eq('organization_id', userData.organization_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
