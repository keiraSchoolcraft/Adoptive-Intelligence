/**
 * Enrich a CSV of pet listings with descriptions scraped from PetFinder pages.
 *
 * Usage:
 *   pnpm add -D playwright
 *   npx playwright install chromium
 *   npx tsx scripts/enrich-petfinder.ts <input.csv> <output.csv>
 *
 * The input CSV must have a column containing PetFinder URLs. Update
 * URL_COLUMN and DESCRIPTION_COLUMN below to match your file's headers.
 */

import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import { stringify } from 'csv-stringify/sync'

const URL_COLUMN = 'petfinder_url'        // column name that holds the PetFinder link
const DESCRIPTION_COLUMN = 'description'  // output column to write the scraped text into
const DELAY_MS = 1500                     // polite delay between requests

async function scrapeDescription(page: Awaited<ReturnType<typeof chromium.launch>>['contexts'][0]['pages'][0], url: string): Promise<string> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })

    // Wait for the pet description section to load (PetFinder lazy-loads content)
    await page.waitForSelector('[data-test="Pet_Story-section"], .petStory, .u-vr4x', {
      timeout: 8000,
    }).catch(() => {})

    const description = await page.evaluate(() => {
      const selectors = [
        '[data-test="Pet_Story-section"]',
        '.petStory',
        '.u-vr4x',
        'section[aria-label*="story"]',
        'section[aria-label*="Story"]',
      ]
      for (const sel of selectors) {
        const el = document.querySelector(sel)
        if (el?.textContent?.trim()) return el.textContent.trim()
      }
      return ''
    })

    return description.replace(/\s+/g, ' ').trim()
  } catch {
    return ''
  }
}

async function main() {
  const [, , inputFile, outputFile] = process.argv

  if (!inputFile || !outputFile) {
    console.error('Usage: npx tsx scripts/enrich-petfinder.ts <input.csv> <output.csv>')
    process.exit(1)
  }

  const inputPath = path.resolve(inputFile)
  const outputPath = path.resolve(outputFile)

  const content = fs.readFileSync(inputPath, 'utf-8')
  const rows = parse(content, { columns: true, skip_empty_lines: true }) as Record<string, string>[]

  console.log(`Loaded ${rows.length} rows from ${inputPath}`)

  if (!rows[0]?.[URL_COLUMN]) {
    console.error(`Column "${URL_COLUMN}" not found. Available columns: ${Object.keys(rows[0] ?? {}).join(', ')}`)
    process.exit(1)
  }

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
  })
  const page = await context.newPage()

  const enriched: Record<string, string>[] = []
  let scraped = 0
  let skipped = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const url = row[URL_COLUMN]?.trim()

    if (!url || row[DESCRIPTION_COLUMN]) {
      enriched.push(row)
      skipped++
      continue
    }

    console.log(`[${i + 1}/${rows.length}] Scraping: ${url}`)
    const description = await scrapeDescription(page, url)

    enriched.push({ ...row, [DESCRIPTION_COLUMN]: description })

    if (description) {
      scraped++
      console.log(`  ✓ ${description.slice(0, 80)}…`)
    } else {
      console.log(`  ✗ No description found`)
    }

    await new Promise(r => setTimeout(r, DELAY_MS))
  }

  await browser.close()

  const output = stringify(enriched, { header: true })
  fs.writeFileSync(outputPath, output, 'utf-8')

  console.log(`\nDone. ${scraped} scraped, ${skipped} skipped.`)
  console.log(`Output written to ${outputPath}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
