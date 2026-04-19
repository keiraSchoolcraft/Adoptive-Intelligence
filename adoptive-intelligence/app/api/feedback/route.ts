import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export interface FeedbackEntry {
  timestamp: string
  type: 'pet_match' | 'chat_message'
  rating: 'up' | 'down'
  petId?: string
  petName?: string
  matchScore?: number
  messageIndex?: number
  messageSnippet?: string
  query?: string
}

const FEEDBACK_PATH = path.join(process.cwd(), 'data', 'feedback.jsonl')

export async function POST(req: NextRequest) {
  try {
    const entry: FeedbackEntry = {
      timestamp: new Date().toISOString(),
      ...(await req.json()),
    }

    const line = JSON.stringify(entry) + '\n'
    fs.mkdirSync(path.dirname(FEEDBACK_PATH), { recursive: true })
    fs.appendFileSync(FEEDBACK_PATH, line, 'utf-8')

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  try {
    if (!fs.existsSync(FEEDBACK_PATH)) {
      return NextResponse.json({ entries: [], total: 0, precisionAt5: null })
    }

    const lines = fs.readFileSync(FEEDBACK_PATH, 'utf-8').trim().split('\n').filter(Boolean)
    const entries: FeedbackEntry[] = lines.map(l => JSON.parse(l))

    const petRatings = entries.filter(e => e.type === 'pet_match')
    const upCount = petRatings.filter(e => e.rating === 'up').length
    const precisionAt5 = petRatings.length > 0 ? upCount / petRatings.length : null

    return NextResponse.json({ entries, total: entries.length, precisionAt5 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
