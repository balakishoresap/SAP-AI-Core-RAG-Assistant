/**
 * In-Memory Vector Store — demo implementation using cosine similarity.
 *
 * ⚠️  FOR DEMONSTRATION PURPOSES ONLY.
 *
 * In production, replace this with SAP HANA Cloud Vector Engine which provides:
 *   - Native REAL_VECTOR column type for storing embeddings
 *   - Hardware-accelerated cosine similarity / L2 distance search
 *   - HANA's VECTOR_SEARCH() SQL function for k-NN queries
 *   - Scalable to millions of vectors with ANN (approximate nearest neighbor) indexing
 *   - Full ACID transactions and enterprise-grade security
 *
 * Example HANA Cloud SQL for vector search:
 *   SELECT TOP 5 ID, TITLE, CONTENT,
 *          COSINE_SIMILARITY(EMBEDDING, TO_REAL_VECTOR(:queryEmbedding)) AS SCORE
 *   FROM KNOWLEDGE_BASE
 *   ORDER BY SCORE DESC;
 */
class VectorStore {

  /**
   * @param {object} [options]
   * @param {boolean} [options.seedDemo=false] - Load built-in SAP demo data on init
   */
  constructor(options = {}) {
    /** @type {Array<{id: string, title: string, content: string, source: string, embedding: number[]}>} */
    this.documents = [];

    if (options.seedDemo) {
      this._seedDemoData();
    }
  }

  /**
   * Add a document with its embedding to the store.
   * @param {object} doc - { id, title, content, source, embedding }
   */
  add(doc) {
    if (!doc.embedding || !Array.isArray(doc.embedding)) {
      throw new Error('Document must include an embedding array');
    }
    this.documents.push({
      id: doc.id || `doc_${this.documents.length}`,
      title: doc.title || '',
      content: doc.content || '',
      source: doc.source || '',
      embedding: doc.embedding
    });
  }

  /**
   * Search for the top-k most similar documents to the query embedding.
   * Uses cosine similarity for ranking.
   *
   * @param {number[]} queryEmbedding - The query vector
   * @param {number} [topK=5] - Number of results to return
   * @returns {Array<{id: string, title: string, content: string, source: string, score: number}>}
   */
  search(queryEmbedding, topK = 5) {
    if (this.documents.length === 0) return [];

    const scored = this.documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      source: doc.source,
      score: this._cosineSimilarity(queryEmbedding, doc.embedding)
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  /**
   * Compute cosine similarity between two vectors.
   * cosine_sim(A, B) = (A · B) / (||A|| * ||B||)
   *
   * @param {number[]} vecA
   * @param {number[]} vecB
   * @returns {number} Similarity score between -1 and 1
   */
  _cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      console.warn('[VectorStore] Dimension mismatch — padding shorter vector');
      const maxLen = Math.max(vecA.length, vecB.length);
      while (vecA.length < maxLen) vecA.push(0);
      while (vecB.length < maxLen) vecB.push(0);
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Generate a simple pseudo-embedding for demo seeding.
   */
  _demoEmbedding(text) {
    const dims = 384;
    const vec = new Array(dims).fill(0);
    const lower = text.toLowerCase();
    for (let i = 0; i < lower.length; i++) {
      vec[lower.charCodeAt(i) % dims] += 1;
    }
    const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map(v => v / mag);
  }

  /**
   * Seed the store with sample SAP knowledge base entries.
   */
  _seedDemoData() {
    const sampleDocs = [
      {
        title: 'SAP S/4HANA Overview',
        content: 'SAP S/4HANA is the next-generation ERP suite built on SAP HANA. It provides real-time analytics, a simplified data model, and a modern Fiori user experience. Key modules include Finance (FI), Controlling (CO), Materials Management (MM), and Sales & Distribution (SD).',
        source: 'SAP Help Portal — S/4HANA'
      },
      {
        title: 'SAP BTP Services',
        content: 'SAP Business Technology Platform (BTP) offers services across four pillars: Database & Data Management, Analytics, Application Development & Integration, and Intelligent Technologies. Key services include SAP HANA Cloud, SAP Integration Suite, SAP Build, and SAP AI Core.',
        source: 'SAP BTP Documentation'
      },
      {
        title: 'SAP AI Core',
        content: 'SAP AI Core is the infrastructure for running AI models on SAP BTP. It supports model training, deployment, and inference. You can deploy foundation models (GPT-4, etc.) via the Generative AI Hub and use them through REST APIs. AI Launchpad provides a UI for managing models and deployments.',
        source: 'SAP AI Core — Developer Guide'
      },
      {
        title: 'SAP CAP Framework',
        content: 'The SAP Cloud Application Programming Model (CAP) is a framework for building enterprise-grade services and applications. It uses CDS (Core Data Services) for domain modeling and service definitions. CAP supports Node.js and Java runtimes, with built-in support for SAP HANA, authentication via XSUAA, and multitenancy.',
        source: 'CAP Documentation — capire'
      },
      {
        title: 'Clean Core Strategy',
        content: 'SAP Clean Core is a strategy that keeps the SAP core system free of custom modifications. Extensions should be built on SAP BTP using side-by-side extensibility rather than in-app modifications. This ensures smooth upgrades, maintains supportability, and leverages cloud-native capabilities.',
        source: 'SAP Clean Core Guidelines'
      },
      {
        title: 'SAP Fiori Design Guidelines',
        content: 'SAP Fiori is the design system for SAP software. It provides consistent, role-based user experiences across devices. Key principles include role-based access, adaptive design, simple UX, coherent interactions, and instant value. Fiori Elements enables rapid UI development from OData annotations.',
        source: 'SAP Fiori Design Guidelines v3'
      },
      {
        title: 'SAP HANA Cloud Vector Engine',
        content: 'SAP HANA Cloud Vector Engine enables native vector storage and similarity search. It supports REAL_VECTOR data types, cosine similarity, L2 distance, and inner product metrics. Use VECTOR_SEARCH() for k-NN queries. Ideal for RAG applications, recommendation engines, and semantic search.',
        source: 'SAP HANA Cloud — Vector Engine Documentation'
      }
    ];

    for (const doc of sampleDocs) {
      this.add({
        ...doc,
        embedding: this._demoEmbedding(doc.content)
      });
    }
  }
}

module.exports = { VectorStore };
