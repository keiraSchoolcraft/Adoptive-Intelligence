import { InferenceClient } from '@huggingface/inference'

const MODEL = 'sentence-transformers/all-MiniLM-L6-v2'

function getClient() {
  const token = process.env.HF_TOKEN
  if (!token) throw new Error('HF_TOKEN is not configured')
  return new InferenceClient(token)
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const client = getClient()
  // featureExtraction returns a nested array when given multiple inputs
  const result = await client.featureExtraction({
    model: MODEL,
    inputs: texts,
  })
  // Normalise output shape: result may be number[][] or number[][][]
  const raw = result as number[][] | number[][][]
  return raw.map((row) => {
    if (Array.isArray(row[0])) {
      // Mean-pool token embeddings if the model returned [seq_len, hidden]
      const matrix = row as number[][]
      const dim = matrix[0].length
      const mean = new Array<number>(dim).fill(0)
      for (const vec of matrix) vec.forEach((v, i) => { mean[i] += v })
      mean.forEach((_, i) => { mean[i] /= matrix.length })
      return mean
    }
    return row as number[]
  })
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}
