/**
 * Valeters XLSX Import
 * --------------------
 * Imports valeter User records from the internal spreadsheet.
 *
 * Source columns: Account (dealership), Sub-Contractor (name), Rate Per Day, PAY ID
 *
 * Rules:
 *  - Each valeter → User with role: valeter
 *  - Matched to a Site under the named Dealership (creates a default site if none exists yet)
 *  - payId column is BLANK in the source — left null, to be added manually later
 *  - dailyRate is stored from the spreadsheet
 *  - Valeters who appear under "FLOATERS" are created as staffType: SSS (multi-site)
 *  - Duplicate check by firstName+lastName+siteId — safe to re-run
 *
 * Run from packages/db:
 *   npx tsx prisma/import-valeters.ts
 */

import { PrismaClient, StaffType } from '@prisma/client'
import * as fs from 'fs'
import * as XLSX from 'xlsx'
import * as path from 'path'
import * as crypto from 'crypto'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ── Spreadsheet → Dealership name fuzzy map ──────────────────────────────────
// Keys are the exact names from the spreadsheet, values are substrings to
// match against Dealership.name in the DB (case-insensitive contains).
const SHEET_TO_DEALERSHIP: Record<string, string> = {
  'Adventure Automotive':                          'Adventure Automotive',
  'Bicester Ford':                                 'Bicester Ford',
  'Buckingham Ford':                               'Buckingham Ford',
  'DLG Auto Services':                             'DLG Auto Services',
  'Donalds Peterborough':                          'Donalds - Peterborough',
  'Elite Car Body':                                'Elite Car Body',
  'FLOATERS':                                      'FLOATERS', // special — no site
  'Free Spirit':                                   'Free Spirit Automotive',
  'Graypaul Ferrari':                              'Graypaul Birmingham Ferrari',
  'Green Motion Car & Van Rental (Manchester)':    'Green Motion Car and Van Rental',
  'Green Motion Car & Van Rental BIRMINGHAM':      'Green Motion Birmingham',
  'Green Motion Car & Van Rental EDGWARE':         'Green Motion Edgware Road',
  'Green Motion Car & Van Rental LUTON':           'Green Motion Luton',
  'Green Motion Car & Van Rental SOUTHEND':        'Green Motion Southend',
  'Green Motion Car & Van Rental STANSTEAD':       'Envirocar Hire', // Stansted
  'Johnson Hyundai Sutton Coldfield':              'Johnsons Cars Ltd - Hyundai Sutton',
  'Johnsons Ford Tamworth':                        'Johnsons Cars Ltd - Ford Tamworth',
  'Johnsons Honda Milton Keynes':                  'Johnsons Cars Ltd - Honda Milton Keynes',
  'Johnsons Honda Oxford':                         'Johnsons Cars Ltd - Honda Oxford',
  'Johnsons Honda Slough':                         'Johnsons Cars Ltd - Honda Slough',
  'Johnsons Hyundai Cars Ltd (Coventry)':          'Johnsons Cars Ltd - Hyundai Coventry',
  'Johnsons Hyundai Tamworth':                     'Johnsons Cars Ltd - Hyundai Tamworth',
  'Johnsons Mazda Gloucester':                     'Johnsons Cars Ltd - Mazda Gloucester',
  'Johnsons Mazda Oxford':                         'Johnsons Cars Ltd - Mazda Oxford',
  'Johnsons Mazda Swindon':                        'Johnsons Cars Ltd - Mazda Swindon',
  'Johnsons Volvo Solihul':                        'Johnsons Cars Ltd - Volvo Solihull',
  'Listers Honda Northampton':                     'Listers Honda Northampton',
  'NMJ Motorhouse':                                'NMJ Motorhouse',
  'Northampton Car Company':                       'Northampton Car Company',
  'Northridge Cars':                               'Northridge Cars',
  'Porsche Centre Silverston (Sytner)':            'Porsche Centre Silverstone',
  'RGR Garages (Cranfield) Ltd':                   'RGR Garages',
  'Rockingham Cars':                               'Rockingham Cars',
  'Suzuki GB PLC':                                 'Suzuki GB PLC',
  'Sycamore BMW':                                  'Sycamore BMW',
  'Urban Automotive Ltd Stony Stratford':          'Urban Automotive',
  'Urban Automotive Ltd Tongwell':                 'Urban Automotive',
  'VCR':                                           'VCR - Vehicle Crash Repairs',
  'Wollaston BMW Main Branch (Bedford Road)':      'Wollaston BMW Northampton',
  'Wollaston BMW Preparation Centre':              'Wollaston BMW Preparation Centre',
}

