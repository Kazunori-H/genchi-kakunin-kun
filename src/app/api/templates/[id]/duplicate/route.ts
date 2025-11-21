import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { TemplateItemRecord } from '@/types/inspection'

export async function POST(
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

  // 元のテンプレートを取得（組織のテンプレート または システムテンプレート）
  const { data: originalTemplate, error: fetchError } = await supabase
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

  if (fetchError || !originalTemplate) {
    return NextResponse.json(
      { error: 'Template not found' },
      { status: 404 }
    )
  }

  // 新しいテンプレート名を生成（コピーを追加）
  const newName = `${originalTemplate.name}（コピー）`

  // 新しいテンプレートを作成
  const { data: newTemplate, error: createError } = await supabase
    .from('templates')
    .insert({
      organization_id: userData.organization_id,
      name: newName,
      description: originalTemplate.description,
      category: originalTemplate.category,
      is_default: false, // コピーはデフォルトにしない
      sort_order: originalTemplate.sort_order,
      is_system_template: false, // コピーはシステムテンプレートにしない
    })
    .select()
    .single()

  if (createError || !newTemplate) {
    return NextResponse.json(
      { error: 'Failed to create template copy' },
      { status: 500 }
    )
  }

  // テンプレート項目をコピー
  if (originalTemplate.template_items && originalTemplate.template_items.length > 0) {
    const newItems = originalTemplate.template_items.map((item: TemplateItemRecord & { display_facility_types?: string[] | null }) => ({
      template_id: newTemplate.id,
      item_type: item.item_type,
      label: item.label,
      description: item.description,
      options: item.options,
      required: item.required,
      sort_order: item.sort_order,
      display_facility_types: item.display_facility_types || [],
    }))

    const { error: itemsError } = await supabase
      .from('template_items')
      .insert(newItems)

    if (itemsError) {
      // 項目の作成に失敗した場合、テンプレートも削除
      await supabase.from('templates').delete().eq('id', newTemplate.id)
      return NextResponse.json(
        { error: 'Failed to copy template items' },
        { status: 500 }
      )
    }
  }

  // 作成したテンプレートを項目と一緒に返す
  const { data: completeTemplate } = await supabase
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
    .eq('id', newTemplate.id)
    .single()

  return NextResponse.json(completeTemplate)
}
