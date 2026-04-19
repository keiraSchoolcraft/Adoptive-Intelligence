import { NextRequest, NextResponse } from 'next/server'
import { loadAdoptablePets, petToSearchText, type Pet } from '@/lib/pets'
import { embedTexts, cosineSimilarity } from '@/lib/embeddings'

export interface PetMatch {
  pet: Pet
  score: number
}

let cachedPetEmbeddings: Promise<{ embeddings: number[][]; pets: Pet[] }> | null = null

// Cache embeddings per serverless instance lifetime.
// On Vercel, embeddings are computed via HF Inference API so no local warmup needed.
function getPetEmbeddings() {
  if (!cachedPetEmbeddings) {
    cachedPetEmbeddings = (async () => {
      const pets = loadAdoptablePets()
      const texts = pets.map(petToSearchText)
      const embeddings = await embedTexts(texts)
      return { embeddings, pets }
    })()
  }
  return cachedPetEmbeddings
}

function extractAnimalType(query: string): 'dog' | 'cat' | 'barn cat' | 'rabbit' | null {
  const q = query.toLowerCase()
  if (/\b(?:dogs?|puppies|puppy|pups?|canine)\b/.test(q)) return 'dog'
  if (/\b(?:barn\s+cats?|outdoor\s+cats?|feral\s+cats?)\b/.test(q)) return 'barn cat'
  if (/\b(?:cats?|kittens?|kitties|kitty|feline)\b/.test(q)) return 'cat'
  if (/\b(?:rabbits?|bunnies|bunny)\b/.test(q)) return 'rabbit'
  return null
}

// hard weight limit from the query
function extractWeightLimit(query: string): number | null {
  const patterns: RegExp[] = [
    /(?:under|less\s+than|below|max(?:imum)?|no\s+more\s+than|at\s+most)\s+(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)/i,
    /(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)\s*(?:or\s+)?(?:less|max(?:imum)?|or\s+under)/i,
    /(\d+(?:\.\d+)?)\s*(?:lb|pound)\s+max/i,
  ]
  for (const pat of patterns) {
    const m = query.match(pat)
    if (m?.[1]) return parseFloat(m[1])
  }
  return null
}

// hard age bounds from the query
function extractAgeBounds(query: string): { minMonths: number | null; maxMonths: number | null } {
  let minMonths: number | null = null
  let maxMonths: number | null = null

  const q = query.toLowerCase()

  if (/\bno\s+(?:puppies|puppy|kittens|kitten)\b/.test(q)) minMonths = Math.max(minMonths ?? 0, 12)
  else if (/\b(?:puppy|puppies|kitten|kittens|baby)\b/.test(q)) maxMonths = Math.min(maxMonths ?? Infinity, 12)

  if (/\bno\s+seniors?\b/.test(q)) maxMonths = Math.min(maxMonths ?? Infinity, 96)
  else if (/\bsenior\b/.test(q)) minMonths = Math.max(minMonths ?? 0, 96)

  if (/\byoung\b/.test(q) && !/\bno\s+young\b/.test(q)) maxMonths = Math.min(maxMonths ?? Infinity, 36)
  if (/\badult\b/.test(q) && !/\bno\s+adult\b/.test(q)) {
    minMonths = Math.max(minMonths ?? 0, 12)
    maxMonths = Math.min(maxMonths ?? Infinity, 96)
  }

  const maxPatterns: RegExp[] = [
    /(?:under|less\s+than|below|no\s+more\s+than|at\s+most)\s+(\d+)\s*years?/i,
    /(\d+)\s*years?\s*(?:or\s+)?(?:younger|less|or\s+under)/i,
  ]
  for (const pat of maxPatterns) {
    const m = query.match(pat)
    if (m?.[1]) { maxMonths = Math.min(maxMonths ?? Infinity, parseInt(m[1]) * 12); break }
  }
  const maxMonthPat = /(?:under|less\s+than|below|at\s+most)\s+(\d+)\s*months?/i
  const mm = query.match(maxMonthPat)
  if (mm?.[1]) maxMonths = Math.min(maxMonths ?? Infinity, parseInt(mm[1]))

  // text patterns (under __ age)
  const minPatterns: RegExp[] = [
    /(?:at\s+least|older\s+than|more\s+than|minimum|min)\s+(\d+)\s*years?/i,
    /(\d+)\s*years?\s*(?:or\s+)?(?:older|more|or\s+above)/i,
  ]
  for (const pat of minPatterns) {
    const m = query.match(pat)
    if (m?.[1]) { minMonths = Math.max(minMonths ?? 0, parseInt(m[1]) * 12); break }
  }
  const minMonthPat = /(?:at\s+least|older\s+than|minimum)\s+(\d+)\s*months?/i
  const mmin = query.match(minMonthPat)
  if (mmin?.[1]) minMonths = Math.max(minMonths ?? 0, parseInt(mmin[1]))

  return {
    minMonths: minMonths,
    maxMonths: maxMonths === Infinity ? null : maxMonths,
  }
}

export async function POST(req: NextRequest) {
  try {
    const { query, topK = 5, excludeIds = [] } = await req.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query string is required' }, { status: 400 })
    }

    const { pets, embeddings: petEmbeddings } = await getPetEmbeddings()

    const weightLimit = extractWeightLimit(query)
    const { minMonths, maxMonths } = extractAgeBounds(query)
    const animalType = extractAnimalType(query)
    const excludeSet = new Set<string>(excludeIds)

    const allowedIndices: number[] = pets.reduce<number[]>((acc, pet, i) => {
      if (excludeSet.has(pet.id)) return acc
      const t = pet.type.toLowerCase()
      const typeOk =
        (animalType === null      && !t.includes('barn')) ||
        (animalType === 'dog'     && t.includes('dog')) ||
        (animalType === 'cat'     && t.includes('cat') && !t.includes('barn')) ||
        (animalType === 'barn cat' && t.includes('barn')) ||
        (animalType === 'rabbit'  && (t.includes('rabbit') || t === 'rex'))
      const weightOk = weightLimit === null || pet.weightLbs === null || pet.weightLbs <= weightLimit
      const minOk    = minMonths === null   || (pet.ageMonths !== null && pet.ageMonths >= minMonths)
      const maxOk    = maxMonths === null   || pet.ageMonths === null  || pet.ageMonths <= maxMonths
      if (typeOk && weightOk && minOk && maxOk) acc.push(i)
      return acc
    }, [])

    const [queryEmbedding] = await embedTexts([query])

    const scored: PetMatch[] = allowedIndices.map(i => ({
      pet: pets[i],
      score: cosineSimilarity(queryEmbedding, petEmbeddings[i]),
    }))

    scored.sort((a, b) => b.score - a.score)

    return NextResponse.json({
      matches: scored.slice(0, topK),
      weightLimit,
      minMonths,
      maxMonths,
      totalBeforeFilter: pets.length,
      totalAfterFilter: allowedIndices.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
