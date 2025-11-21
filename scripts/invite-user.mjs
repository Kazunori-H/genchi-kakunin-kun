#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

function usage() {
  console.log(
    'Usage: node scripts/invite-user.mjs --email someone@example.com --name "Taro Yamada" --org <organization_id> [--role inspector|approver|admin] [--approval 0-3]'
  )
  process.exit(1)
}

function parseArgs() {
  const args = process.argv.slice(2)
  const result = {
    email: '',
    name: '',
    role: 'inspector',
    approval: 0,
    organization: '',
  }

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]
    const value = args[i + 1]
    if (!value) continue
    switch (key) {
      case '--email':
        result.email = value
        break
      case '--name':
        result.name = value
        break
      case '--role':
        result.role = value
        break
      case '--approval':
        result.approval = Number(value)
        break
      case '--org':
      case '--organization':
        result.organization = value
        break
      default:
        break
    }
  }

  if (!result.email || !result.name || !result.organization) {
    usage()
  }

  return result
}

function generateTempPassword() {
  const base = randomBytes(9).toString('base64url').slice(0, 12)
  return `${base}Aa1!`
}

function clampApproval(level) {
  if (Number.isNaN(level)) return 0
  return Math.max(0, Math.min(3, Math.floor(level)))
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const { email, name, role, approval, organization } = parseArgs()
  const allowedRoles = ['inspector', 'approver', 'admin']
  const normalizedRole = allowedRoles.includes(role) ? role : 'inspector'
  const approvalLevel = clampApproval(approval)
  const tempPassword = generateTempPassword()

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Create auth user
  const { data: created, error: createError } = await client.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  })
  if (createError || !created?.user) {
    console.error('Failed to create auth user', createError)
    process.exit(1)
  }

  // Insert app user row
  const { data: inserted, error: insertError } = await client
    .from('users')
    .insert({
      id: created.user.id,
      email,
      name,
      role: normalizedRole,
      organization_id: organization,
      approval_level: approvalLevel,
      is_active: true,
    })
    .select('id, name, email, role, approval_level')
    .single()

  if (insertError || !inserted) {
    console.error('Failed to insert user row', insertError)
    process.exit(1)
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000'
  const loginUrl = `${appUrl}/login`
  const setupUrl = `${appUrl}/settings/profile`

  console.log('✅ Invite completed')
  console.log({
    email,
    name,
    role: normalizedRole,
    approval_level: approvalLevel,
    tempPassword,
    loginUrl,
    setupUrl,
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
