import DashboardLayout from '@/app/dashboard/layout'

export default function ApprovalsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}
