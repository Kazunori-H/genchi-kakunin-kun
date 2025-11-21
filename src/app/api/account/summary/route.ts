import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data: organization } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', user.organization_id)
    .single<{ name: string | null }>()

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    organizationName: organization?.name ?? '所属組織',
  })
}
