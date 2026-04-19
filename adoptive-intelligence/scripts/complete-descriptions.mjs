/**
 * One-time script: completes truncated pet descriptions (those ending in "...")
 * using the HF Inference API. Saves results back to data/pets-clean.json.
 *
 * Usage: node scripts/complete-descriptions.mjs
 *
 * Safe to re-run — already-completed pets are skipped.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const JSON_PATH = path.join(__dirname, '..', 'data', 'pets-clean.json')

// Load HF token from .env.local
const envPath = path.join(__dirname, '..', '.env.local')
const envVars = Object.fromEntries(
  fs.readFileSync(envPath, 'utf-8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => {
      const [k, ...v] = l.split('=')
      return [k.trim(), v.join('=').trim().replace(/^"(.*)"$/, '$1')]
    })
)
const HF_TOKEN = envVars.HF_TOKEN
if (!HF_TOKEN) throw new Error('HF_TOKEN not found in .env.local')

async function completeDescription(pet) {
  const context = [
    `Name: ${pet.name}`,
    `Species: ${pet.type}`,
    `Breed: ${pet.breed}`,
    `Age: ${pet.age}`,
    `Gender: ${pet.gender}`,
    pet.size ? `Size: ${pet.size}` : null,
    pet.weightLbs ? `Weight: ~${pet.weightLbs} lbs` : null,
  ].filter(Boolean).join('\n')

  const prompt = `You are writing a warm, engaging pet adoption bio for a shelter animal. \
Continue the following description naturally — write 2-4 more sentences that fit the tone and style of what's already there. \
Only output the continuation (do NOT repeat the existing text, do NOT add a heading). \
Keep it friendly, specific, and under 80 words.

Pet details:
${context}

Existing description (continue from where it cuts off):
"${pet.description.replace(/\.\.\.$/,'').trimEnd()}"

Continue:`

  const res = await fetch('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'Qwen/Qwen2.5-7B-Instruct',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 120,
      stream: false,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HF API ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  const continuation = data.choices?.[0]?.message?.content?.trim() ?? ''
  // Strip any leading quotes the model might echo back
  return continuation.replace(/^["']/, '').replace(/["']$/, '').trim()
}

async function main() {
  const pets = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'))
  const truncated = pets.filter(p => p.description.trimEnd().endsWith('...'))

  console.log(`Found ${truncated.length} truncated descriptions to complete.`)
  console.log('This will take a few minutes — processing one at a time to stay within rate limits.\n')

  let completed = 0
  let failed = 0

  for (const pet of truncated) {
    try {
      process.stdout.write(`[${completed + failed + 1}/${truncated.length}] ${pet.name} (${pet.breed})... `)
      const continuation = await completeDescription(pet)

      // Splice continuation onto the existing text (remove trailing "...")
      const base = pet.description.replace(/\.\.\.$/,'').trimEnd()
      // If base already ends with a sentence-ending punctuation, just append
      // Otherwise add a space
      const separator = /[.!?,]$/.test(base) ? ' ' : ' '
      pet.description = base + separator + continuation

      completed++
      console.log('✓')

      // Small delay to avoid hammering the API
      await new Promise(r => setTimeout(r, 800))
    } catch (err) {
      failed++
      console.log(`✗ (${err.message.slice(0, 60)})`)
      await new Promise(r => setTimeout(r, 2000))
    }
  }

  fs.writeFileSync(JSON_PATH, JSON.stringify(pets, null, 2))
  console.log(`\nDone. Completed: ${completed}, Failed: ${failed}`)
  console.log(`Updated: ${JSON_PATH}`)
}

main().catch(err => { console.error(err); process.exit(1) })
