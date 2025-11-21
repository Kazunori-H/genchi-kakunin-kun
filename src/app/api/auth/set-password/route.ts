import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/auth'

export async function POST(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const body = (await request.json()) as {
    password?: string
  }

  if (!body.password) {
    return NextResponse.json(
      { error: 'パスワードを入力してください' },
      { status: 400 }
    )
  }

  if (body.password.length < 8) {
    return NextResponse.json(
      { error: 'パスワードは8文字以上で設定してください' },
      { status: 400 }
    )
  }

  // 初回パスワード設定では現在のパスワードチェックは不要
  // セッションが確立されているユーザーのみがこのAPIを呼び出せる
  const { error: updateError } = await supabase.auth.updateUser({
    password: body.password,
  })

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message || 'パスワードの設定に失敗しました' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
