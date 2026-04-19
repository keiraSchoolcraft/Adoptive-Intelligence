import fs from 'fs'
import path from 'path'

export interface Pet {
  id: string
  animalId: string
  name: string
  type: string
  breed: string
  color: string
  age: string
  gender: string
  size: string
  city: string
  state: string
  imageUrl: string
  link: string
  adoptionFee: string
  description: string
  weightLbs: number | null
  ageMonths: number | null
  source: 'raskc' | 'petfinder'
}

let cachedPets: Pet[] | null = null

export function loadAdoptablePets(): Pet[] {
  if (cachedPets) return cachedPets
  const jsonPath = path.join(process.cwd(), 'data', 'pets-clean.json')
  cachedPets = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as Pet[]
  return cachedPets
}

export function petToSearchText(pet: Pet): string {
  const sizeStr = pet.size ? `Size: ${pet.size}.` : ''
  return `${pet.name} is a ${pet.age} ${pet.gender} ${pet.breed} (${pet.type}). Color: ${pet.color}. ${sizeStr} ${pet.description}`.trim()
}
