// Local sentence embeddings via @xenova/transformers (runs in Node, no external service).
// Model: all-MiniLM-L6-v2 — 384-dim, ~90MB, downloaded on first call and cached locally.

let extractorPromise: Promise<any> | null = null;

const getExtractor = async () => {
  if (!extractorPromise) {
    const { pipeline, env } = await import('@xenova/transformers');
    // Allow downloading the model on first use; cache afterwards.
    env.allowLocalModels = true;
    env.allowRemoteModels = true;
    extractorPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractorPromise;
};

export const EMBEDDING_DIM = 384;

export const embed = async (text: string): Promise<number[]> => {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data as Float32Array);
};

export const embedMany = async (texts: string[]): Promise<number[][]> => {
  const results: number[][] = [];
  for (const text of texts) {
    results.push(await embed(text));
  }
  return results;
};

// Build the canonical text representation of a book that gets embedded.
export const buildBookEmbeddingText = (book: {
  title?: string | null;
  author?: string | null;
  publisher?: string | null;
  classification?: string | null;
  category?: string | null;
  tags?: string[] | null;
}): string => {
  const parts = [
    book.title ?? '',
    book.author ? `by ${book.author}` : '',
    book.category ?? '',
    (book.tags ?? []).join(', '),
    book.classification ?? '',
    book.publisher ?? '',
  ].filter((s) => s && s.trim().length > 0);
  return parts.join('. ');
};