interface ValeterRow {
  account: string
  fullName: string
  dailyRate: number | null
  payId: string | null  // always null in source — to be added manually
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function parseFullName(raw: string): { firstName: string; lastName: string } {
  // Format in spreadsheet: "SURNAME Firstname" or "SURNAME FIRSTNAME"
  const parts = raw.trim().split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  // First token = surname (all caps), rest = first name
  const lastName = parts[0]
  const firstName = parts.slice(1).join(' ')
  return { firstName, lastName }
}

async function findOrCreateSite(dealershipSheetName: string, orgId: string): Promise<string | null> {
  if (dealershipSheetName === 'FLOATERS') return null // handled separately

  const dealershipSearch = SHEET_TO_DEALERSHIP[dealershipSheetName] ?? dealershipSheetName

  // Find matching dealership (case-insensitive contains)
  const dealerships = await prisma.dealership.findMany({
    where: {
      name: { contains: dealershipSearch.split(' ')[0], mode: 'insensitive' },
    },
    select: { id: true, name: true },
  })

  // Pick best match (most words in common)
  let bestMatch = dealerships[0]
  if (dealerships.length > 1) {
    const searchLower = dealershipSearch.toLowerCase()
    bestMatch = dealerships.reduce((best, d) => {
      const score = (s: string) => searchLower.split(' ').filter(w => s.toLowerCase().includes(w)).length
      return score(d.name) > score(best.name) ? d : best
    })
  }

  if (!bestMatch) {
    console.log(`   ⚠️  No dealership found for: ${dealershipSheetName} (search: ${dealershipSearch})`)
    // Create a placeholder dealership + site so valeters aren't lost
    const d = await prisma.dealership.create({
      data: {
        organisationId: orgId,
        name: dealershipSheetName,
        isActive: true,
        xeroContactName: dealershipSheetName,
      },
    })
    bestMatch = d
    console.log(`      → Created placeholder dealership: ${dealershipSheetName}`)
  }

  // Find existing site under this dealership
  const existingSite = await prisma.site.findFirst({
    where: { dealershipId: bestMatch.id },
    select: { id: true, name: true },
  })
  if (existingSite) return existingSite.id

  // Create a default site
  const site = await prisma.site.create({
    data: {
      organisationId: orgId,
      dealershipId: bestMatch.id,
      name: `${bestMatch.name} - Main`,
      isActive: true,
    },
  })
  console.log(`   🏗  Created default site: ${site.name}`)
  return site.id
}

async function main() {
  const xlsxPath = path.resolve(
    __dirname,
    '../../../../uploaded_attachments/80ffd98019ff44fcb50ad6a14d59efa0/valeters.xlsx'
  )

  if (!fs.existsSync(xlsxPath)) {
    console.error(`❌ File not found: ${xlsxPath}`)
    process.exit(1)
  }

  // ── Parse XLSX ──────────────────────────────────────────────────────────────
  console.log('📂 Reading XLSX...')
  const wb = XLSX.readFile(xlsxPath)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rawRows: (string | number | null)[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
  })

  // Build structured rows
  const rows: ValeterRow[] = []
  let currentAccount: string | null = null

  for (const row of rawRows) {
    const accountCell = row[2] as string | null  // col C
    const nameCell    = row[3] as string | null  // col D
    const rateCell    = row[4] as number | null  // col E
    // col I (PAY ID) is always blank — intentionally not captured

    if (accountCell && String(accountCell).trim() === 'Account') continue // header row
    if (accountCell && String(accountCell).trim()) {
      currentAccount = String(accountCell).trim()
    }
    if (nameCell && String(nameCell).trim() && currentAccount) {
      rows.push({
        account:   currentAccount,
        fullName:  String(nameCell).trim(),
        dailyRate: typeof rateCell === 'number' ? rateCell : null,
        payId:     null, // always null — to be added manually
      })
    }
  }

