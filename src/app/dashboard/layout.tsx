'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

/**
 * DashboardLayout - 共通ヘッダーレイアウト
 *
 * このレイアウトは、ログイン後のすべてのページで使用される共通ヘッダーです。
 *
 * 【使用方法】
 * 新しいページセクションを作成する際は、以下のようにこのレイアウトを使用してください：
 *
 * ```tsx
 * import DashboardLayout from '@/app/dashboard/layout'
 *
 * export default function YourLayout({ children }: { children: React.ReactNode }) {
 *   return <DashboardLayout>{children}</DashboardLayout>
 * }
 * ```
 *
 * 【除外ページ】
 * 以下のページではこのレイアウトを使用しないでください：
 * - ログイン・サインアップページ (/login, /signup)
 * - 印刷専用ページ (/inspections/[id]/print)
 * - ルートページ (/)
 *
 * 【機能】
 * - ユーザー認証状態の確認
 * - ナビゲーションメニュー（ダッシュボード、現地確認先、テンプレート、確認記録）
 * - アカウントメニュー（プロフィール、組織設定、ログアウト）
 * - ロールベースのメニュー表示制御（組織設定は管理者のみ）
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [userEmail, setUserEmail] = useState<string>('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [userRole, setUserRole] = useState<string>('inspector')
  const [organizationName, setOrganizationName] = useState<string>('')
  const [accountName, setAccountName] = useState<string>('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setUserEmail(user.email || '')

      const { data: userRecord } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single<{ role: string }>()

      if (userRecord?.role) {
        setUserRole(userRecord.role)
      }

      const summaryResponse = await fetch('/api/account/summary', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (summaryResponse.ok) {
        const summary = await summaryResponse.json()
        setAccountName(summary.name || '')
        setOrganizationName(summary.organizationName || '')
        setUserRole(summary.role || userRecord?.role || 'inspector')
        if (summary.email) {
          setUserEmail(summary.email)
        }
      }
    }
    checkUser()
  }, [router])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false)
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keyup', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keyup', handleEscape)
    }
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (path: string) => pathname === path

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* ナビゲーションバー */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link
                href="/dashboard"
                className="flex items-center space-x-3 group"
              >
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg group-hover:shadow-xl transition-shadow">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  現地確認くん
                </span>
              </Link>

              <div className="hidden md:ml-10 md:flex md:space-x-1">
                <Link
                  href="/dashboard"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive('/dashboard')
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  ダッシュボード
                </Link>
                <Link
                  href="/sites"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    pathname?.startsWith('/sites')
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  現地確認先
                </Link>
                <Link
                  href="/templates"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    pathname?.startsWith('/templates')
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  テンプレート
                </Link>
                <Link
                  href="/inspections"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    pathname?.startsWith('/inspections')
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  確認記録
                </Link>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {userRole === 'admin' && (
                <Link
                  href="/superadmin/organizations"
                  className={`hidden md:inline-flex px-4 py-2 rounded-lg text-sm font-medium border ${
                    pathname?.startsWith('/superadmin')
                      ? 'border-indigo-300 text-indigo-700 bg-indigo-50'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  システム管理
                </Link>
              )}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen((prev) => !prev)}
                  className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold shadow hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition"
                  aria-label="アカウントメニュー"
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen}
                >
                  {getInitials(accountName || userEmail)}
                </button>
                {isMenuOpen && (
                  <div className="absolute right-0 mt-3 w-64 bg-white rounded-lg shadow-xl border border-gray-100 py-3 z-50">
                    <div className="px-4 pb-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">
                        {accountName || 'ユーザー'}
                      </p>
                      <p className="text-xs text-gray-500">{userEmail}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {organizationName || '所属組織'}
                      </p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/settings/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        個人情報設定
                      </Link>
                      {userRole === 'admin' && (
                        <Link
                          href="/settings/organization"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          組織設定
                        </Link>
                      )}
                      {userRole === 'admin' && (
                        <Link
                          href="/settings/users"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          ユーザー管理
                        </Link>
                      )}
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                      >
                        {isLoggingOut ? 'ログアウト中...' : 'ログアウト'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}

function getInitials(text: string) {
  if (!text) return '?'
  const sanitized = text.trim()
  if (!sanitized) return '?'
  const parts = sanitized.split(/\s+/)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (
    (parts[0][0] || '') + (parts[parts.length - 1][0] || '')
  ).toUpperCase()
}
