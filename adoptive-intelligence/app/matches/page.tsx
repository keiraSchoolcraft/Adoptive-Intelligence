'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { Pet } from '@/lib/pets'

interface PetMatch {
  pet: Pet
  score: number
}

type Rating = 'up' | 'down'

// icons
function PawIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
      <path d="M490.39 182.75c-5.55-13.19-14.77-22.7-26.67-27.49l-.16-.06a46.5 46.5 0 0 0-17-3.2h-.64c-27.24.41-55.05 23.56-69.19 57.61c-10.37 24.9-11.56 51.68-3.18 71.64c5.54 13.2 14.78 22.71 26.73 27.5l.13.05a46.5 46.5 0 0 0 17 3.2c27.5 0 55.6-23.15 70-57.65c10.24-24.87 11.37-51.63 2.98-71.6M381.55 329.61c-15.71-9.44-30.56-18.37-40.26-34.41C314.53 250.8 298.37 224 256 224s-58.57 26.8-85.39 71.2c-9.72 16.06-24.6 25-40.36 34.48c-18.07 10.86-36.74 22.08-44.8 44.16a66.9 66.9 0 0 0-4.65 25c0 35.95 28 65.2 62.4 65.2c17.75 0 36.64-6.15 56.63-12.66c19.22-6.26 39.09-12.73 56.27-12.73s37 6.47 56.15 12.73C332.2 457.85 351 464 368.8 464c34.35 0 62.3-29.25 62.3-65.2a67 67 0 0 0-4.75-25c-8.06-22.1-26.74-33.33-44.8-44.19M150 188.85c11.9 14.93 27 23.15 42.52 23.15a43 43 0 0 0 6.33-.47c32.37-4.76 52.54-44.26 45.92-90C242 102.3 234.6 84.39 224 71.11C212.12 56.21 197 48 181.49 48a43 43 0 0 0-6.33.47c-32.37 4.76-52.54 44.26-45.92 90c2.76 19.2 10.16 37.09 20.76 50.38m163.16 22.68a43 43 0 0 0 6.33.47c15.53 0 30.62-8.22 42.52-23.15c10.59-13.29 17.95-31.18 20.75-50.4c6.62-45.72-13.55-85.22-45.92-90a43 43 0 0 0-6.33-.47C315 48 299.88 56.21 288 71.11c-10.6 13.28-18 31.19-20.76 50.44c-6.62 45.72 13.55 85.22 45.92 89.98M111.59 308.8l.14-.05c11.93-4.79 21.16-14.29 26.69-27.48c8.38-20 7.2-46.75-3.15-71.65C120.94 175.16 92.85 152 65.38 152a46.4 46.4 0 0 0-17 3.2l-.14.05c-11.9 4.75-21.13 14.29-26.66 27.48c-8.38 20-7.2 46.75 3.15 71.65C39.06 288.84 67.15 312 94.62 312a46.4 46.4 0 0 0 16.97-3.2" />
    </svg>
  )
}

function ThumbUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
    </svg>
  )
}

function ThumbDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
    </svg>
  )
}

// ─── ThumbButtons ─────────────────────────────────────────────────────────────

function ThumbButtons({
  id,
  rating,
  onRate,
}: {
  id: string
  rating: Rating | null
  onRate: (id: string, r: Rating) => void
}) {
  return (
    <div className="flex gap-1">
      <button
        onClick={() => onRate(id, 'up')}
        title="Good match"
        className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
          rating === 'up'
            ? 'bg-emerald-100 text-emerald-600'
            : 'bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-500'
        }`}
      >
        <ThumbUpIcon className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onRate(id, 'down')}
        title="Not a good match"
        className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
          rating === 'down'
            ? 'bg-red-100 text-red-500'
            : 'bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-400'
        }`}
      >
        <ThumbDownIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// card for the pets

