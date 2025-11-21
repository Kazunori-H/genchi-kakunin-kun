import { NextResponse } from 'next/server'

interface ErrorExtras {
  details?: unknown
  code?: unknown
}

export function jsonError(message: string, status = 400, extras?: ErrorExtras) {
  const payload: Record<string, unknown> = { error: message }
  if (extras?.details !== undefined) {
    payload.details = extras.details
  }
  if (extras?.code !== undefined) {
    payload.code = extras.code
  }
  return NextResponse.json(payload, { status })
}
