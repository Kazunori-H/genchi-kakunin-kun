import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: logs, error } = await supabase
    .from('approval_logs')
    .select(`
      *,
      users!approval_logs_actor_id_fkey (
        id,
        name,
        email
      )
    `)
    .eq('inspection_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(logs)
}
