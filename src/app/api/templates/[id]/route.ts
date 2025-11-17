import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
    .eq('auth_id', user.id)
    .single()

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // テンプレートを取得（組織の確認）
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
        sort_order
      )
    `)
    .eq('id', id)
    .eq('organization_id', userData.organization_id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
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
    .eq('auth_id', user.id)
    .single()

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const body = await request.json()

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
      const items = body.items.map((item: any, index: number) => ({
        template_id: id,
        item_type: item.itemType,
        label: item.label,
        description: item.description,
        options: item.options || {},
        required: item.required || false,
        sort_order: item.sortOrder !== undefined ? item.sortOrder : index,
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
        sort_order
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
    .eq('auth_id', user.id)
    .single()

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
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
