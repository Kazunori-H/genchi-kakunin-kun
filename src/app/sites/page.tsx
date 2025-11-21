'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Site {
  id: string
  name: string
  address: string
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  notes: string | null
  created_at: string
}

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSites()
  }, [])

  const fetchSites = async () => {
    try {
      const response = await fetch('/api/sites')
      if (!response.ok) {
        throw new Error('Failed to fetch sites')
      }
      const data = await response.json()
      setSites(data)
    } catch (err) {
      console.error('Failed to fetch sites', err)
      setError('現地確認先の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">現地確認先</h1>
        <Link
          href="/sites/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          新規登録
        </Link>
      </div>

      {sites.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
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
          <h3 className="mt-2 text-sm font-medium text-gray-900">現地確認先がありません</h3>
          <p className="mt-1 text-sm text-gray-500">
            新しい現地確認先を登録してください
          </p>
          <div className="mt-6">
            <Link
              href="/sites/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              新規登録
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {sites.map((site) => (
              <li key={site.id}>
                <Link
                  href={`/sites/${site.id}`}
                  className="block hover:bg-gray-50 transition"
                >
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          {site.name}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">{site.address}</p>
                        {site.contact_name && (
                          <p className="mt-1 text-sm text-gray-500">
                            担当者: {site.contact_name}
                            {site.contact_phone && ` / ${site.contact_phone}`}
                          </p>
                        )}
                      </div>
                      <div>
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
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
