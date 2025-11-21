'use client'

import { useState } from 'react'
import RatingInput from '@/components/RatingInput'

export default function RatingDemoPage() {
  const [value1, setValue1] = useState<number | 'na' | null>(null)
  const [value2, setValue2] = useState<number | 'na' | null>(3)
  const [value3, setValue3] = useState<number | 'na' | null>('na')
  const [value4, setValue4] = useState<number | 'na' | null>(null)

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            5段階評価UI デモ
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            スマホ向けに最適化された5段階評価入力コンポーネントのデモページです。
          </p>

          {/* デモ1: 基本的な使用例 */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <RatingInput
              label="基本的な使用例"
              description="必須項目ではないため、回答不要も選択可能です"
              value={value1}
              onChange={(v) => setValue1(v)}
              required={false}
            />
            <div className="mt-4 text-sm text-gray-600">
              選択値: {value1 === null ? '未選択' : value1 === 'na' ? '回答不要' : `評価 ${value1}`}
            </div>
          </div>

          {/* デモ2: 必須項目（回答不要選択不可） */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <RatingInput
              label="必須項目の例"
              description="必須項目のため、回答不要は選択できません"
              value={value2}
              onChange={(v) => setValue2(v)}
              required={true}
            />
            <div className="mt-4 text-sm text-gray-600">
              選択値: {value2 === null ? '未選択' : value2 === 'na' ? '回答不要' : `評価 ${value2}`}
            </div>
          </div>

          {/* デモ3: 回答不要が選択されている例 */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <RatingInput
              label="回答不要が選択されている例"
              description="現在「回答不要」が選択されています"
              value={value3}
              onChange={(v) => setValue3(v)}
              required={false}
            />
            <div className="mt-4 text-sm text-gray-600">
              選択値: {value3 === null ? '未選択' : value3 === 'na' ? '回答不要' : `評価 ${value3}`}
            </div>
          </div>

          {/* デモ4: 無効化状態 */}
          <div className="mb-8">
            <RatingInput
              label="無効化状態の例"
              description="disabledプロパティで無効化しています"
              value={value4}
              onChange={(v) => setValue4(v)}
              required={false}
              disabled={true}
            />
          </div>
        </div>

        {/* UIの特徴 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            UIの特徴
          </h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span><strong>大きなタップエリア:</strong> 最小60px（スマホ）/ 72px（タブレット）の高さで、指で押しやすい</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span><strong>視覚的な色分け:</strong> 1（赤）→ 5（緑）のグラデーションで直感的</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span><strong>選択状態の明確化:</strong> 選択されたボタンはチェックマークと太いボーダーで表示</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span><strong>レスポンシブデザイン:</strong> スマホ・タブレット・PCすべてで最適表示</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span><strong>アクセシビリティ対応:</strong> ARIA属性、キーボード操作、スクリーンリーダー対応</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span><strong>タッチフィードバック:</strong> タップ時に視覚的なフィードバック（スケールアニメーション）</span>
            </li>
          </ul>
        </div>

        {/* 使用例コード */}
        <div className="bg-gray-900 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            使用例
          </h2>
          <pre className="text-sm text-gray-300 overflow-x-auto">
            <code>{`import RatingInput from '@/components/RatingInput'

function MyComponent() {
  const [rating, setRating] = useState<number | 'na' | null>(null)

  return (
    <RatingInput
      label="評価項目"
      description="説明文（オプション）"
      value={rating}
      onChange={(value) => setRating(value)}
      required={false}  // trueの場合、回答不要は選択不可
    />
  )
}`}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}

