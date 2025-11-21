import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { InspectionDetailRecord } from '@/types/inspection'

type JsPDFWithAutoTable = jsPDF & {
  lastAutoTable?: {
    finalY?: number
  }
}

/**
 * Canvas APIを使用して日本語テキストを高解像度で画像として描画
 */
async function renderJapaneseTextToImage(
  text: string,
  fontSize: number = 12
): Promise<{ dataUrl: string; width: number; height: number }> {
  // 高解像度化のためのスケールファクター
  const scale = 3
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  // スケールしたフォントサイズ
  const scaledFontSize = fontSize * scale

  // フォント設定（スケール前）
  ctx.font = `${scaledFontSize}px "Noto Sans JP", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif`

  // テキストの幅を測定（スケールされた状態で）
  const metrics = ctx.measureText(text)
  const textWidth = metrics.width

  // Canvasのサイズを設定（スケールされたサイズ、余白を含む）
  canvas.width = textWidth + 40 * scale
  canvas.height = scaledFontSize * 1.6

  // 背景を透明に（白背景だと周りに余白が見える）
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // アンチエイリアシングを有効に
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // テキストを描画（フォント設定を再度適用）
  ctx.font = `${scaledFontSize}px "Noto Sans JP", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif`
  ctx.fillStyle = 'black'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 20 * scale, canvas.height / 2)

  // 実際の表示サイズ（mm単位での幅と高さ）
  const displayWidth = (textWidth + 40 * scale) / scale * 0.264583 // pxをmmに変換
  const displayHeight = (scaledFontSize * 1.6) / scale * 0.264583

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: displayWidth,
    height: displayHeight,
  }
}

/**
 * 画像をBase64に変換
 */
async function urlToBase64(url: string): Promise<string> {
  const response = await fetch(url)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Base64画像を圧縮
 */
async function compressImageForPDF(
  base64Image: string,
  maxWidth: number = 800
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      let { width, height } = img
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)

      resolve(canvas.toDataURL('image/jpeg', 0.7))
    }
    img.onerror = reject
    img.src = base64Image
  })
}

/**
 * 画像のサイズを計算（PDF内での表示サイズ）
 */
function calculateImageSize(
  imgWidth: number,
  imgHeight: number,
  maxWidth: number,
  maxHeight: number
) {
  const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight)
  return {
    width: imgWidth * ratio,
    height: imgHeight * ratio,
  }
}

/**
 * ステータスのラベルを取得
 */
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: '下書き',
    pending_approval: '承認待ち',
    approved: '承認済み',
    rejected: '却下',
  }
  return labels[status] || status
}

/**
 * 確認記録をPDF化
 */
