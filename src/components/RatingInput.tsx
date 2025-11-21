'use client'

export interface RatingOption {
  value: number | 'na'
  label: string
  shortLabel: string
  color: string
  bgColor: string
  borderColor: string
  selectedBgColor: string
  selectedBorderColor: string
}

const RATING_OPTIONS: RatingOption[] = [
  {
    value: 1,
    label: '不可',
    shortLabel: '1',
    color: 'text-gray-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-100',
    selectedBgColor: 'bg-green-100',
    selectedBorderColor: 'border-indigo-500',
  },
  {
    value: 2,
    label: '不十分',
    shortLabel: '2',
    color: 'text-gray-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-200',
    selectedBgColor: 'bg-green-200',
    selectedBorderColor: 'border-indigo-500',
  },
  {
    value: 3,
    label: '普通',
    shortLabel: '3',
    color: 'text-gray-700',
    bgColor: 'bg-green-200',
    borderColor: 'border-green-300',
    selectedBgColor: 'bg-green-300',
    selectedBorderColor: 'border-indigo-500',
  },
  {
    value: 4,
    label: '良好',
    shortLabel: '4',
    color: 'text-gray-700',
    bgColor: 'bg-green-300',
    borderColor: 'border-green-400',
    selectedBgColor: 'bg-green-400',
    selectedBorderColor: 'border-indigo-500',
  },
  {
    value: 5,
    label: '優秀',
    shortLabel: '5',
    color: 'text-gray-700',
    bgColor: 'bg-green-400',
    borderColor: 'border-green-500',
    selectedBgColor: 'bg-green-500',
    selectedBorderColor: 'border-indigo-600',
  },
]

const NA_OPTION: RatingOption = {
  value: 'na',
  label: '回答不要',
  shortLabel: 'N/A',
  color: 'text-gray-700',
  bgColor: 'bg-gray-50',
  borderColor: 'border-gray-200',
  selectedBgColor: 'bg-gray-100',
  selectedBorderColor: 'border-gray-500',
}

interface RatingInputProps {
  value?: number | 'na' | null
  onChange?: (value: number | 'na') => void
  note?: string
  onNoteChange?: (note: string) => void
  required?: boolean
  label?: string
  description?: string
  disabled?: boolean
  className?: string
}

/**
 * スマホ向け5段階評価入力コンポーネント
 * 
 * 特徴:
 * - 大きなタップエリア（最小60px高さ）
 * - 単色グラデーション（薄い緑→濃い緑）
 * - 選択状態の明確な表示（indigoボーダー）
 * - アクセシビリティ対応
 * - レスポンシブデザイン
 */
export default function RatingInput({
  value,
  onChange,
  note,
  onNoteChange,
  required = false,
  label,
  description,
  disabled = false,
  className = '',
}: RatingInputProps) {
  const handleSelect = (optionValue: number | 'na') => {
    if (disabled) return
    
    // 必須項目でN/Aが選択された場合、何もしない
    if (required && optionValue === 'na') {
      return
    }
    
    onChange?.(optionValue)
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
      )}

      {/* 5段階評価ボタン - グリッドレイアウト */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {RATING_OPTIONS.map((option) => {
          const isSelected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value as number)}
              disabled={disabled}
              className={`
                relative flex flex-col items-center justify-center
                min-h-[60px] sm:min-h-[72px]
                px-2 py-3
                rounded-lg border-2 transition-all duration-150
                ${isSelected 
                  ? `${option.selectedBgColor} ${option.selectedBorderColor} border-2 shadow-md` 
                  : `${option.bgColor} ${option.borderColor} border`
                }
                ${!disabled && !isSelected 
                  ? 'hover:shadow-md active:scale-95' 
                  : ''
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
              `}
              aria-label={`評価${option.value}: ${option.label}`}
              aria-pressed={isSelected}
            >
              {/* 数字（大きく表示） */}
              <span
                className={`
                  text-2xl sm:text-3xl font-bold mb-1
                  ${
                    isSelected && option.value >= 4
                      ? 'text-white'
                      : 'text-gray-700'
                  }
                `}
              >
                {option.shortLabel}
              </span>
              {/* ラベル（小さく表示） */}
              <span
                className={`
                  text-xs sm:text-sm font-medium
                  ${
                    isSelected && option.value >= 4
                      ? 'text-white'
                      : 'text-gray-700'
                  }
                  hidden sm:block
                `}
              >
                {option.label}
              </span>
              {/* 選択インジケーター */}
              {isSelected && (
                <div className="absolute top-1 right-1">
                  <svg
                    className={`w-5 h-5 ${
                      option.value >= 4 ? 'text-white' : 'text-indigo-600'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* 該当なしボタン */}
      {!required && (
        <button
          type="button"
          onClick={() => handleSelect('na')}
          disabled={disabled}
          className={`
            w-full
            min-h-[52px] sm:min-h-[60px]
            px-4 py-3
            rounded-lg border-2 transition-all duration-150
            ${value === 'na'
              ? `${NA_OPTION.selectedBgColor} ${NA_OPTION.selectedBorderColor} border-2 shadow-md`
              : `${NA_OPTION.bgColor} ${NA_OPTION.borderColor} border`
            }
            ${!disabled && value !== 'na'
              ? 'hover:shadow-md active:scale-[0.98]'
              : ''
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
            flex items-center justify-center
          `}
          aria-label="回答不要"
          aria-pressed={value === 'na'}
        >
          <span className={`text-base sm:text-lg font-medium ${NA_OPTION.color}`}>
            回答不要 (N/A)
          </span>
          {value === 'na' && (
            <svg
              className="w-5 h-5 ml-2 text-indigo-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
      )}

      {/* メモ入力欄 */}
      {onNoteChange && (
        <div className="mt-3">
          <label htmlFor={`note-${label}`} className="sr-only">
            メモ
          </label>
          <textarea
            id={`note-${label}`}
            value={note || ''}
            onChange={(e) => onNoteChange(e.target.value)}
            disabled={disabled}
            placeholder="メモ（任意）"
            rows={2}
            className={`
              block w-full rounded-md border-gray-300 shadow-sm
              text-sm placeholder-gray-400
              focus:border-indigo-500 focus:ring-indigo-500
              disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50
              resize-y
            `}
            aria-label="チェック項目のメモ"
          />
        </div>
      )}

      {/* 現在の選択値を表示（デバッグ用、必要に応じて削除） */}
      {process.env.NODE_ENV === 'development' && value && (
        <p className="text-xs text-gray-400 text-center">
          選択中: {value === 'na' ? '該当なし' : `評価 ${value}`}
        </p>
      )}
    </div>
  )
}

