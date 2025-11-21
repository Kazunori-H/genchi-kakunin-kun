import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/auth'

export async function PUT(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const body = (await request.json()) as {
    currentPassword?: string
    newPassword?: string
  }

  if (!body.currentPassword || !body.newPassword) {
    return NextResponse.json(
      { error: '現在のパスワードと新しいパスワードを入力してください' },
      { status: 400 }
    )
  }

  if (body.newPassword.length < 8) {
    return NextResponse.json(
      { error: 'パスワードは8文字以上で設定してください' },
      { status: 400 }
    )
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: body.currentPassword,
  })

  if (signInError) {
    return NextResponse.json(
      { error: '現在のパスワードが正しくありません' },
      { status: 400 }
    )
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: body.newPassword,
  })

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message || 'パスワードの更新に失敗しました' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
