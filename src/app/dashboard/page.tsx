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
    .eq('id', user.id)
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
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            ダッシュボード
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {userData?.name || user.email}さん、お疲れ様です
          </p>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden rounded-lg shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-md bg-indigo-500 p-3">
                  <svg
                    className="h-5 w-5 text-white"
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
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    今月の確認件数
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {inspectionsCount}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link
                href="/inspections"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                詳細を見る
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden rounded-lg shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-md bg-green-500 p-3">
                  <svg
                    className="h-5 w-5 text-white"
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
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    登録済み施設
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {sitesCount}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link
                href="/sites"
                className="font-medium text-green-600 hover:text-green-500"
              >
                詳細を見る
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden rounded-lg shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-md bg-purple-500 p-3">
                  <svg
                    className="h-5 w-5 text-white"
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
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    テンプレート数
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {templatesCount}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link
                href="/templates"
                className="font-medium text-purple-600 hover:text-purple-500"
              >
                詳細を見る
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* クイックアクション */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-3">
          クイックアクション
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            href="/inspections/new"
            className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:shadow-md transition-all"
          >
            <div className="flex-shrink-0">
              <div className="rounded-lg bg-indigo-50 p-2">
                <svg
                  className="h-5 w-5 text-indigo-600"
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
            <div className="min-w-0 flex-1">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">新規確認作成</p>
              <p className="truncate text-sm text-gray-500">
                現地確認を開始
              </p>
            </div>
          </Link>

          <Link
            href="/sites/new"
            className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400 focus-within:ring-2 focus-within:ring-green-500 focus-within:ring-offset-2 hover:shadow-md transition-all"
          >
            <div className="flex-shrink-0">
              <div className="rounded-lg bg-green-50 p-2">
                <svg
                  className="h-5 w-5 text-green-600"
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
            <div className="min-w-0 flex-1">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">施設登録</p>
              <p className="truncate text-sm text-gray-500">
                新しい施設を追加
              </p>
            </div>
          </Link>

          <Link
            href="/templates/new"
            className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400 focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-offset-2 hover:shadow-md transition-all"
          >
            <div className="flex-shrink-0">
              <div className="rounded-lg bg-purple-50 p-2">
                <svg
                  className="h-5 w-5 text-purple-600"
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
            <div className="min-w-0 flex-1">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">
                テンプレート作成
              </p>
              <p className="truncate text-sm text-gray-500">
                チェックシートを作成
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* 主要機能 */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-3">主要機能</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/sites"
            className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-lg bg-blue-50 p-2.5">
                <svg
                  className="h-5 w-5 text-blue-600"
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
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              現地確認先
            </h3>
            <p className="text-sm text-gray-500">
              処理業者や施設の情報を管理
            </p>
          </Link>

          <Link
            href="/templates"
            className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-lg bg-purple-50 p-2.5">
                <svg
                  className="h-5 w-5 text-purple-600"
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
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              テンプレート
            </h3>
            <p className="text-sm text-gray-500">
              チェックシートのテンプレートを作成・編集
            </p>
          </Link>

          <Link
            href="/inspections"
            className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-lg bg-green-50 p-2.5">
                <svg
                  className="h-5 w-5 text-green-600"
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
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              確認記録
            </h3>
            <p className="text-sm text-gray-500">
              現地確認の記録を管理・閲覧
            </p>
          </Link>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm opacity-50 cursor-not-allowed">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-lg bg-gray-100 p-2.5">
                <svg
                  className="h-5 w-5 text-gray-400"
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
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">設定</h3>
            <p className="text-sm text-gray-500">
              組織設定やユーザー管理
              <span className="block text-xs text-gray-400 mt-1">
                （近日公開）
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* はじめに */}
      <div className="bg-blue-50 rounded-lg border border-blue-100">
        <div className="px-6 py-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            はじめに
          </h2>
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-indigo-600 text-white text-xs font-medium">
                  1
                </span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  現地確認先を登録しましょう
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  訪問する処理業者や施設の情報を登録します
                </p>
                <Link
                  href="/sites/new"
                  className="mt-2 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  登録する →
                </Link>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-indigo-600 text-white text-xs font-medium">
                  2
                </span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  チェックシートテンプレートを作成しましょう
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  現地確認で使用するチェック項目を設定します
                </p>
                <Link
                  href="/templates/new"
                  className="mt-2 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  作成する →
                </Link>
              </div>
            </div>

            <div className="flex items-start opacity-60">
              <div className="flex-shrink-0">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-300 text-white text-xs font-medium">
                  3
                </span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-700">
                  現地確認を実施しましょう（近日公開）
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  テンプレートを使用して現地確認を記録します
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
