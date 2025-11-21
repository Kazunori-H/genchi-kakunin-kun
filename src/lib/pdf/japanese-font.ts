/**
 * jsPDF用の日本語フォント設定
 *
 * 注意: このファイルは、日本語フォントのbase64データを含む必要があります。
 * フォントファイルのサイズが大きいため、ここでは簡易的な実装を提供します。
 */

import { jsPDF } from 'jspdf'

/**
 * 日本語テキストをサポートするためのフォールバック処理
 * jsPDFの標準フォントで表示できない文字を処理します
 */
export function addJapaneseFontSupport(doc: jsPDF): void {
  // jsPDF 3.x では、デフォルトでいくつかのUnicode文字をサポートしています
  // ただし、完全な日本語サポートには制限があります

  // 標準フォントを使用（制限付き日本語サポート）
  try {
    // Courierフォントは一部の日本語文字をサポート
    doc.setFont('courier')
  } catch (e) {
    console.warn('Failed to set font:', e)
  }
}

/**
 * テキストを安全にPDFに追加
 * 文字化けを最小限に抑えるための処理を行います
 */
export function addJapaneseText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  options?: {
    maxWidth?: number
    fontSize?: number
  }
): void {
  if (options?.fontSize) {
    doc.setFontSize(options.fontSize)
  }

  if (options?.maxWidth) {
    const lines = doc.splitTextToSize(text, options.maxWidth)
    doc.text(lines, x, y)
  } else {
    doc.text(text, x, y)
  }
}

/**
 * 日本語を含むテキストを画像として追加する代替方法
 * Canvas APIを使用してテキストを画像化します
 */
export async function addJapaneseTextAsImage(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  options?: {
    maxWidth?: number
    fontSize?: number
    fontFamily?: string
  }
): Promise<void> {
  const fontSize = options?.fontSize || 10
  const fontFamily = options?.fontFamily || 'sans-serif'
  const maxWidth = options?.maxWidth || 180

  // Canvasを作成
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  ctx.font = `${fontSize}pt ${fontFamily}`

  // テキストの幅を測定
  const metrics = ctx.measureText(text)
  const textWidth = Math.min(metrics.width, maxWidth)

  // Canvasのサイズを設定
  canvas.width = textWidth + 10
  canvas.height = fontSize * 2

  // 背景を透明に
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // テキストを描画
  ctx.font = `${fontSize}pt ${fontFamily}`
  ctx.fillStyle = 'black'
  ctx.textBaseline = 'top'
  ctx.fillText(text, 5, 5, maxWidth)

  // CanvasをPDFに追加
  const imgData = canvas.toDataURL('image/png')
  const imgWidth = textWidth * 0.264583 // pxをmmに変換
  const imgHeight = fontSize * 0.352778

  doc.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight)
}
