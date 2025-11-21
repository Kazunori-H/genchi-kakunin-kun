import DashboardLayout from '@/app/dashboard/layout'

export default function SitesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}