function PetCard({
  match,
  rank,
  rating,
  onRate,
}: {
  match: PetMatch
  rank: number
  rating: Rating | null
  onRate: (petId: string, r: Rating) => void
}) {
  const { pet, score } = match
  const pct = Math.round(score * 100)
  const [expanded, setExpanded] = useState(false)
  const SNIPPET_LEN = 120
  const hasMore = pet.description.length > SNIPPET_LEN
  const displayText = expanded || !hasMore
    ? pet.description
    : pet.description.slice(0, SNIPPET_LEN).trim()

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col ${
      rating === 'up' ? 'border-emerald-300' : rating === 'down' ? 'border-red-300' : 'border-slate-200'
    }`}>
      <div className="relative">
        {pet.imageUrl ? (
          <img
            src={pet.imageUrl}
            alt={`${pet.name} the ${pet.breed}`}
            className="w-full h-44 object-cover"
            onError={e => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className="w-full h-44 bg-blue-50 flex items-center justify-center">
            <PawIcon className="w-16 h-16 text-blue-200" />
          </div>
        )}
        <div className="absolute top-2 left-2 bg-blue-800 text-white text-xs font-bold px-2 py-1 rounded-full">
          #{rank}
        </div>
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-slate-700 text-xs font-semibold px-2 py-1 rounded-full">
          {pct}% match
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-slate-900 text-lg leading-tight">{pet.name}</h3>
          <span className="shrink-0 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">
            {pet.type}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {[pet.breed, pet.age, pet.gender, pet.color, pet.size || null,
            pet.weightLbs ? `${pet.weightLbs} lbs` : null]
            .filter(Boolean).map(tag => (
            <span key={tag} className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">
              {tag}
            </span>
          ))}
        </div>
        {pet.description && (
          <>
            <p className="text-sm text-slate-600 leading-relaxed">
              {displayText}{!expanded && hasMore ? '…' : ''}
            </p>
            {hasMore && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="mt-1.5 mb-3 text-xs font-semibold text-blue-700 hover:text-blue-800 underline underline-offset-2 transition-colors block"
              >
                {expanded ? '↑ Show less' : '↓ Read full description'}
              </button>
            )}
            {!hasMore && <div className="mb-3" />}
          </>
        )}
        <div className="mt-auto flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700">
              {pet.adoptionFee === 'Contact shelter' ? 'Fee: Contact shelter' : `Fee: ${pet.adoptionFee}`}
            </span>
            <ThumbButtons id={pet.id} rating={rating} onRate={onRate} />
          </div>
          {pet.link && (
            <a
              href={pet.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-blue-700 hover:text-blue-800 transition-colors"
            >
              Meet me →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function MatchesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get('q') ?? ''

  const [matches, setMatches] = useState<PetMatch[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [petRatings, setPetRatings] = useState<Record<string, Rating>>({})
  const [excludedIds, setExcludedIds] = useState<string[]>(() => {
    try { return JSON.parse(sessionStorage.getItem('ai_excluded_ids') ?? '[]') } catch { return [] }
  })

  const postFeedback = useCallback((body: object) => {
    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {})
  }, [])

  function goBack() {
    sessionStorage.removeItem('ai_excluded_ids')
    router.push('/')
  }

  const loadMatches = useCallback(async (excluded: string[] = excludedIds) => {
    if (!query) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, topK: 5, excludeIds: excluded }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Matching failed')
      setMatches(data.matches)
      setPetRatings({})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Matching failed')
    } finally {
      setIsLoading(false)
    }
  }, [query, excludedIds])

  useEffect(() => { loadMatches() }, [loadMatches])

  function showDifferent() {
    if (!matches) return
    const newExcluded = [...new Set([...excludedIds, ...matches.map(m => m.pet.id)])]
    setExcludedIds(newExcluded)
    sessionStorage.setItem('ai_excluded_ids', JSON.stringify(newExcluded))
    loadMatches(newExcluded)
  }

  function resetAndReload() {
    setExcludedIds([])
    sessionStorage.removeItem('ai_excluded_ids')
    loadMatches([])
  }

  function ratePet(petId: string, rating: Rating) {
    setPetRatings(prev => ({ ...prev, [petId]: rating }))
    const match = matches?.find(m => m.pet.id === petId)
    postFeedback({
      type: 'pet_match',
      rating,
      petId,
      petName: match?.pet.name,
      matchScore: match?.score,
      query,
    })
  }

  const ratedPets = Object.values(petRatings)
  const precision = ratedPets.length > 0
    ? Math.round((ratedPets.filter(r => r === 'up').length / ratedPets.length) * 100)
    : null

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="shrink-0 bg-blue-900 text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => goBack()}
              className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              title="Back to chat"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
              <PawIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">Your Top Matches</h1>
              <p className="text-xs text-blue-200 mt-0.5">King County Regional Animal Services &amp; Petfinder</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {precision !== null && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-blue-200 bg-white/10 rounded-full px-3 py-1">
                <span>Precision@5:</span>
                <span className={`font-bold ${precision >= 70 ? 'text-emerald-300' : 'text-yellow-300'}`}>
                  {precision}%
                </span>
                <span className="text-blue-300">({ratedPets.length} rated)</span>
              </div>
            )}
            <button
              onClick={() => loadMatches()}
              disabled={isLoading}
              className="text-xs text-blue-200 hover:text-white font-semibold transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-800 rounded-full animate-spin" />
            <p className="text-slate-500 text-sm">Finding your matches…</p>
            <p className="text-slate-400 text-xs">May take ~30s on first run while the AI model loads</p>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 max-w-lg mx-auto">
            {error}
          </div>
        )}

        {!isLoading && !error && matches && (
          <>
            <p className="text-sm text-slate-500 mb-6">
              Showing {matches.length} best matches · Rate each one to help improve future suggestions
              {excludedIds.length > 0 && (
                <button onClick={resetAndReload} className="ml-2 text-blue-600 hover:text-blue-800 underline underline-offset-2">
                  (reset — show all pets again)
                </button>
              )}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {matches.map((match, i) => (
                <PetCard
                  key={match.pet.id}
                  match={match}
                  rank={i + 1}
                  rating={petRatings[match.pet.id] ?? null}
                  onRate={ratePet}
                />
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <button
                onClick={showDifferent}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Show me different ones
              </button>
            </div>
          </>
        )}

        {!isLoading && !error && matches?.length === 0 && (
          <div className="text-center py-24">
            <PawIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No pets matched your criteria. Try adjusting your preferences.</p>
          </div>
        )}
      </main>

      <footer className="shrink-0 bg-white border-t border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
              onClick={() => goBack()}
            className="flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to chat
          </button>
          <p className="text-xs text-slate-400">Rate matches to track Precision@5</p>
        </div>
      </footer>
    </div>
  )
}

export default function MatchesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-800 rounded-full animate-spin" />
      </div>
    }>
      <MatchesContent />
    </Suspense>
  )
}
