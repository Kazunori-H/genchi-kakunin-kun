import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import {
  extractStoragePathFromPublicUrl,
  getOrganizationLogoBucket,
  getOrganizationLogoPublicUrl,
} from '@/lib/storage'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

export async function POST(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role !== 'admin') {
    return NextResponse.json(
      { error: '管理者のみがロゴを更新できます' },
      { status: 403 }
    )
  }

  const formData = await request.formData()
  const file = formData.get('file')

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
      { error: 'ファイルサイズは2MBまでです' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const bucket = getOrganizationLogoBucket()

  // 古いロゴを削除するため現在のロゴURLを取得
  const { data: orgData } = await supabase
    .from('organizations')
    .select('logo_url')
    .eq('id', user.organization_id)
    .single<{ logo_url: string | null }>()

  const extension =
    (file.name && file.name.includes('.') && file.name.split('.').pop()) ||
    file.type.split('/').pop() ||
    'png'
  const objectPath = `${user.organization_id}/logo-${randomUUID()}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(objectPath, file, {
      upsert: true,
      cacheControl: '3600',
      contentType: file.type,
    })

  if (uploadError) {
    console.error('Organization logo upload failed', uploadError)
    return NextResponse.json({ error: 'ロゴのアップロードに失敗しました' }, { status: 500 })
  }

  const logoUrl = getOrganizationLogoPublicUrl(objectPath)

  const { error: updateError } = await supabase
    .from('organizations')
    .update({ logo_url: logoUrl })
    .eq('id', user.organization_id)

  if (updateError) {
    console.error('Failed to update organization logo url', updateError)
    return NextResponse.json({ error: 'ロゴの保存に失敗しました' }, { status: 500 })
  }

  // 古いロゴがあれば削除（失敗しても致命的ではないのでログだけ）
  const oldPath = extractStoragePathFromPublicUrl(bucket, orgData?.logo_url)
  if (oldPath) {
    const { error: removeError } = await supabase.storage
      .from(bucket)
      .remove([oldPath])
    if (removeError) {
      console.warn('Failed to remove old logo', {
        path: oldPath,
        error: removeError,
      })
    }
  }

  return NextResponse.json({ logoUrl })
}

export async function DELETE() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role !== 'admin') {
    return NextResponse.json(
      { error: '管理者のみがロゴを削除できます' },
      { status: 403 }
    )
  }

  const supabase = await createClient()
  const bucket = getOrganizationLogoBucket()

  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .select('logo_url')
    .eq('id', user.organization_id)
    .single<{ logo_url: string | null }>()

  if (orgError) {
    return NextResponse.json(
      { error: orgError.message },
      { status: 500 }
    )
  }

  const removePath = extractStoragePathFromPublicUrl(bucket, orgData?.logo_url)
  if (removePath) {
    const { error: removeError } = await supabase.storage
      .from(bucket)
      .remove([removePath])
    if (removeError) {
      console.warn('Failed to remove logo', { path: removePath, error: removeError })
    }
  }

  const { error: updateError } = await supabase
    .from('organizations')
    .update({ logo_url: null })
    .eq('id', user.organization_id)

  if (updateError) {
    return NextResponse.json(
      { error: 'ロゴの削除に失敗しました' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
