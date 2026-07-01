/**
 * Valeters XLSX Import
 * --------------------
 * Source: valeters.xlsx
 * Columns (0-indexed, starting from col C = index 2):
 *   C (2) = Account (dealership name, only set on first row of a block)
 *   D (3) = Sub-Contractor (valeter full name)
 *   E (4) = Rate Per Day
 *   I (8) = PAY ID (always blank — to be added manually)
 *
 * Run from packages/db:
 *   npx tsx prisma/import-valeters.ts
 */

import { PrismaClient, StaffType } from '@prisma/client'
import * as fs from 'fs'
import * as XLSX from 'xlsx'
import * as path from 'path'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ── Spreadsheet account name → Dealership name fragment to search in DB ──────
const SHEET_TO_DEALERSHIP: Record<string, string> = {
  'Adventure Automotive':                          'Adventure Automotive',
  'Bicester Ford':                                 'Bicester Ford',
  'Buckingham Ford':                               'Buckingham Ford',
  'DLG Auto Services':                             'DLG Auto Services',
  'Donalds Peterborough':                          'Donalds',
  'Elite Car Body':                                'Elite Car Body',
  'Free Spirit':                                   'Free Spirit',
  'Graypaul Ferrari':                              'Graypaul',
  'Green Motion Car & Van Rental (Manchester)':    'Green Motion Car and Van Rental',
  'Green Motion Car & Van Rental BIRMINGHAM':      'Green Motion Birmingham',
  'Green Motion Car & Van Rental EDGWARE':         'Green Motion Edgware',
  'Green Motion Car & Van Rental LUTON':           'Green Motion Luton',
  'Green Motion Car & Van Rental SOUTHEND':        'Green Motion Southend',
  'Green Motion Car & Van Rental STANSTEAD':       'Envirocar',
  'Johnson Hyundai Sutton Coldfield':              'Hyundai Sutton',
  'Johnsons Ford Tamworth':                        'Ford Tamworth',
  'Johnsons Honda Milton Keynes':                  'Honda Milton Keynes',
  'Johnsons Honda Oxford':                         'Honda Oxford',
  'Johnsons Honda Slough':                         'Honda Slough',
  'Johnsons Hyundai Cars Ltd (Coventry)':          'Hyundai Coventry',
  'Johnsons Hyundai Tamworth':                     'Hyundai Tamworth',
  'Johnsons Mazda Gloucester':                     'Mazda Gloucester',
  'Johnsons Mazda Oxford':                         'Mazda Oxford',
  'Johnsons Mazda Swindon':                        'Mazda Swindon',
  'Johnsons Volvo Solihul':                        'Volvo Solihull',
  'Listers Honda Northampton':                     'Listers Honda',
  'NMJ Motorhouse':                                'NMJ Motorhouse',
  'Northampton Car Company':                       'Northampton Car Company',
  'Northridge Cars':                               'Northridge Cars',
  'Porsche Centre Silverston (Sytner)':            'Porsche Centre Silverstone',
  'RGR Garages (Cranfield) Ltd':                   'RGR Garages',
  'Rockingham Cars':                               'Rockingham Cars',
  'Suzuki GB PLC':                                 'Suzuki GB',
  'Sycamore BMW':                                  'Sycamore BMW',
  'Urban Automotive Ltd Stony Stratford':          'Urban Automotive',
  'Urban Automotive Ltd Tongwell':                 'Urban Automotive',
  'VCR':                                           'VCR',
  'Wollaston BMW Main Branch (Bedford Road)':      'Wollaston BMW Northampton',
  'Wollaston BMW Preparation Centre':              'Wollaston BMW Preparation',
}

function parseFullName(raw: string): { firstName: string; lastName: string } {
  const parts = raw.trim().split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  const lastName  = parts[0]
  const firstName = parts.slice(1).join(' ')
  return { firstName, lastName }
}

function isNameLike(val: unknown): boolean {
  if (typeof val !== 'string') return false
  const s = val.trim()
  if (!s) return false
  // Reject header row values and numeric-looking strings
  if (['Account', 'Sub-Contractor', 'Rate Per Day', 'Sub rates', 'Sub days', 'Deduction Total', 'PAY ID'].includes(s)) return false
  if (/^[\d.]+$/.test(s)) return false
  // Must contain at least one letter
  return /[a-zA-Z]/.test(s)
}

