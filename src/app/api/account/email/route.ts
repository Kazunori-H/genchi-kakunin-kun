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
    newEmail?: string
    password?: string
  }

  const newEmail = (body.newEmail || '').trim().toLowerCase()

  if (!newEmail || !newEmail.includes('@')) {
    return NextResponse.json(
      { error: '有効なメールアドレスを入力してください' },
      { status: 400 }
    )
  }

  if (!body.password) {
    return NextResponse.json(
      { error: '現在のパスワードを入力してください' },
      { status: 400 }
    )
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: body.password,
  })

  if (signInError) {
    return NextResponse.json(
      { error: '現在のパスワードが正しくありません' },
      { status: 400 }
    )
  }

  const { data: updatedUser, error: updateError } = await supabase.auth.updateUser({
    email: newEmail,
  })

  if (updateError || !updatedUser?.user) {
    return NextResponse.json(
      { error: updateError?.message || 'メールアドレスの更新に失敗しました' },
      { status: 500 }
    )
  }

  const { error: profileError } = await supabase
    .from('users')
    .update({ email: newEmail })
    .eq('id', user.id)

  if (profileError) {
    return NextResponse.json(
      { error: 'プロフィールのメールアドレス更新に失敗しました' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    email: newEmail,
    message:
      'メールアドレスを更新しました。必要に応じて確認メールをご確認ください。',
  })
}
