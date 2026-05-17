import OpenAI from 'openai';

let client: OpenAI | null = null;

export function getOpenAI() {
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY environment variable');
  }
  client = new OpenAI({ apiKey });
  return client;
}

export async function generateEmbedding(text: string) {
  const openai = getOpenAI();
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.replace(/\n/g, ' '),
  });

  return response.data[0].embedding;
}
