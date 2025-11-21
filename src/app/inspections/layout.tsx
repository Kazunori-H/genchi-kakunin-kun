import DashboardLayout from '@/app/dashboard/layout'

export default function InspectionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}
