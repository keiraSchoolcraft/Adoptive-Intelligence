'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

type Rating = 'up' | 'down'

const CHAT_STORAGE_KEY = 'ai_chat_messages'

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

function ThumbButtons({
  id,
  rating,
  onRate,
  size = 'sm',
}: {
  id: string
  rating: Rating | null
  onRate: (id: string, r: Rating) => void
  size?: 'sm' | 'xs'
}) {
  const base = size === 'xs' ? 'w-6 h-6' : 'w-7 h-7'
  const icon = size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5'
  return (
    <div className="flex gap-1">
      <button
        onClick={() => onRate(id, 'up')}
        title="Helpful"
        className={`${base} rounded-full flex items-center justify-center transition-colors ${
          rating === 'up'
            ? 'bg-emerald-100 text-emerald-600'
            : 'bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-500'
        }`}
      >
        <ThumbUpIcon className={icon} />
      </button>
      <button
        onClick={() => onRate(id, 'down')}
        title="Not helpful"
        className={`${base} rounded-full flex items-center justify-center transition-colors ${
          rating === 'down'
            ? 'bg-red-100 text-red-500'
            : 'bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-400'
        }`}
      >
        <ThumbDownIcon className={icon} />
      </button>
    </div>
  )
}

function ChatBubble({
  message,
  index,
  isStreaming,
  rating,
  onRate,
}: {
  message: Message
  index: number
  isStreaming: boolean
  rating: Rating | null
  onRate: (id: string, r: Rating) => void
}) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="shrink-0 w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center">
          <PawIcon className="w-4 h-4 text-white" />
        </div>
      )}
      <div className="flex flex-col gap-1 max-w-[80%]">
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-blue-800 text-white rounded-tr-sm'
              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
          }`}
        >
          {message.content}
        </div>
        {!isUser && !isStreaming && message.content && (
          <div className="flex items-center gap-1 pl-1">
            <span className="text-xs text-slate-400">Helpful?</span>
            <ThumbButtons id={`msg-${index}`} rating={rating} onRate={onRate} size="xs" />
          </div>
        )}
      </div>
    </div>
  )
}

const WELCOME_MESSAGE: Message = {
  role: 'assistant',
  content:
    "Hi! I'm Adoptive Intelligence! I'm here to help you find your perfect shelter companion from King County Regional Animal Services.\n\nLet's find you a great match! First — what kind of animal are you hoping to adopt? A dog, cat, rabbit, or something else?",
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msgRatings, setMsgRatings] = useState<Record<string, Rating>>({})
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  // clear leftover session state on mount so the chat always starts fresh
  useEffect(() => {
    sessionStorage.removeItem(CHAT_STORAGE_KEY)
    sessionStorage.removeItem('ai_excluded_ids')
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const userMessages = messages.filter(m => m.role === 'user')
  const recentQuery = userMessages.slice(-6).map(m => m.content).join(' ')

  const postFeedback = useCallback((body: object) => {
    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {})
  }, [])

  function rateMessage(id: string, rating: Rating) {
    setMsgRatings(prev => ({ ...prev, [id]: rating }))
    const idx = parseInt(id.replace('msg-', ''))
    postFeedback({
      type: 'chat_message',
      rating,
      messageIndex: idx,
      messageSnippet: messages[idx]?.content.slice(0, 100),
    })
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || isLoading) return

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)
    setError(null)

    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: 'Chat API failed' }))
        throw new Error(err.error || 'Chat API failed')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            const token: string = parsed.choices?.[0]?.delta?.content ?? ''
            accumulated += token
            setMessages(prev => {
              const updated = [...prev]
              updated[updated.length - 1] = { role: 'assistant', content: accumulated }
              return updated
            })
          } catch {
            // skip malformed SSE chunks
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setIsLoading(false)
    }
  }

  function goToMatches() {
    if (userMessages.length === 0 || isLoading) return
    sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages))
    sessionStorage.removeItem('ai_excluded_ids')
    setIsNavigating(true)
    router.push(`/matches?q=${encodeURIComponent(recentQuery)}`)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="shrink-0 bg-blue-900 text-white px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
              <PawIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">Adoptive Intelligence</h1>
              <p className="text-xs text-blue-200 mt-0.5">King County Regional Animal Services &amp; Petfinder</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <a
              href="https://kingcounty.gov/en/dept/executive-services/animals-pets-pests/regional-animal-services"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-200 hover:text-white transition-colors"
            >
              RASKC →
            </a>
            <a
              href="https://www.petfinder.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-200 hover:text-white transition-colors"
            >
              Petfinder →
            </a>
          </div>
        </div>
      </header>

      <div className="flex flex-col flex-1 min-h-0 max-w-3xl w-full mx-auto w-full">
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.map((msg, i) => (
            <ChatBubble
              key={i}
              message={msg}
              index={i}
              isStreaming={isLoading && i === messages.length - 1}
              rating={msgRatings[`msg-${i}`] ?? null}
              onRate={rateMessage}
            />
          ))}
          {isLoading && messages[messages.length - 1]?.content === '' && (
            <div className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center">
                <PawIcon className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-5">
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="shrink-0 bg-white border-t border-slate-200 px-4 py-4">
          {userMessages.length >= 2 && (
            <button
              onClick={goToMatches}
              disabled={isNavigating || isLoading}
              className="w-full mb-3 py-2.5 rounded-xl bg-blue-800 hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {isNavigating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Loading matches…
                </>
              ) : (
                <>
                  <PawIcon className="w-4 h-4" />
                  Find My Match
                </>
              )}
            </button>
          )}
          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell me about your ideal pet…"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              style={{ minHeight: '44px', maxHeight: '120px' }}
              onInput={e => {
                const el = e.target as HTMLTextAreaElement
                el.style.height = 'auto'
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="shrink-0 w-11 h-11 rounded-xl bg-blue-800 hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors flex items-center justify-center"
            >
              <svg className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}
