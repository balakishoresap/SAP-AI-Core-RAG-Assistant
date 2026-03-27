const path = require('path');
const fs = require('fs');

/**
 * Document Processor — loads, chunks, and embeds knowledge base documents.
 *
 * Responsibilities:
 *   1. Load documents from /data/knowledge-base.json
 *   2. Split each section into overlapping chunks for better retrieval
 *   3. Generate mock embeddings (demo) or call SAP AI Core (production)
 *   4. Load processed chunks into the VectorStore
 *
 * In production, step 3 would call SAP AI Core's embedding model endpoint:
 *   POST /deployments/{deploymentId}/predict
 *   { "input": "chunk text", "model": "text-embedding-ada-002" }
 */
class DocumentProcessor {

  /**
   * @param {object} options
   * @param {number} [options.chunkSize=500] - Target characters per chunk
   * @param {number} [options.chunkOverlap=100] - Overlap between consecutive chunks
   * @param {number} [options.embeddingDims=384] - Embedding vector dimensions
   */
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 500;
    this.chunkOverlap = options.chunkOverlap || 100;
    this.embeddingDims = options.embeddingDims || 384;
  }

  /**
   * Load and process the knowledge base JSON file.
   * Returns an array of chunks ready for the vector store.
   *
   * @param {string} [filePath] - Path to knowledge-base.json. Defaults to /data/knowledge-base.json
   * @returns {Array<{id: string, title: string, content: string, source: string, category: string, embedding: number[]}>}
   */
  loadKnowledgeBase(filePath) {
    const resolvedPath = filePath || path.resolve(__dirname, '../../data/knowledge-base.json');

    if (!fs.existsSync(resolvedPath)) {
      console.warn(`[DocumentProcessor] Knowledge base not found at: ${resolvedPath}`);
      return [];
    }

    const raw = fs.readFileSync(resolvedPath, 'utf-8');
    const kb = JSON.parse(raw);

    console.log(`[DocumentProcessor] Loading ${kb.documents.length} documents from knowledge base v${kb.metadata.version}`);

    const allChunks = [];

    for (const doc of kb.documents) {
      const docChunks = this.processDocument(doc);
      allChunks.push(...docChunks);
    }

    console.log(`[DocumentProcessor] Processed ${allChunks.length} chunks total`);
    return allChunks;
  }

  /**
   * Process a single document: flatten sections → chunk → embed.
   *
   * @param {object} doc - A document from knowledge-base.json
   * @returns {Array<{id: string, title: string, content: string, source: string, category: string, embedding: number[]}>}
   */
  processDocument(doc) {
    const chunks = [];

    for (const section of doc.sections) {
      const sectionChunks = this.chunkText(section.content);

      for (let i = 0; i < sectionChunks.length; i++) {
        const chunkId = `${doc.id}_${section.heading.replace(/\s+/g, '_')}_chunk${i}`;
        const chunkContent = sectionChunks[i];

        // Prepend section heading for context in retrieval
        const contextualContent = `[${doc.title} — ${section.heading}]\n${chunkContent}`;

        chunks.push({
          id: chunkId,
          title: `${doc.title} — ${section.heading}`,
          content: contextualContent,
          source: `${doc.title} (${doc.id})`,
          category: doc.category,
          embedding: this.generateEmbedding(contextualContent)
        });
      }
    }

    return chunks;
  }

  /**
   * Split text into overlapping chunks.
   *
   * Strategy:
   *   - Split on sentence boundaries (period + space) first
   *   - Group sentences until chunkSize is reached
   *   - Overlap by including the last N characters of the previous chunk
   *
   * This preserves semantic coherence better than splitting mid-sentence.
   *
   * @param {string} text
   * @returns {string[]}
   */
  chunkText(text) {
    if (text.length <= this.chunkSize) {
      return [text];
    }

    // Split into sentences
    const sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text];
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > this.chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());

        // Start next chunk with overlap from end of current chunk
        const overlapText = currentChunk.slice(-this.chunkOverlap);
        currentChunk = overlapText + sentence;
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Generate an embedding vector for a text chunk.
   *
   * DEMO MODE: Produces a deterministic 384-dimensional pseudo-embedding
   * using character frequency + bigram features. This is NOT a real embedding
   * but provides enough signal for the demo's cosine similarity to work
   * meaningfully with the sample data.
   *
   * PRODUCTION: Replace this method with a call to SAP AI Core:
   *
   *   async generateEmbedding(text) {
   *     const aiCore = await cds.connect.to('SAP_AI_CORE');
   *     const res = await aiCore.send({
   *       method: 'POST',
   *       path: `/deployments/${EMBEDDING_DEPLOYMENT_ID}/predict`,
   *       data: { input: text, model: 'text-embedding-ada-002' }
   *     });
   *     return res.data[0].embedding; // real 1536-dim vector
   *   }
   *
   * @param {string} text
   * @returns {number[]} Normalized vector of length embeddingDims
   */
  generateEmbedding(text) {
    const dims = this.embeddingDims;
    const vec = new Array(dims).fill(0);
    const lower = text.toLowerCase();

    // Feature 1: Character frequencies
    for (let i = 0; i < lower.length; i++) {
      const code = lower.charCodeAt(i);
      vec[code % dims] += 1;
    }

    // Feature 2: Bigram hashing for word-level signal
    const words = lower.split(/\s+/);
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = words[i] + ' ' + words[i + 1];
      let hash = 0;
      for (let j = 0; j < bigram.length; j++) {
        hash = ((hash << 5) - hash + bigram.charCodeAt(j)) | 0;
      }
      vec[Math.abs(hash) % dims] += 0.5;
    }

    // Normalize to unit vector
    const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vec.map(v => v / magnitude);
  }

  /**
   * Load processed chunks into a VectorStore instance.
   *
   * @param {import('./vector-store').VectorStore} vectorStore
   * @param {string} [filePath] - Optional path to knowledge-base.json
   * @returns {number} Number of chunks loaded
   */
  loadIntoVectorStore(vectorStore, filePath) {
    const chunks = this.loadKnowledgeBase(filePath);

    for (const chunk of chunks) {
      vectorStore.add(chunk);
    }

    console.log(`[DocumentProcessor] Loaded ${chunks.length} chunks into vector store (total: ${vectorStore.documents.length})`);
    return chunks.length;
  }

  /**
   * Get processing statistics for the knowledge base.
   *
   * @param {string} [filePath]
   * @returns {object} Stats about documents, sections, and chunks
   */
  getStats(filePath) {
    const resolvedPath = filePath || path.resolve(__dirname, '../../data/knowledge-base.json');
    const raw = fs.readFileSync(resolvedPath, 'utf-8');
    const kb = JSON.parse(raw);

    let totalSections = 0;
    let totalChunks = 0;
    let totalCharacters = 0;

    for (const doc of kb.documents) {
      totalSections += doc.sections.length;
      for (const section of doc.sections) {
        const chunks = this.chunkText(section.content);
        totalChunks += chunks.length;
        totalCharacters += section.content.length;
      }
    }

    return {
      documents: kb.documents.length,
      sections: totalSections,
      chunks: totalChunks,
      totalCharacters,
      avgChunkSize: Math.round(totalCharacters / totalChunks),
      embeddingDims: this.embeddingDims,
      chunkSize: this.chunkSize,
      chunkOverlap: this.chunkOverlap
    };
  }
}

module.exports = { DocumentProcessor };
