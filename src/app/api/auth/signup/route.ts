import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { email, password, name, organizationName } = body

  // 1. Supabase Authでユーザーを作成
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  if (!authData.user) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }

  try {
    // 2. 組織を作成
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: organizationName,
      })
      .select()
      .single()

    if (orgError) {
      console.error('Organization creation error:', orgError)
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
    }

    // 3. ユーザーレコードを作成
    const { error: userError } = await supabase
      .from('users')
      .insert({
        auth_id: authData.user.id,
        email: authData.user.email!,
        name: name,
        organization_id: organization.id,
        role: 'admin', // 最初のユーザーは管理者
      })

    if (userError) {
      console.error('User creation error:', userError)
      return NextResponse.json({ error: 'Failed to create user record' }, { status: 500 })
    }

    return NextResponse.json({
      user: authData.user,
      session: authData.session,
      organization: organization
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
