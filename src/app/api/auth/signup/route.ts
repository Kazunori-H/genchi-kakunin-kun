import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Sign-up is managed by system administrators' },
    { status: 403 }
  )
}
