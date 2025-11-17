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
    // 現地確認先数
    const { count: sitesCountData } = await supabase
      .from('sites')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', userData.organization_id)
    sitesCount = sitesCountData || 0

    // テンプレート数
    const { count: templatesCountData } = await supabase
      .from('templates')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', userData.organization_id)
    templatesCount = templatesCountData || 0

    // 今月の確認記録数
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
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="mt-2 text-sm text-gray-700">
          ようこそ、{userData?.name || user.email}さん
        </p>
      </div>

      {/* クイックアクション */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/inspections/new"
          className="relative block p-6 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">新規確認作成</h3>
              <p className="mt-1 text-sm text-indigo-100">
                現地確認を開始
              </p>
            </div>
            <svg
              className="h-10 w-10 text-indigo-200"
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
        </Link>

        <Link
          href="/sites/new"
          className="relative block p-6 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">現地確認先登録</h3>
              <p className="mt-1 text-sm text-green-100">
                新しい施設を追加
              </p>
            </div>
            <svg
              className="h-10 w-10 text-green-200"
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
        </Link>

        <Link
          href="/templates/new"
          className="relative block p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">テンプレート作成</h3>
              <p className="mt-1 text-sm text-purple-100">
                チェックシートを作成
              </p>
            </div>
            <svg
              className="h-10 w-10 text-purple-200"
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
        </Link>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-gray-400"
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
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    今月の確認件数
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {inspectionsCount}件
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <Link
              href="/inspections"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              確認記録を見る →
            </Link>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-gray-400"
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
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    登録済み施設
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {sitesCount}施設
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <Link
              href="/sites"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              現地確認先を見る →
            </Link>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-gray-400"
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
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    テンプレート数
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {templatesCount}個
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <Link
              href="/templates"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              テンプレートを見る →
            </Link>
          </div>
        </div>
      </div>

      {/* 機能カード */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">機能一覧</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/sites"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mb-4">
              <svg
                className="h-6 w-6"
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
            <h3 className="text-lg font-medium text-gray-900">現地確認先</h3>
            <p className="mt-2 text-sm text-gray-500">
              処理業者や施設の情報を管理
            </p>
          </Link>

          <Link
            href="/templates"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-purple-500 text-white mb-4">
              <svg
                className="h-6 w-6"
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
            <h3 className="text-lg font-medium text-gray-900">テンプレート</h3>
            <p className="mt-2 text-sm text-gray-500">
              チェックシートのテンプレートを作成・編集
            </p>
          </Link>

          <Link
            href="/inspections"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-green-500 text-white mb-4">
              <svg
                className="h-6 w-6"
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
            <h3 className="text-lg font-medium text-gray-900">確認記録</h3>
            <p className="mt-2 text-sm text-gray-500">
              現地確認の記録を管理・閲覧
            </p>
          </Link>

          <div className="bg-white p-6 rounded-lg shadow opacity-50 cursor-not-allowed">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-gray-400 text-white mb-4">
              <svg
                className="h-6 w-6"
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
            <h3 className="text-lg font-medium text-gray-900">設定</h3>
            <p className="mt-2 text-sm text-gray-500">
              組織設定やユーザー管理（近日公開）
            </p>
          </div>
        </div>
      </div>

      {/* 最近のアクティビティ */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          はじめに
        </h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-md p-6">
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100 text-indigo-600">
                  1
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-900">
                  現地確認先を登録しましょう
                </h4>
                <p className="mt-1 text-sm text-gray-500">
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
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100 text-indigo-600">
                  2
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-900">
                  チェックシートテンプレートを作成しましょう
                </h4>
                <p className="mt-1 text-sm text-gray-500">
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

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-300 text-gray-600">
                  3
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-500">
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
    </div>
  )
}
