'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import Link from 'next/link'

const siteSchema = z.object({
  name: z.string().min(1, '施設名を入力してください'),
  facility_types: z.array(z.enum(['transport', 'transfer_storage', 'intermediate_treatment', 'final_disposal'])).optional(),
  address: z.string().min(1, '住所を入力してください'),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email('有効なメールアドレスを入力してください').optional().or(z.literal('')),
  notes: z.string().optional(),
})

type SiteFormData = z.infer<typeof siteSchema>

type FacilityType = 'transport' | 'transfer_storage' | 'intermediate_treatment' | 'final_disposal'

export default function NewSitePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [facilityTypes, setFacilityTypes] = useState<FacilityType[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SiteFormData>({
    resolver: zodResolver(siteSchema),
  })

  const toggleFacilityType = (type: FacilityType) => {
    setFacilityTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  const onSubmit = async (data: SiteFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          facility_types: facilityTypes,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create site')
      }

      router.push('/sites')
      router.refresh()
    } catch (err) {
      console.error('Failed to create site', err)
      setError('現地確認先の登録に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">現地確認先の新規登録</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              施設名 <span className="text-red-500">*</span>
            </label>
            <input
              {...register('name')}
              type="text"
              id="name"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              施設種別（複数選択可）
            </label>
            <div className="space-y-2">
              {[
                { value: 'transport', label: '運搬（車両基地など）' },
                { value: 'transfer_storage', label: '積替保管施設' },
                { value: 'intermediate_treatment', label: '中間処理施設' },
                { value: 'final_disposal', label: '最終処分場' },
              ].map(option => (
                <div key={option.value} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`facility_type_${option.value}`}
                    checked={facilityTypes.includes(option.value as FacilityType)}
                    onChange={() => toggleFacilityType(option.value as FacilityType)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor={`facility_type_${option.value}`}
                    className="ml-2 block text-sm text-gray-700"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              該当する施設種別をすべて選択してください
            </p>
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              住所 <span className="text-red-500">*</span>
            </label>
            <input
              {...register('address')}
              type="text"
              id="address"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            {errors.address && (
              <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="contact_name" className="block text-sm font-medium text-gray-700">
              担当者名
            </label>
            <input
              {...register('contact_name')}
              type="text"
              id="contact_name"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700">
              電話番号
            </label>
            <input
              {...register('contact_phone')}
              type="tel"
              id="contact_phone"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700">
              メールアドレス
            </label>
            <input
              {...register('contact_email')}
              type="email"
              id="contact_email"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            {errors.contact_email && (
              <p className="mt-1 text-sm text-red-600">{errors.contact_email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              備考
            </label>
            <textarea
              {...register('notes')}
              id="notes"
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Link
            href="/sites"
            className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            キャンセル
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '登録中...' : '登録'}
          </button>
        </div>
      </form>
    </div>
  )
}
