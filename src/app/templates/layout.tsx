import DashboardLayout from '@/app/dashboard/layout'

export default function TemplatesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}
