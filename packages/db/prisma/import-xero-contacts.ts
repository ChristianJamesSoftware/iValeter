/**
 * Xero Contacts CSV Import
 * Run from repo root:
 *   cd packages/db && npx tsx prisma/import-xero-contacts.ts
 *
 * Rules:
 *  - Live=YES  → isActive: true
 *  - Live=""   → isActive: false  (archived/old sites)
 *
 * Head Office grouping by shared email domain.
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// ── Head Office domain map ────────────────────────────────────────────────────
const DOMAIN_TO_HO: Record<string, string> = {
  'johnsonscars.co.uk':    'Johnsons Cars Group',
  'johnsonshonda.co.uk':   'Johnsons Cars Group',
  'johnsonsford.co.uk':    'Johnsons Cars Group',
  'johnsonsmazda.co.uk':   'Johnsons Cars Group',
  'allenford.com':         'Allen Motor Group',
  'allenmotorgroup.co.uk': 'Allen Motor Group',
  'greenmotion.co.uk':     'Green Motion',
  'sytner.co.uk':          'Sytner Group',
  'perrys.co.uk':          'Perrys Motor Group',
  'wollastonbmw.co.uk':    'Wollaston BMW Group',
  'groveburycars.com':     'Grovebury Cars',
  'vindisgroup.com':       'Vindis Group',
  'waylands.co.uk':        'Waylands',
  'buckinghamford.co.uk':  'Buckingham Ford Group',
  'briancurrie.co.uk':     'Brian Currie',
}

// ── Simple CSV parser (no extra deps) ────────────────────────────────────────
function parseCsv(raw: string): Record<string, string>[] {
  const lines = raw.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  // Parse a single CSV line respecting quoted fields
  function parseLine(line: string): string[] {
    const fields: string[] = []
    let cur = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuote = !inQuote
      } else if (ch === ',' && !inQuote) {
        fields.push(cur.trim()); cur = ''
      } else {
        cur += ch
      }
    }
    fields.push(cur.trim())
    return fields
  }

  const headers = parseLine(lines[0])
  return lines.slice(1).map(line => {
    const vals = parseLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = vals[i] ?? '' })
    return row
  })
}

function getEmailDomain(email: string): string | null {
  if (!email?.includes('@')) return null
  return email.split('@')[1]?.toLowerCase() ?? null
}

function buildAddress(row: Record<string, string>): string {
  return [
    row['POAddressLine1'],
    row['POAddressLine2'],
    row['POAddressLine3'],
    row['POCity'],
    row['PORegion'],
    row['POPostalCode'],
  ].filter(Boolean).join(', ')
}

async function main() {
  // CSV path — adjust if running from a different location
  const csvPath = path.resolve(
    __dirname,
    '../../../../uploaded_attachments/67db6fffdb22492bad62133d7cab42fe/Contacts.csv'
  )

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV not found at: ${csvPath}`)
    console.error('   Place your Contacts.csv in the repo root or update the path above.')
    process.exit(1)
  }

  console.log('📂 Reading CSV...')
  const raw = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCsv(raw)
  console.log(`   ${rows.length} rows found\n`)

  let created = 0
  let skippedDuplicate = 0
  let archivedCount = 0
  const hoCache = new Map<string, string>() // hoName → organisationId

  // ── Find or create Head Office ──────────────────────────────────────────────
  async function findOrCreateHO(hoName: string): Promise<string> {
    if (hoCache.has(hoName)) return hoCache.get(hoName)!
    const existing = await prisma.organisation.findFirst({
      where: { name: hoName },
      select: { id: true },
    })
    if (existing) {
      hoCache.set(hoName, existing.id)
      return existing.id
    }
    const slug = hoName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    // Ensure slug uniqueness by appending a counter if needed
    let finalSlug = slug
    let slugCounter = 1
    while (true) {
      const slugExists = await prisma.organisation.findUnique({ where: { slug: finalSlug }, select: { id: true } })
      if (!slugExists) break
      finalSlug = `${slug}-${slugCounter++}`
    }
    const org = await prisma.organisation.create({ data: { name: hoName, slug: finalSlug } })
    hoCache.set(hoName, org.id)
    console.log(`   🏢 Head Office created: ${hoName}`)
    return org.id
  }

  console.log('🚀 Importing...\n')

  for (const row of rows) {
    const dealershipName = row['*ContactName']?.trim()
    if (!dealershipName) continue

    const isActive   = row['Live']?.trim().toUpperCase() === 'YES'
    const email      = row['EmailAddress']?.trim() || null
    const domain     = getEmailDomain(email ?? '')
    const hoName     = (domain && DOMAIN_TO_HO[domain]) ?? dealershipName
    const address    = buildAddress(row) || null
    const contactName = [row['FirstName'], row['LastName']].filter(Boolean).join(' ').trim() || null
    const phone      = row['PhoneNumber']?.trim() || row['MobileNumber']?.trim() || null
    const legalName  = row['LegalName']?.trim() || dealershipName
    const accountNum = row['AccountNumber']?.trim() || null  // Xero account ref

    const orgId = await findOrCreateHO(hoName)

    // Skip if already imported
    const exists = await prisma.dealership.findFirst({
      where: { name: dealershipName, organisationId: orgId },
      select: { id: true },
    })
    if (exists) {
      console.log(`   ⏭  Duplicate skipped: ${dealershipName}`)
      skippedDuplicate++
      continue
    }

    await prisma.dealership.create({
      data: {
        organisationId:  orgId,
        name:            dealershipName,
        address,
        contactName,
        contactEmail:    email,
        contactPhone:    phone,
        isActive,
        xeroContactId:   accountNum,
        xeroContactName: legalName,
      },
    })

    const label = isActive ? '🟢 live    ' : '🔴 archived'
    console.log(`   ${label} ${dealershipName}`)
    created++
    if (!isActive) archivedCount++
  }

  console.log('\n─────────────────────────────────────────')
  console.log(`✅ Dealerships created:    ${created}`)
  console.log(`   🟢 Live (active):       ${created - archivedCount}`)
  console.log(`   🔴 Archived (inactive): ${archivedCount}`)
  console.log(`⏭  Skipped (duplicate):   ${skippedDuplicate}`)
  console.log(`🏢 Head Offices used:      ${hoCache.size}`)
  console.log('─────────────────────────────────────────')
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
