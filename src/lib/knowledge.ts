import { generateEmbedding } from '@/lib/openai';
import { createAdminClient } from '@/lib/supabase/server';
import { chunkText, CrawledPage } from '@/lib/crawler';

export async function processAndStoreKnowledge(
  chatbotId: string,
  pages: CrawledPage[]
) {
  const supabase = await createAdminClient();

  for (const page of pages) {
    const chunks = chunkText(page.content, page.title, page.url);

    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk.content);

      const { error } = await supabase
        .from('knowledge_chunks')
        .insert({
          chatbot_id: chatbotId,
          content: chunk.content,
          embedding: embedding,
          source_url: chunk.metadata.sourceUrl,
          metadata: { title: chunk.metadata.pageTitle, chunkIndex: chunk.metadata.chunkIndex },
        });

      if (error) {
        console.error('Error inserting knowledge chunk:', error);
      }
    }
  }
}