async function findOrCreateSite(accountName: string, orgId: string): Promise<string | null> {
  if (accountName === 'FLOATERS') return null

  const searchFragment = SHEET_TO_DEALERSHIP[accountName] ?? accountName

  const dealerships = await prisma.dealership.findMany({
    where: { name: { contains: searchFragment.split(' ')[0], mode: 'insensitive' } },
    select: { id: true, name: true },
  })

  let best = dealerships[0]
  if (dealerships.length > 1) {
    const lower = searchFragment.toLowerCase()
    best = dealerships.reduce((b, d) => {
      const score = (s: string) => lower.split(' ').filter(w => s.toLowerCase().includes(w)).length
      return score(d.name) > score(b.name) ? d : b
    })
  }

  if (!best) {
    console.log(`   ⚠️  No dealership found for: "${accountName}" — creating placeholder`)
    const d = await prisma.dealership.create({
      data: { organisationId: orgId, name: accountName, isActive: true, xeroContactName: accountName },
    })
    best = d
  }

  const existing = await prisma.site.findFirst({
    where: { dealershipId: best.id },
    select: { id: true },
  })
  if (existing) return existing.id

  const site = await prisma.site.create({
    data: { organisationId: orgId, dealershipId: best.id, name: `${best.name} - Main`, isActive: true },
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

  console.log('📂 Reading XLSX...')
  const wb   = XLSX.readFile(xlsxPath)
  const ws   = wb.Sheets[wb.SheetNames[0]]

  // Use sheet_to_json with header:1 to get raw arrays, then parse manually
  // We use column INDICES not header names to avoid misreads
  const allRows: (string | number | null)[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
    raw: true,
  })

  interface ValeterRow { account: string; fullName: string; dailyRate: number | null }
  const rows: ValeterRow[] = []
  let currentAccount: string | null = null

  for (const row of allRows) {
    // xlsx strips leading empty cols — sheet starts at C1 so indices are 0-based from C:
    // col C (0) = Account, col D (1) = Name, col E (2) = Rate Per Day
    const colC = row[0]
    const colD = row[1]
    const colE = row[2]

    // Skip header row
    if (colC === 'Account') continue

    // Update current account if col C has a valid dealership name
    if (typeof colC === 'string' && isNameLike(colC)) {
      currentAccount = colC.trim()
    }

    // A valeter row has a name-like value in col D
    if (isNameLike(colD as string) && currentAccount) {
      rows.push({
        account:   currentAccount,
        fullName:  String(colD).trim(),
        dailyRate: typeof colE === 'number' ? colE : null,
      })
    }
  }

  const accounts = new Set(rows.map(r => r.account))
  console.log(`   ${rows.length} valeter assignments across ${accounts.size} accounts\n`)

  // Root org
  let rootOrg = await prisma.organisation.findFirst({
    where: { name: { contains: 'Total Valeting', mode: 'insensitive' } },
    select: { id: true, name: true },
  })
  if (!rootOrg) {
    rootOrg = await prisma.organisation.findFirst({ select: { id: true, name: true } })
  }
  if (!rootOrg) {
    rootOrg = await prisma.organisation.create({ data: { name: 'Total Valeting', slug: 'total-valeting' } })
  }
  console.log(`   📎 Using organisation: ${rootOrg.name}\n`)

  // Floaters site
  let floatersSite = await prisma.site.findFirst({
    where: { name: { contains: 'Floaters', mode: 'insensitive' } },
    select: { id: true },
  })
  if (!floatersSite) {
    floatersSite = await prisma.site.create({
      data: { organisationId: rootOrg.id, name: 'Floaters Pool', isActive: true },
    })
    console.log('   🏗  Created site: Floaters Pool')
  }

  let created = 0
  let skipped = 0
  const siteCache = new Map<string, string>()
  const defaultPasswordHash = await bcrypt.hash('ChangeMe123!', 10)

  for (const row of rows) {
    const { firstName, lastName } = parseFullName(row.fullName)
    const isFloater = row.account === 'FLOATERS'

    let siteId: string
    if (isFloater) {
      siteId = floatersSite!.id
    } else {
      if (siteCache.has(row.account)) {
        siteId = siteCache.get(row.account)!
      } else {
        const resolved = await findOrCreateSite(row.account, rootOrg!.id)
        if (!resolved) { skipped++; continue }
        siteCache.set(row.account, resolved)
        siteId = resolved
      }
    }

    // Duplicate check
    const exists = await prisma.user.findFirst({
      where: {
        firstName: { equals: firstName, mode: 'insensitive' },
        lastName:  { equals: lastName,  mode: 'insensitive' },
        siteId,
      },
      select: { id: true },
    })
    if (exists) {
      console.log(`   ⏭  Duplicate: ${row.fullName} @ ${row.account}`)
      skipped++
      continue
    }

    // Unique placeholder email
    const emailSlug = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z.]/g, '').replace(/\.+/g, '.')
    let email = `${emailSlug}@ivaleter.internal`
    let n = 1
    while (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
      email = `${emailSlug}${n++}@ivaleter.internal`
    }

    await prisma.user.create({
      data: {
        organisationId: rootOrg!.id,
        siteId,
        email,
        passwordHash: defaultPasswordHash,
        firstName,
        lastName,
        role:      'valeter',
        staffType: isFloater ? StaffType.SSS : StaffType.SITE,
        isActive:  true,
        dailyRate: row.dailyRate,
        payId:     null,
      },
    })

    const label = isFloater ? '🟡 floater' : '🟢 valeter'
    console.log(`   ${label} ${row.fullName.padEnd(40)} @ ${row.account}`)
    created++
  }

  console.log('\n─────────────────────────────────────────')
  console.log(`✅ Valeters created:   ${created}`)
  console.log(`⏭  Skipped:           ${skipped}`)
  console.log(`📍 Sites resolved:    ${siteCache.size}`)
  console.log('─────────────────────────────────────────')
  console.log('\n⚠️  Placeholder emails: firstname.lastname@ivaleter.internal')
  console.log('   Default password: ChangeMe123! — update before go-live.')
  console.log('   PAY IDs are blank — add manually in the admin panel.')
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
