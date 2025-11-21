import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getCurrentUser, checkPermission } from '@/lib/supabase/auth'

export async function GET() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hasPermission = await checkPermission('approver')
  if (!hasPermission) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: inspections, error } = await supabase
    .from('inspections')
    .select(`
      *,
      sites (
        id,
        name,
        address
      ),
      templates (
        id,
        name
      ),
      inspector:users!inspector_id (
        id,
        name
      )
    `)
    .eq('organization_id', user.organization_id)
    .eq('status', 'pending_approval')
    .order('submitted_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(inspections)
}