export async function generateInspectionPDF(
  inspection: InspectionDetailRecord,
  includePhotos: boolean = true,
  onProgress?: (current: number, total: number) => void
): Promise<jsPDF> {
  const doc = new jsPDF()
  let currentY = 20

  // タイトル（画像として追加）
  try {
    const titleImage = await renderJapaneseTextToImage('現地確認報告書', 18)
    doc.addImage(titleImage.dataUrl, 'PNG', 14, currentY - 2, titleImage.width, titleImage.height)
    currentY += titleImage.height + 3
  } catch (e) {
    console.error('Failed to render title:', e)
    doc.setFontSize(18)
    doc.text('Inspection Report', 14, currentY)
    currentY += 10
  }

  // 基本情報（画像として追加）
  doc.setFontSize(10)
  const infoLines = [
    `確認先: ${inspection.sites.name}`,
    inspection.sites.address ? `住所: ${inspection.sites.address}` : null,
    `確認日: ${new Date(inspection.inspection_date).toLocaleDateString('ja-JP')}`,
    `確認者: ${inspection.inspector.name}`,
    `ステータス: ${getStatusLabel(inspection.status)}`,
    `テンプレート: ${inspection.templates.name}`,
  ].filter(Boolean) as string[]

  for (const line of infoLines) {
    try {
      const lineImage = await renderJapaneseTextToImage(line, 10)
      doc.addImage(lineImage.dataUrl, 'PNG', 14, currentY - 1, lineImage.width, lineImage.height)
      currentY += lineImage.height + 1
    } catch (e) {
      console.error('Failed to render line:', line, e)
      doc.text(line, 14, currentY)
      currentY += 6
    }
  }

  currentY += 4

  // サマリー
  if (inspection.summary) {
    try {
      const summaryTitleImage = await renderJapaneseTextToImage('所見・総評', 12)
      doc.addImage(summaryTitleImage.dataUrl, 'PNG', 14, currentY - 1, summaryTitleImage.width, summaryTitleImage.height)
      currentY += summaryTitleImage.height + 2
    } catch (e) {
      console.error('Failed to render summary title:', e)
      doc.setFontSize(12)
      doc.text('Summary', 14, currentY)
      currentY += 6
    }

    doc.setFontSize(10)
    // サマリーテキストも画像として追加
    try {
      const summaryText = inspection.summary
      const maxLineLength = 80 // 1行あたりの最大文字数
      const lines: string[] = []
      let currentLine = ''

      for (let i = 0; i < summaryText.length; i++) {
        currentLine += summaryText[i]
        if (currentLine.length >= maxLineLength || i === summaryText.length - 1) {
          lines.push(currentLine)
          currentLine = ''
        }
      }

      for (const line of lines) {
        const lineImage = await renderJapaneseTextToImage(line, 10)
        doc.addImage(lineImage.dataUrl, 'PNG', 14, currentY - 1, lineImage.width, lineImage.height)
        currentY += lineImage.height + 0.5
      }
      currentY += 3
    } catch (e) {
      console.error('Failed to render summary text:', e)
      const summaryLines = doc.splitTextToSize(inspection.summary, 180)
      doc.text(summaryLines, 14, currentY)
      currentY += summaryLines.length * 5 + 10
    }
  }

  // チェック項目を集計
  const templateItems = inspection.templates.template_items
  const checklistData: string[][] = []
  let currentSection = ''

  for (const item of templateItems) {
    if (item.item_type === 'section_header') {
      currentSection = item.label
      continue
    }

    const inspectionItem = inspection.inspection_items.find(
      (ii) => ii.template_item_id === item.id
    )

    let value = inspectionItem?.value || '-'

    // 評価値の変換
    if (item.item_type === 'rating_1_5_na' && value) {
      if (value === 'na') {
        value = '該当なし'
      } else if (value === '1') {
        value = '1 (不良)'
      } else if (value === '5') {
        value = '5 (良好)'
      }
    }

    const label = currentSection ? `${currentSection} - ${item.label}` : item.label
    checklistData.push([label, value])
  }

  // チェック項目をテーブルで表示
  if (checklistData.length > 0) {
    const docWithTable = doc as JsPDFWithAutoTable

    // テーブルのセルを画像で上書きするためのマップ
    const cellImages = new Map<string, { dataUrl: string; width: number; height: number }>()

    // 全てのセルの画像を事前に生成
    const headerTexts = ['確認項目', '評価・結果']
    for (let i = 0; i < headerTexts.length; i++) {
      const img = await renderJapaneseTextToImage(headerTexts[i], 9)
      cellImages.set(`header-${i}`, img)
    }

    for (let rowIndex = 0; rowIndex < checklistData.length; rowIndex++) {
      for (let colIndex = 0; colIndex < checklistData[rowIndex].length; colIndex++) {
        const text = checklistData[rowIndex][colIndex]
        const img = await renderJapaneseTextToImage(text, 8)
        cellImages.set(`${rowIndex}-${colIndex}`, img)
      }
    }

    autoTable(doc, {
      startY: currentY,
      head: [headerTexts],
      body: checklistData,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        minCellHeight: 8,
      },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 80 },
      },
      didDrawCell: (data) => {
        // ヘッダー行
        if (data.section === 'head') {
          const img = cellImages.get(`header-${data.column.index}`)
          if (img) {
            // 既存のテキストを白で塗りつぶし
            doc.setFillColor(66, 139, 202)
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F')

            // 画像を中央配置
            const imgX = data.cell.x + (data.cell.width - img.width) / 2
            const imgY = data.cell.y + (data.cell.height - img.height) / 2
            doc.addImage(img.dataUrl, 'PNG', imgX, imgY, img.width, img.height)
          }
        }
        // ボディ行
        else if (data.section === 'body') {
          const img = cellImages.get(`${data.row.index}-${data.column.index}`)
          if (img) {
            // 既存のテキストを白で塗りつぶし
            doc.setFillColor(255, 255, 255)
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F')

            // セルの枠線を再描画
            doc.setDrawColor(200, 200, 200)
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'S')

            // 画像を左寄せで配置
            const imgX = data.cell.x + 2
            const imgY = data.cell.y + (data.cell.height - img.height) / 2
            doc.addImage(img.dataUrl, 'PNG', imgX, imgY, Math.min(img.width, data.cell.width - 4), img.height)
          }
        }
      },
    })

    currentY = docWithTable.lastAutoTable?.finalY || currentY + 100
    currentY += 10
  }

  // 写真を追加
  if (includePhotos && inspection.photos && inspection.photos.length > 0) {
    // サマリー写真のみ（inspection_item_idがnullまたはundefined）
    const summaryPhotos = inspection.photos.filter(
      (p) => !p.inspection_item_id
    )

    if (summaryPhotos.length > 0) {
      // 新しいページに写真を追加
      doc.addPage()
      currentY = 20

      // 「添付写真」を画像として追加
      try {
        const photoTitleImage = await renderJapaneseTextToImage('添付写真', 14)
        doc.addImage(photoTitleImage.dataUrl, 'PNG', 14, currentY - 2, photoTitleImage.width, photoTitleImage.height)
        currentY += photoTitleImage.height + 3
      } catch (e) {
        console.error('Failed to render photo title:', e)
        doc.setFontSize(14)
        doc.text('Photos', 14, currentY)
        currentY += 10
      }

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 14
      const columns = 2
      const columnGap = 8
      const columnWidth = (pageWidth - margin * 2 - columnGap) / columns
      const maxImageHeight = 100
      let rowMaxHeight = 0
      let colIndex = 0

      for (let i = 0; i < summaryPhotos.length; i++) {
        const photo = summaryPhotos[i]

        // 進捗を報告
        if (onProgress) {
          onProgress(i + 1, summaryPhotos.length)
        }

        // 改ページ判定（次のカードが入らない場合）
        if (currentY + rowMaxHeight + maxImageHeight + 30 > pageHeight - margin) {
          doc.addPage()
          currentY = 20
          rowMaxHeight = 0
          colIndex = 0
        }

        const cardX = margin + colIndex * (columnWidth + columnGap)
        let cardY = currentY
        let cardHeight = 0

        try {
          // public_urlを優先、なければfile_pathから構築
          let photoUrl: string
          if (photo.public_url) {
            photoUrl = photo.public_url
          } else {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
            photoUrl = `${supabaseUrl}/storage/v1/object/public/${photo.file_path}`
          }

          // 画像をBase64に変換
          const base64Image = await urlToBase64(photoUrl)

          // 画像を圧縮
          const compressedImage = await compressImageForPDF(base64Image, 800)

          // 画像のサイズを取得
          const img = new Image()
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve()
            img.onerror = (e) => reject(new Error(`Failed to load image: ${e}`))
            img.src = compressedImage
          })

          const { width, height } = calculateImageSize(
            img.width,
            img.height,
            columnWidth,
            maxImageHeight
          )

          doc.addImage(compressedImage, 'JPEG', cardX, cardY, width, height)
          cardY += height + 3
          cardHeight = height + 3

          // ファイル名
          try {
            const filenameImage = await renderJapaneseTextToImage(photo.file_name, 8)
            doc.addImage(
              filenameImage.dataUrl,
              'PNG',
              cardX,
              cardY - 1,
              Math.min(filenameImage.width, columnWidth),
              filenameImage.height
            )
            cardY += filenameImage.height + 2
            cardHeight += filenameImage.height + 2
          } catch (e) {
            console.error('Failed to render filename:', e)
            doc.setFontSize(8)
            doc.setTextColor(100, 100, 100)
            doc.text(photo.file_name, cardX, cardY)
            doc.setTextColor(0, 0, 0)
            cardY += 8
            cardHeight += 8
          }

          // メモ
          const photoMemo = (photo.edited_data as { memo?: string })?.memo
          if (photoMemo && photoMemo.trim()) {
            try {
              const maxLineLength = 40
              const memoLines: string[] = []
              let currentLine = ''

              for (let j = 0; j < photoMemo.length; j++) {
                currentLine += photoMemo[j]
                if (currentLine.length >= maxLineLength || j === photoMemo.length - 1) {
                  memoLines.push(currentLine)
                  currentLine = ''
                }
              }

              for (const line of memoLines) {
                const memoImage = await renderJapaneseTextToImage(line, 8)
                doc.addImage(
                  memoImage.dataUrl,
                  'PNG',
                  cardX + 1,
                  cardY - 1,
                  Math.min(memoImage.width, columnWidth - 2),
                  memoImage.height
                )
                cardY += memoImage.height + 1
                cardHeight += memoImage.height + 1
              }
              cardY += 1
              cardHeight += 1
            } catch (e) {
              console.error('Failed to render photo memo:', e)
            }
          } else {
            cardHeight += 3
          }
        } catch (error) {
          console.error('Failed to add photo:', photo.file_name, error)
          doc.setFontSize(9)
          doc.setTextColor(200, 0, 0)
          doc.text(`写真の読み込みに失敗: ${photo.file_name}`, cardX, cardY)
          doc.setTextColor(0, 0, 0)
          cardHeight += 10
        }

        rowMaxHeight = Math.max(rowMaxHeight, cardHeight + 4)
        colIndex += 1

        // 行を折り返す
        if (colIndex >= columns) {
          currentY += rowMaxHeight
          rowMaxHeight = 0
          colIndex = 0
        }
      }

      // 最終行の高さを反映
      if (colIndex !== 0) {
        currentY += rowMaxHeight
      }
    }
  }

  // フッターに作成日時を追加（画像として）
  const totalPages = doc.getNumberOfPages()
  const pageHeight = doc.internal.pageSize.getHeight()

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    try {
      const footerText = `作成日時: ${new Date().toLocaleString('ja-JP')} - ページ ${i}/${totalPages}`
      const footerImage = await renderJapaneseTextToImage(footerText, 8)
      doc.addImage(
        footerImage.dataUrl,
        'PNG',
        14,
        pageHeight - 12,
        footerImage.width,
        footerImage.height
      )
    } catch (e) {
      console.error('Failed to render footer:', e)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(
        `Created: ${new Date().toLocaleString('ja-JP')} - Page ${i}/${totalPages}`,
        14,
        pageHeight - 10
      )
    }
  }

  return doc
}
