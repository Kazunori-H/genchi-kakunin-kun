import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import { getInspectionPhotoBucket } from '@/lib/storage'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const supabase = await createClient()
  const { id, photoId } = await params
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as {
    edited_data?: Record<string, unknown>
  }

  // 写真が存在し、ユーザーが編集権限を持つか確認
  const { data: photo, error: photoError } = await supabase
    .from('photos')
    .select(
      `
        *,
        inspections!photos_inspection_id_fkey (
          id,
          organization_id,
          inspector_id,
          status
        )
      `
    )
    .eq('id', photoId)
    .eq('inspection_id', id)
    .single()

  if (photoError || !photo) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
  }

  const inspection = photo.inspections

  if (!inspection || inspection.id !== id) {
    return NextResponse.json({ error: 'Invalid inspection' }, { status: 400 })
  }

  if (inspection.organization_id !== user.organization_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (
    inspection.status !== 'draft' ||
    (inspection.inspector_id !== user.id && user.role !== 'admin')
  ) {
    return NextResponse.json(
      { error: 'Draft inspections created by you only support editing' },
      { status: 403 }
    )
  }

  // メモを更新
  const { error: updateError } = await supabase
    .from('photos')
    .update({
      edited_data: body.edited_data || {},
    })
    .eq('id', photoId)
    .eq('inspection_id', id)

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message || 'Failed to update photo memo' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const supabase = await createClient()
  const { id, photoId } = await params
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: photo, error: photoError } = await supabase
    .from('photos')
    .select(
      `
        *,
        inspections!photos_inspection_id_fkey (
          id,
          organization_id,
          inspector_id,
          status
        )
      `
    )
    .eq('id', photoId)
    .eq('inspection_id', id)
    .single()

  if (photoError || !photo) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
  }

  const inspection = photo.inspections

  if (!inspection || inspection.id !== id) {
    return NextResponse.json({ error: 'Invalid inspection' }, { status: 400 })
  }

  if (inspection.organization_id !== user.organization_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (
    inspection.status !== 'draft' ||
    (inspection.inspector_id !== user.id && user.role !== 'admin')
  ) {
    return NextResponse.json(
      { error: 'Draft inspections created by you only support deletion' },
      { status: 403 }
    )
  }

  const { error: deleteError } = await supabase
    .from('photos')
    .delete()
    .eq('id', photoId)
    .eq('inspection_id', id)

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message || '写真の削除に失敗しました' },
      { status: 500 }
    )
  }

  const bucket = getInspectionPhotoBucket()
  await supabase.storage.from(bucket).remove([photo.file_path])

  return NextResponse.json({ success: true })
}
