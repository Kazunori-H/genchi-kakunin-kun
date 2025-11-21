import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    name: user.name,
    email: user.email,
  })
}

export async function PUT(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const body = (await request.json()) as {
    name?: string
  }

  if (!body.name || body.name.trim().length === 0) {
    return NextResponse.json(
      { error: '氏名は必須です' },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('users')
    .update({ name: body.name.trim() })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
