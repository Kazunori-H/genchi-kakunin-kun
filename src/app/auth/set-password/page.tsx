'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // バリデーション
    if (!password || password.length < 8) {
      setError('パスワードは8文字以上で設定してください')
      return
    }

    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ password }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || 'パスワードの設定に失敗しました')
      }

      // 成功したらダッシュボードにリダイレクト
      router.push('/dashboard')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'パスワードの設定に失敗しました'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            パスワードを設定
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            招待を受けてアカウントが作成されました。
            <br />
            ログインに使用するパスワードを設定してください。
          </p>
        </div>

        <div className="mt-8 bg-white py-8 px-6 shadow rounded-lg">
          {error && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                新しいパスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="8文字以上で入力してください"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-medium text-gray-700"
              >
                パスワード（確認）
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="もう一度入力してください"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '設定中...' : 'パスワードを設定'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
