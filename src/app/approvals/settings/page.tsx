import { redirect } from 'next/navigation'

export default function LegacyApprovalSettingsPage() {
  redirect('/settings/organization')
}
