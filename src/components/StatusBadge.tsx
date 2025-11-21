interface StatusBadgeProps {
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected'
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    draft: {
      label: '下書き',
      className: 'bg-gray-100 text-gray-800',
    },
    pending_approval: {
      label: '承認待ち',
      className: 'bg-yellow-100 text-yellow-800',
    },
    approved: {
      label: '承認済み',
      className: 'bg-green-100 text-green-800',
    },
    rejected: {
      label: '却下',
      className: 'bg-red-100 text-red-800',
    },
  }

  const { label, className } = config[status]

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {label}
    </span>
  )
}
