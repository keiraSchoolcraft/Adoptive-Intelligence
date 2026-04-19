/**
 * Run once (or whenever source CSVs change) to produce data/pets-clean.json.
 * Usage: node scripts/prepare-data.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stripHtml(text) {
  return text
    .replace(/<p\/>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities (handle double-encoded like &amp;#34; → " )
    .replace(/&amp;/gi, '&')
    .replace(/&#34;|&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&') // second pass catches &amp;amp; → &amp; → &
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Parse a Python repr dict string into a plain JS object.
 * e.g. "{'primary': 'Terrier', 'mixed': True, 'secondary': None}"
 */
function parsePyDict(s) {
  if (!s || s.trim() === 'None' || s.trim() === '{}') return {}
  try {
    const json = s
      .replace(/'/g, '"')
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false')
      .replace(/\bNone\b/g, 'null')
    return JSON.parse(json)
  } catch {
    return {}
  }
}

function parsePyList(s) {
  if (!s || s.trim() === '[]') return []
  try {
    const parsed = JSON.parse(s.replace(/'/g, '"'))
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch {
    return []
  }
}

function str(val) {
  return val && val !== 'null' && val !== 'None' ? String(val).trim() : ''
}

// ─── Weight extraction ────────────────────────────────────────────────────────

function extractWeight(description) {
  if (!description) return null
  // Range like "55-60 lbs" → midpoint
  const rangeMatch = description.match(/\b(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)\b/i)
  if (rangeMatch) return (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2
  // Single value like "78.0 lbs", "8 pounds"
  const singleMatch = description.match(/\b(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)\b/i)
  if (singleMatch) return parseFloat(singleMatch[1])
  return null
}

// ─── Age extraction ───────────────────────────────────────────────────────────

// PetFinder categorical ages → approximate midpoint in months
const PETFINDER_AGE_MONTHS = { baby: 6, young: 18, adult: 48, senior: 108 }

function extractAgeMonths(ageStr) {
  if (!ageStr) return null
  const s = ageStr.toLowerCase().trim()

  // PetFinder categories: Baby / Young / Adult / Senior
  if (PETFINDER_AGE_MONTHS[s] !== undefined) return PETFINDER_AGE_MONTHS[s]

  // RASKC structured: "2 YEARS 4 MONTHS", "7 MONTHS", "1 YEAR", "9 WEEKS"
  let months = 0
  const yearMatch  = s.match(/(\d+)\s*years?/)
  const monthMatch = s.match(/(\d+)\s*months?/)
  const weekMatch  = s.match(/(\d+)\s*weeks?/)
  if (yearMatch)  months += parseInt(yearMatch[1])  * 12
  if (monthMatch) months += parseInt(monthMatch[1])
  if (weekMatch)  months += Math.round(parseInt(weekMatch[1]) / 4.33)
  if (months > 0) return months

  return null
}

// ─── RASKC ────────────────────────────────────────────────────────────────────

function extractAdoptionFee(memo) {
  const match = memo.match(/Adoption Fee:\s*([^\n<]+)/i)
  if (!match) return 'Contact shelter'
  const fee = match[1].trim()
  return fee.toLowerCase().startsWith('an adoption') ? 'Contact shelter' : fee
}

function loadRaskc() {
  const content = fs.readFileSync(path.join(DATA_DIR, 'pets.csv'), 'utf-8')
  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  })
  return rows
    .filter(r => r.Record_Type === 'ADOPTABLE')
    .map(r => ({
      id: `raskc-${r.impound_no || r.Animal_ID}`,
      animalId: r.Animal_ID || '',
      name: str(r.Animal_Name) || 'Unknown',
      type: str(r.animal_type) || 'Unknown',
      breed: str(r.Animal_Breed) || 'Unknown',
      color: str(r.Animal_Color) || 'Unknown',
      age: str(r.Age?.replace(/<p\/>/gi, '')) || 'Unknown',
      gender: str(r.Animal_Gender) || 'Unknown',
      size: '',
      city: str(r.City) || str(r.jurisdiction) || 'King County',
      state: str(r.State) || 'WA',
      imageUrl: str(r.Image),
      link: str(r.Link),
      adoptionFee: extractAdoptionFee(r.Memo || ''),
      description: stripHtml(r.Memo || ''),
      weightLbs: extractWeight(stripHtml(r.Memo || '')),
      ageMonths: extractAgeMonths(r.Age?.replace(/<p\/>/gi, '').trim()),
      source: 'raskc',
    }))
}

// ─── PetFinder ────────────────────────────────────────────────────────────────

function extractPhoto(s) {
  const p = parsePyDict(s)
  return str(p.medium) || str(p.large) || str(p.full)
}

function buildPetfinderDescription(row) {
  const parts = []

  if (row.description && row.description !== 'None') {
    parts.push(stripHtml(row.description.trim()))
  }

  const attrs = parsePyDict(row.attributes)
  const attrNotes = []
  if (attrs.house_trained === true)   attrNotes.push('house trained')
  if (attrs.spayed_neutered === true) attrNotes.push('spayed/neutered')
  if (attrs.shots_current === true)   attrNotes.push('shots current')
  if (attrs.special_needs === true)   attrNotes.push('special needs')
  if (attrNotes.length) parts.push(`Health & training: ${attrNotes.join(', ')}.`)

  const env = parsePyDict(row.environment)
  const envNotes = []
  if (env.children === true)       envNotes.push('good with children')
  else if (env.children === false) envNotes.push('not suited for children')
  if (env.dogs === true)           envNotes.push('good with other dogs')
  else if (env.dogs === false)     envNotes.push('should be only dog')
  if (env.cats === true)           envNotes.push('good with cats')
  else if (env.cats === false)     envNotes.push('not good with cats')
  if (envNotes.length) parts.push(`Compatibility: ${envNotes.join(', ')}.`)

  const tags = parsePyList(row.tags)
  if (tags.length) parts.push(`Traits: ${tags.join(', ')}.`)

  return parts.join(' ')
}

function loadPetfinder() {
  const csvPath = path.join(DATA_DIR, 'petfinder.csv')
  if (!fs.existsSync(csvPath)) {
    console.warn('  petfinder.csv not found, skipping')
    return []
  }

  const content = fs.readFileSync(csvPath, 'utf-8')
  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  })

  return rows
    .filter(r => r.status === 'adoptable')
    .map(r => {
      const breeds = parsePyDict(r.breeds)
      const breed =
        [str(breeds.primary), str(breeds.secondary)].filter(Boolean).join(' / ') || 'Unknown'

      const colors = parsePyDict(r.colors)
      const color = str(colors.primary) || 'Unknown'

      // contact is a nested Python dict: {'email': ..., 'address': {'city': ..., 'state': ...}}
      // Extract the inner address dict with a regex before parsing
      let city = 'Unknown', state = 'Unknown'
      const addrMatch = (r.contact || '').match(/'address':\s*(\{[^}]+\})/)
      if (addrMatch) {
        const addr = parsePyDict(addrMatch[1])
        city  = str(addr.city)  || 'Unknown'
        state = str(addr.state) || 'Unknown'
      }

      return {
        id: `pf-${r.id}`,
        animalId: r.id || '',
        name: str(r.name) || 'Unknown',
        type: str(r.type) || str(r.species) || 'Unknown',
        breed,
        color,
        age: str(r.age) || 'Unknown',
        gender: str(r.gender) || 'Unknown',
        size: str(r.size),
        city,
        state,
        imageUrl: extractPhoto(r.primary_photo_cropped || ''),
        link: str(r.url),
        adoptionFee: 'Contact shelter',
        description: buildPetfinderDescription(r),
        weightLbs: extractWeight(buildPetfinderDescription(r)),
        ageMonths: extractAgeMonths(r.age?.trim()),
        source: 'petfinder',
      }
    })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('Preparing pet data…')

const raskc = loadRaskc()
console.log(`  RASKC:     ${raskc.length} adoptable pets`)

const petfinder = loadPetfinder()
console.log(`  PetFinder: ${petfinder.length} adoptable pets`)

const all = [...raskc, ...petfinder]
const outPath = path.join(DATA_DIR, 'pets-clean.json')
fs.writeFileSync(outPath, JSON.stringify(all, null, 2), 'utf-8')

console.log(`  Total:     ${all.length} pets`)
console.log(`✓ Written to data/pets-clean.json`)
