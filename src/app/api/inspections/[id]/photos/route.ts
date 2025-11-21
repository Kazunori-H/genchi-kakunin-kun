import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import { getInspectionPhotoBucket, getPublicStorageUrl } from '@/lib/storage'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

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

  const formData = await request.formData()
  const file = formData.get('file')
  const templateItemIdRaw = formData.get('templateItemId')
  const templateItemId =
    typeof templateItemIdRaw === 'string' && templateItemIdRaw.trim().length > 0
      ? templateItemIdRaw.trim()
      : null

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: '画像ファイルが必要です' },
      { status: 400 }
    )
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json(
      { error: '画像ファイルのみアップロードできます' },
      { status: 400 }
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'ファイルサイズは5MBまでです' },
      { status: 400 }
    )
  }

  const { data: inspection, error: inspectionError } = await supabase
    .from('inspections')
    .select('id, organization_id, inspector_id, status, template_id')
    .eq('id', id)
    .single()

  if (inspectionError || !inspection) {
    return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
  }

  if (inspection.organization_id !== user.organization_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (
    inspection.status !== 'draft' ||
    (inspection.inspector_id !== user.id && user.role !== 'admin')
  ) {
    return NextResponse.json(
      { error: 'Draft inspections created by you only support uploads' },
      { status: 403 }
    )
  }

  let inspectionItemId: string | null = null

  if (templateItemId) {
    const { data: templateItem, error: templateError } = await supabase
      .from('template_items')
      .select('id')
      .eq('id', templateItemId)
      .eq('template_id', inspection.template_id)
      .single()

    if (templateError || !templateItem) {
      return NextResponse.json(
        { error: 'テンプレート項目が無効です' },
        { status: 400 }
      )
    }

    const { data: existingItem } = await supabase
      .from('inspection_items')
      .select('id')
      .eq('inspection_id', id)
      .eq('template_item_id', templateItemId)
      .single()

    if (existingItem) {
      inspectionItemId = existingItem.id
    } else {
      const { data: newItem, error: newItemError } = await supabase
        .from('inspection_items')
        .insert({
          inspection_id: id,
          template_item_id: templateItemId,
          value: null,
          metadata: {},
        })
        .select('id')
        .single()

      if (newItemError || !newItem) {
        return NextResponse.json(
          { error: 'チェック項目の作成に失敗しました' },
          { status: 500 }
        )
      }

      inspectionItemId = newItem.id
    }
  }

  const bucket = getInspectionPhotoBucket()
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const folderSegment = templateItemId ? templateItemId : 'summary'
  const objectPath = `${user.organization_id}/${id}/${folderSegment}/${randomUUID()}.${fileExt}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(objectPath, buffer, {
      contentType: file.type || 'image/jpeg',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message || '画像のアップロードに失敗しました' },
      { status: 500 }
    )
  }

  const { data: photo, error: photoError } = await supabase
    .from('photos')
    .insert({
      inspection_id: id,
      inspection_item_id: inspectionItemId,
      file_path: objectPath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || 'image/jpeg',
    })
    .select('*')
    .single()

  if (photoError || !photo) {
    // 失敗した場合はアップロード済みのファイルを削除
    await supabase.storage.from(bucket).remove([objectPath])
    return NextResponse.json(
      { error: photoError?.message || '写真の保存に失敗しました' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ...photo,
    template_item_id: templateItemId,
    public_url: getPublicStorageUrl(photo.file_path),
  })
}
