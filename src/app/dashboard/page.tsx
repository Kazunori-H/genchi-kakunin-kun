import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザーの所属組織IDを取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, name')
    .eq('auth_id', user.id)
    .single()

  // 統計情報を取得
  let sitesCount = 0
  let templatesCount = 0
  let inspectionsCount = 0

  if (userData) {
    const { count: sitesCountData } = await supabase
      .from('sites')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', userData.organization_id)
    sitesCount = sitesCountData || 0

    const { count: templatesCountData } = await supabase
      .from('templates')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', userData.organization_id)
    templatesCount = templatesCountData || 0

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: inspectionsCountData } = await supabase
      .from('inspections')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', userData.organization_id)
      .gte('inspection_date', startOfMonth.toISOString().split('T')[0])
    inspectionsCount = inspectionsCountData || 0
  }

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8 shadow-2xl">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-white mb-2">
            おかえりなさい、{userData?.name || user.email}さん
          </h1>
          <p className="text-indigo-100">
            今日も安全な廃棄物処理のために、頑張りましょう！
          </p>
        </div>
        <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-20">
          <svg
            className="w-48 h-48 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      </div>

      {/* クイックアクション */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          クイックアクション
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            href="/inspections/new"
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">新規確認作成</h3>
                <p className="text-sm text-blue-100">現地確認を開始</p>
              </div>
              <div className="rounded-full bg-white/20 p-3 group-hover:bg-white/30 transition-colors">
                <svg
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
            </div>
          </Link>

          <Link
            href="/sites/new"
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">施設登録</h3>
                <p className="text-sm text-green-100">新しい施設を追加</p>
              </div>
              <div className="rounded-full bg-white/20 p-3 group-hover:bg-white/30 transition-colors">
                <svg
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
            </div>
          </Link>

          <Link
            href="/templates/new"
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">
                  テンプレート作成
                </h3>
                <p className="text-sm text-purple-100">
                  チェックシートを作成
                </p>
              </div>
              <div className="rounded-full bg-white/20 p-3 group-hover:bg-white/30 transition-colors">
                <svg
                  className="h-8 w-8"
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
            </div>
          </Link>
        </div>
      </div>

      {/* 統計カード */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">統計情報</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="relative overflow-hidden rounded-xl bg-white p-6 shadow-md hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  今月の確認件数
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {inspectionsCount}
                  <span className="text-lg text-gray-500 ml-1">件</span>
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3">
                <svg
                  className="h-6 w-6 text-blue-600"
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
            </div>
            <div className="mt-4">
              <Link
                href="/inspections"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 inline-flex items-center"
              >
                詳細を見る
                <svg
                  className="ml-1 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-white p-6 shadow-md hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  登録済み施設
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {sitesCount}
                  <span className="text-lg text-gray-500 ml-1">施設</span>
                </p>
              </div>
              <div className="rounded-lg bg-green-50 p-3">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <Link
                href="/sites"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 inline-flex items-center"
              >
                詳細を見る
                <svg
                  className="ml-1 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-white p-6 shadow-md hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  テンプレート数
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {templatesCount}
                  <span className="text-lg text-gray-500 ml-1">個</span>
                </p>
              </div>
              <div className="rounded-lg bg-purple-50 p-3">
                <svg
                  className="h-6 w-6 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <Link
                href="/templates"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 inline-flex items-center"
              >
                詳細を見る
                <svg
                  className="ml-1 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 機能カード */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          主要機能
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/sites"
            className="group bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white mb-4 group-hover:scale-110 transition-transform">
              <svg
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              現地確認先
            </h3>
            <p className="text-sm text-gray-600">
              処理業者や施設の情報を管理
            </p>
          </Link>

          <Link
            href="/templates"
            className="group bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white mb-4 group-hover:scale-110 transition-transform">
              <svg
                className="h-7 w-7"
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              テンプレート
            </h3>
            <p className="text-sm text-gray-600">
              チェックシートのテンプレートを作成・編集
            </p>
          </Link>

          <Link
            href="/inspections"
            className="group bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white mb-4 group-hover:scale-110 transition-transform">
              <svg
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              確認記録
            </h3>
            <p className="text-sm text-gray-600">
              現地確認の記録を管理・閲覧
            </p>
          </Link>

          <div className="bg-white rounded-xl p-6 shadow-md opacity-60 cursor-not-allowed">
            <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-to-br from-gray-400 to-gray-500 text-white mb-4">
              <svg
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">設定</h3>
            <p className="text-sm text-gray-600">
              組織設定やユーザー管理
              <span className="block text-xs text-gray-500 mt-1">
                （近日公開）
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* はじめにセクション */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <svg
            className="w-5 h-5 mr-2 text-indigo-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          はじめに
        </h2>
        <div className="space-y-4">
          <div className="flex items-start bg-white rounded-lg p-4 shadow-sm">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 font-semibold">
                1
              </div>
            </div>
            <div className="ml-4 flex-1">
              <h4 className="text-sm font-semibold text-gray-900">
                現地確認先を登録しましょう
              </h4>
              <p className="mt-1 text-sm text-gray-600">
                訪問する処理業者や施設の情報を登録します
              </p>
              <Link
                href="/sites/new"
                className="mt-2 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                登録する
                <svg
                  className="ml-1 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </div>

          <div className="flex items-start bg-white rounded-lg p-4 shadow-sm">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 font-semibold">
                2
              </div>
            </div>
            <div className="ml-4 flex-1">
              <h4 className="text-sm font-semibold text-gray-900">
                チェックシートテンプレートを作成しましょう
              </h4>
              <p className="mt-1 text-sm text-gray-600">
                現地確認で使用するチェック項目を設定します
              </p>
              <Link
                href="/templates/new"
                className="mt-2 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                作成する
                <svg
                  className="ml-1 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </div>

          <div className="flex items-start bg-white rounded-lg p-4 shadow-sm opacity-60">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-200 text-gray-500 font-semibold">
                3
              </div>
            </div>
            <div className="ml-4 flex-1">
              <h4 className="text-sm font-semibold text-gray-600">
                現地確認を実施しましょう（近日公開）
              </h4>
              <p className="mt-1 text-sm text-gray-500">
                テンプレートを使用して現地確認を記録します
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
