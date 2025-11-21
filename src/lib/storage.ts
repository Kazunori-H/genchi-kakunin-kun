const DEFAULT_PHOTO_BUCKET = 'inspection-photos'
const DEFAULT_ORGANIZATION_LOGO_BUCKET = 'organization-logos'

export function getInspectionPhotoBucket() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_INSPECTION_PHOTO_BUCKET ||
    DEFAULT_PHOTO_BUCKET
  )
}

export function getOrganizationLogoBucket() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ORG_LOGO_BUCKET ||
    DEFAULT_ORGANIZATION_LOGO_BUCKET
  )
}

export function getPublicStorageUrl(
  filePath: string,
  bucket = getInspectionPhotoBucket()
) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
  }

  return `${baseUrl}/storage/v1/object/public/${bucket}/${filePath}`
}

export function getOrganizationLogoPublicUrl(filePath: string) {
  return getPublicStorageUrl(filePath, getOrganizationLogoBucket())
}

export function extractStoragePathFromPublicUrl(bucket: string, url?: string | null) {
  if (!url) return null
  const marker = `/storage/v1/object/public/${bucket}/`
  const index = url.indexOf(marker)
  if (index === -1) return null
  return url.slice(index + marker.length)
}