  console.log(`   ${rows.length} valeter assignments across ${new Set(rows.map(r => r.account)).size} accounts\n`)

  // ── Get/create a root organisation for valeters (Total Valeting) ─────────
  // Valeters need an organisationId — use existing "Total Valeting" org or first org
  let rootOrg = await prisma.organisation.findFirst({
    where: { name: { contains: 'Total Valeting', mode: 'insensitive' } },
    select: { id: true, name: true },
  })
  if (!rootOrg) {
    rootOrg = await prisma.organisation.findFirst({ select: { id: true, name: true } })
  }
  if (!rootOrg) {
    rootOrg = await prisma.organisation.create({
      data: { name: 'Total Valeting', slug: 'total-valeting' },
    })
    console.log('   🏢 Created root organisation: Total Valeting')
  }
  console.log(`   📎 Using organisation: ${rootOrg.name}\n`)

  // ── Floaters site ─────────────────────────────────────────────────────────
  let floatersSite = await prisma.site.findFirst({
    where: { name: { contains: 'Floaters', mode: 'insensitive' } },
    select: { id: true },
  })
  if (!floatersSite) {
    floatersSite = await prisma.site.create({
      data: {
        organisationId: rootOrg.id,
        name: 'Floaters Pool',
        isActive: true,
      },
    })
    console.log('   🏗  Created site: Floaters Pool')
  }

  // ── Import valeters ────────────────────────────────────────────────────────
  let created = 0
  let skipped = 0
  const siteCache = new Map<string, string>() // account → siteId

  // Default hashed password — valeters will reset on first login
  const defaultPasswordHash = await bcrypt.hash('ChangeMe123!', 10)

  for (const row of rows) {
    const { firstName, lastName } = parseFullName(row.fullName)
    const isFloater = row.account === 'FLOATERS'

    // Resolve site
    let siteId: string
    if (isFloater) {
      siteId = floatersSite!.id
    } else {
      if (siteCache.has(row.account)) {
        siteId = siteCache.get(row.account)!
      } else {
        const resolved = await findOrCreateSite(row.account, rootOrg!.id)
        if (!resolved) {
          console.log(`   ⚠️  Could not resolve site for: ${row.fullName} @ ${row.account}`)
          skipped++
          continue
        }
        siteCache.set(row.account, resolved)
        siteId = resolved
      }
    }

    // Check duplicate: same first+last name at same site
    const exists = await prisma.user.findFirst({
      where: {
        firstName: { equals: firstName, mode: 'insensitive' },
        lastName:  { equals: lastName,  mode: 'insensitive' },
        siteId,
      },
      select: { id: true },
    })
    if (exists) {
      console.log(`   ⏭  Duplicate skipped: ${row.fullName} @ ${row.account}`)
      skipped++
      continue
    }

    // Generate a placeholder email (no real email in source data)
    const emailSlug = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z.]/g, '').replace(/\.+/g, '.')
    const emailBase = `${emailSlug}@ivaleter.internal`
    // Ensure uniqueness
    let email = emailBase
    let emailCounter = 1
    while (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
      email = `${emailSlug}${emailCounter++}@ivaleter.internal`
    }

    await prisma.user.create({
      data: {
        organisationId: rootOrg!.id,
        siteId,
        email,
        passwordHash: defaultPasswordHash,
        firstName,
        lastName,
        role:       'valeter',
        staffType:  isFloater ? StaffType.SSS : StaffType.SITE,
        isActive:   true,
        dailyRate:  row.dailyRate,
        payId:      null,  // to be added manually
      },
    })

    const label = isFloater ? '🟡 floater' : '🟢 valeter'
    console.log(`   ${label} ${row.fullName.padEnd(40)} @ ${row.account}`)
    created++
  }

  console.log('\n─────────────────────────────────────────')
  console.log(`✅ Valeters created:   ${created}`)
  console.log(`⏭  Skipped:           ${skipped}`)
  console.log(`📍 Sites resolved:    ${siteCache.size} dealership sites`)
  console.log('─────────────────────────────────────────')
  console.log('\n⚠️  All valeters created with placeholder email: firstname.lastname@ivaleter.internal')
  console.log('   Default password: ChangeMe123! — update before going live.')
  console.log('   PAY IDs are blank — add manually in the admin panel.')
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
