import { getOpenAI } from '@/lib/openai';

export async function extractBusinessInfo(pages: { url: string; content: string }[]) {
  // Use the first few pages (home, about, etc.) to extract info to save tokens
  const context = pages
    .slice(0, 5)
    .map(p => `URL: ${p.url}\nContent: ${p.content.substring(0, 2000)}`)
    .join('\n\n');

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an expert at analyzing business websites. 
        Extract the following information from the provided website content:
        1. Business Name
        2. Business Type (e.g., SaaS, E-commerce, Agency)
        3. Core Products or Services (list them)
        4. Frequently Asked Questions (if found, list them with answers)
        5. Contact Information (email, phone, address if available)
        
        Format your response as a JSON object with these keys: 
        name, type, products, faqs (array of {question, answer}), contact.`,
      },
      {
        role: 'user',
        content: `Here is the website content:\n\n${context}`,
      },
    ],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('Failed to extract business info');
  
  return JSON.parse(content);
}
