import { NextRequest } from 'next/server'
import { InferenceClient } from '@huggingface/inference'

const SYSTEM_PROMPT = `You are Adoptive Intelligence, a warm and compassionate pet adoption assistant for the King County Regional Animal Services (RASKC) shelter in Washington State.

Your mission is to help potential adopters find their perfect shelter pet through a friendly conversation. Before you can suggest a match, you MUST learn the answers to ALL FIVE of these required questions — ask them naturally across the conversation, one or two at a time, not all at once:

1. ANIMAL TYPE: What kind of animal are they looking for? (dog, cat, rabbit, etc.)
2. CHILDREN: Do they have children at home, and if so, how old are they? (This affects whether the pet needs to be kid-friendly.)
3. OTHER PETS: Do they currently have other pets? (Species, size, and temperament matter for compatibility.)
4. AGE PREFERENCE: Do they prefer a young animal (puppy/kitten/baby), an adult, a senior, or does age not matter?
5. LIVING SITUATION & PERSONALITY: Ask about both of these together, tailored to what they said in #1:
   - If they want a dog: What is their living situation (house with yard, apartment, condo)? And what temperament/personality do they want in a dog — energetic and playful, calm and relaxed, affectionate and cuddly, independent, good for training, etc.?
   - If they want a cat: Do they want an indoor-only cat? Playful or laid-back personality?
   - If they want another animal: Ask what living situation and personality traits matter to them.

Rules:
- Do NOT suggest matches or click "Find My Match" until you have answers to all five required questions (animal type, children, other pets, age preference, living situation & personality).
- If the user tries to skip ahead, gently redirect: acknowledge what they said and ask one of the remaining required questions.
- Once animal type is known, tailor all follow-up questions to that animal (e.g. ask about yard/apartment for dogs, indoor preference for cats).
- Be warm, conversational, and concise — ask one or two questions per message, never a long list.
- Reassure users that shelter animals make wonderful companions.
- Note: some animals in the shelter are "barn cats" (feral/outdoor cats) — never suggest these for indoor home environments. They are only suitable for farms or outdoor settings.
- Once all five required questions are answered and you have reasonable context, tell the user they can click "Find My Match" to see personalized recommendations.
- Do not invent or describe specific pets — the matching system handles that.`

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    const token = process.env.HF_TOKEN
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'HF_TOKEN is not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const client = new InferenceClient(token)

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const chatStream = client.chatCompletionStream({
            model: 'meta-llama/Llama-3.1-8B-Instruct',
            provider: 'featherless-ai',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              ...messages,
            ],
            max_tokens: 512,
          })

          for await (const chunk of chatStream) {
            const token = chunk.choices[0]?.delta?.content ?? ''
            if (token) {
              const data = JSON.stringify({ choices: [{ delta: { content: token } }] })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Stream error'
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
