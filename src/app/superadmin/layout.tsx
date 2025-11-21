import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/app/dashboard/layout'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userRecord } = await supabase
    .from('users')
    .select('role')
    .eq('id', user?.id)
    .single<{ role: string }>()

  if (!userRecord || userRecord.role !== 'admin') {
    redirect('/dashboard')
  }

  return <DashboardLayout>{children}</DashboardLayout>
}
