'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // URLフラグメントからパラメータを取得
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')

        // クエリパラメータも確認（従来の方式）
        const searchParams = new URLSearchParams(window.location.search)
        const code = searchParams.get('code')
        const errorParam = searchParams.get('error')

        if (errorParam) {
          setError('認証に失敗しました。もう一度お試しください。')
          return
        }

        const supabase = createClient()

        // 1) フラグメントにトークンがある場合（招待リンクなど）
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) {
            throw sessionError
          }

          // 招待の場合はパスワード設定画面へ
          if (type === 'invite') {
            router.push('/auth/set-password')
            return
          }

          // それ以外はダッシュボードへ
          router.push('/dashboard')
          return
        }

        // 2) 認証コード（code）がある場合
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

          if (exchangeError) {
            throw exchangeError
          }

          router.push('/dashboard')
          return
        }

        // トークンもコードもない場合
        setError('認証情報が見つかりませんでした。')
      } catch (err) {
        console.error('認証エラー:', err)
        setError(
          err instanceof Error ? err.message : '認証処理中にエラーが発生しました。'
        )
      }
    }

    handleCallback()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">認証エラー</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              ログイン画面に戻る
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-gray-600">認証処理中...</p>
      </div>
    </div>
  )
}
