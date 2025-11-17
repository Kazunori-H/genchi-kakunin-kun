import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '現地確認くん',
  description: '産業廃棄物処理施設の現地確認業務を効率化するアプリケーション',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
