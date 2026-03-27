const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
        ShadingType, PageNumber, PageBreak, LevelFormat, ExternalHyperlink } = require('docx');

// ── Colors ──
const SAP_BLUE = "0070F2";
const SAP_DARK = "354A5F";
const SAP_LIGHT_BG = "EBF5FF";
const SAP_LIGHT_GRAY = "F5F6F7";
const BORDER_COLOR = "D0D0D0";
const WHITE = "FFFFFF";

// ── Helpers ──
const border = { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, spacing: { before: 300, after: 150 }, children: [new TextRun({ text, bold: true })] });
}

function para(text, opts = {}) {
  return new Paragraph({ spacing: { after: 120 }, ...opts, children: [new TextRun({ text, ...opts })] });
}

function boldPara(label, value) {
  return new Paragraph({ spacing: { after: 80 }, children: [
    new TextRun({ text: label, bold: true }),
    new TextRun({ text: value })
  ]});
}

function codePara(text) {
  return new Paragraph({ spacing: { after: 60 },
    children: [new TextRun({ text, font: "Consolas", size: 18, color: "333333" })]
  });
}

function codeBlock(lines) {
  return lines.map(l => new Paragraph({
    spacing: { after: 20 },
    shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
    indent: { left: 360 },
    children: [new TextRun({ text: l, font: "Consolas", size: 17, color: "1D2D3E" })]
  }));
}

function makeRow(cells, headerRow = false) {
  return new TableRow({
    children: cells.map((c, i) => new TableCell({
      borders,
      margins: cellMargins,
      width: { size: c.width || 4680, type: WidthType.DXA },
      shading: { fill: headerRow ? SAP_DARK : (c.shade || WHITE), type: ShadingType.CLEAR },
      children: [new Paragraph({ children: [new TextRun({ text: c.text, bold: headerRow, color: headerRow ? WHITE : "1D2D3E", size: headerRow ? 20 : 19, font: "Arial" })] })]
    }))
  });
}

function makeTable(headers, rows, colWidths) {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      makeRow(headers.map((h, i) => ({ text: h, width: colWidths[i] })), true),
      ...rows.map(row => makeRow(row.map((r, i) => ({ text: r, width: colWidths[i] }))))
    ]
  });
}

function spacer() { return new Paragraph({ spacing: { after: 200 }, children: [] }); }

// ══════════════════════════════════════════════════════════════
//  BUILD DOCUMENT
// ══════════════════════════════════════════════════════════════

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: SAP_DARK },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, font: "Arial", color: SAP_BLUE },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: "1D2D3E" },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
      ]},
      { reference: "numbers", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }
      ]},
      { reference: "numbers2", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }
      ]},
    ]
  },
  sections: [
    // ═══════════════ COVER PAGE ═══════════════
    {
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
      },
      children: [
        spacer(), spacer(), spacer(), spacer(),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [
          new TextRun({ text: "SAP AI Core RAG Assistant", size: 52, bold: true, color: SAP_DARK, font: "Arial" })
        ]}),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [
          new TextRun({ text: "Enterprise Knowledge Base on SAP BTP", size: 32, color: SAP_BLUE, font: "Arial" })
        ]}),
        spacer(),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [
          new TextRun({ text: "Technical Architecture & Code Documentation", size: 24, color: "666666" })
        ]}),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [
          new TextRun({ text: "For Interview Preparation & Technical Review", size: 24, color: "666666" })
        ]}),
        spacer(), spacer(), spacer(),
        new Paragraph({ alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 2, color: SAP_BLUE } }, spacing: { before: 400 }, children: [] }),
        spacer(),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: "Technology Stack: ", bold: true, size: 20 }),
          new TextRun({ text: "SAP CAP (Node.js) | SAP AI Core | SAP HANA Cloud | SAP Fiori | RAG Pattern", size: 20, color: SAP_BLUE })
        ]}),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [
          new TextRun({ text: "GitHub: github.com/balakishoresap/SAP-AI-Core-RAG-Assistant", size: 18, color: "666666" })
        ]}),
        new PageBreak(),
      ]
    },

    // ═══════════════ TABLE OF CONTENTS ═══════════════
    {
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
      },
      headers: {
        default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [
          new TextRun({ text: "SAP AI Core RAG Assistant | Technical Documentation", size: 16, color: "999999", italics: true })
        ]})] })
      },
      footers: {
        default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: "Page ", size: 16, color: "999999" }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "999999" })
        ]})] })
      },
      children: [
        heading("Table of Contents"),
        para("1. Executive Summary"),
        para("2. High-Level Architecture"),
        para("3. Technology Stack Deep Dive"),
        para("4. Project Structure"),
        para("5. Database Layer (CDS Schema)"),
        para("6. Service Layer (CAP Services)"),
        para("7. RAG Engine - The Heart of the Application"),
        para("8. Vector Store - Similarity Search"),
        para("9. Document Processor - Chunking & Embedding"),
        para("10. Guardrails - Responsible AI"),
        para("11. Frontend - Chat UI"),
        para("12. Security & Authentication"),
        para("13. Deployment Architecture (MTA)"),
        para("14. How It All Works Together - End-to-End Flow"),
        para("15. Interview Q&A - Key Talking Points"),
        new PageBreak(),

        // ═══════════════ 1. EXECUTIVE SUMMARY ═══════════════
        heading("1. Executive Summary"),
        para("This application is a Retrieval-Augmented Generation (RAG) assistant built on SAP Business Technology Platform (BTP). It demonstrates how enterprise organizations can build AI-powered knowledge assistants that provide accurate, grounded answers from their own documents rather than relying on the general knowledge of large language models."),
        spacer(),
        boldPara("Problem it solves: ", "Employees need quick answers to HR policy questions (leave policies, travel rules, expense thresholds). Traditionally, they would email HR or search through long PDF documents. This app provides instant, AI-powered answers."),
        spacer(),
        boldPara("Why RAG instead of just an LLM? ", "A plain LLM (like GPT-4) might hallucinate incorrect policy details. RAG first retrieves relevant document chunks from a knowledge base, then asks the LLM to answer based ONLY on those retrieved chunks. This ensures answers are grounded in actual company policies."),
        spacer(),
        boldPara("Key differentiators: ", "Enterprise-grade guardrails (PII detection, topic boundaries, audit logging), Clean Core alignment (no modifications to SAP core systems), and production-ready architecture with SAP HANA Cloud Vector Engine path."),
        new PageBreak(),

        // ═══════════════ 2. HIGH-LEVEL ARCHITECTURE ═══════════════
        heading("2. High-Level Architecture"),
        para("The application follows a layered architecture aligned with SAP BTP best practices:"),
        spacer(),

        heading("Architecture Layers", HeadingLevel.HEADING_2),
        makeTable(
          ["Layer", "Technology", "Purpose"],
          [
            ["Presentation", "HTML/CSS/JS (Fiori Horizon theme)", "Chat UI for end users"],
            ["API Layer", "SAP CAP (Node.js) - @sap/cds", "REST endpoints, auth, routing"],
            ["Business Logic", "RAG Engine (custom Node.js)", "Orchestrates the RAG pipeline"],
            ["AI Services", "SAP AI Core (Generative AI Hub)", "LLM inference + embedding generation"],
            ["Vector Search", "In-memory (demo) / SAP HANA Cloud", "Cosine similarity document search"],
            ["Database", "SQLite (dev) / SAP HANA Cloud (prod)", "Persists questions, answers, audit logs"],
            ["Security", "SAP XSUAA + OAuth 2.0", "JWT authentication and role-based access"],
          ],
          [2200, 3000, 4160]
        ),
        spacer(),

        heading("Data Flow (Request Lifecycle)", HeadingLevel.HEADING_2),
        para("When a user asks a question, here is exactly what happens:"),
        spacer(),

        makeTable(
          ["Step", "Component", "What Happens"],
          [
            ["1", "Browser (UI)", "User types question and clicks Ask"],
            ["2", "HTTP POST /api/ask", "Request sent with JSON body: {question, sessionId}"],
            ["3", "CAP Service Handler", "ask-service.js receives the request, extracts parameters"],
            ["4", "Guardrails Pre-Process", "Input validation, topic boundary check, PII masking"],
            ["5", "Embedding Generation", "Question text converted to 384-dimensional vector"],
            ["6", "Vector Search", "Cosine similarity search against 26 knowledge base chunks"],
            ["7", "Prompt Construction", "Top-5 relevant chunks injected into LLM prompt template"],
            ["8", "LLM Call", "Augmented prompt sent to SAP AI Core (GPT-4)"],
            ["9", "Guardrails Post-Process", "Output validation + confidence threshold check (>= 0.6)"],
            ["10", "Persistence", "Question, answer, and audit log saved to database"],
            ["11", "Response", "JSON with answer, confidence score, and source documents returned"],
          ],
          [800, 2800, 5760]
        ),
        new PageBreak(),

        // ═══════════════ 3. TECH STACK ═══════════════
        heading("3. Technology Stack Deep Dive"),

        heading("What is SAP CAP?", HeadingLevel.HEADING_2),
        para("SAP Cloud Application Programming Model (CAP) is SAP's recommended framework for building enterprise applications on BTP. Think of it as Express.js + ORM + enterprise features combined."),
        spacer(),
        makeTable(
          ["CAP Concept", "What it does", "Analogy"],
          [
            ["CDS (Core Data Services)", "Declarative language for data models and service definitions", "Like SQL DDL + API schema combined"],
            ["@sap/cds runtime", "Processes CDS files, creates REST/OData endpoints automatically", "Like Express.js auto-generating routes"],
            ["cds watch", "Dev server with hot reload, auto-creates SQLite DB", "Like nodemon + auto-migration"],
            ["cds build", "Compiles CDS to production artifacts (HANA tables, etc.)", "Like webpack for backend"],
          ],
          [2400, 3600, 3360]
        ),
        spacer(),

        heading("What is RAG?", HeadingLevel.HEADING_2),
        para("Retrieval-Augmented Generation is a pattern that combines information retrieval with LLM text generation:"),
        spacer(),
        makeTable(
          ["Step", "Process", "Why it matters"],
          [
            ["Retrieve", "Search a knowledge base for document chunks relevant to the question", "Provides factual grounding"],
            ["Augment", "Inject retrieved chunks into the LLM prompt as context", "Constrains the LLM to use real data"],
            ["Generate", "LLM generates an answer based ONLY on the provided context", "Reduces hallucination dramatically"],
          ],
          [1500, 4000, 3860]
        ),
        spacer(),
        para("Without RAG, asking an LLM about your company's leave policy would get a generic answer. With RAG, it retrieves your actual policy document and answers from it."),
        spacer(),

        heading("What is Cosine Similarity?", HeadingLevel.HEADING_2),
        para("Cosine similarity measures how similar two vectors are by computing the cosine of the angle between them. It returns a value between -1 (opposite) and 1 (identical)."),
        spacer(),
        para("Formula: cos(A,B) = (A . B) / (||A|| * ||B||)", { font: "Consolas", size: 20 }),
        spacer(),
        para("In our app: The user's question is converted to a 384-dimensional vector. Each knowledge base chunk is also a vector. We compute cosine similarity between the question vector and every chunk vector, then return the top-5 most similar chunks."),
        spacer(),

        heading("What is an Embedding?", HeadingLevel.HEADING_2),
        para("An embedding is a numerical representation of text as a dense vector (array of numbers). Semantically similar texts produce similar vectors. In production, SAP AI Core uses models like text-embedding-ada-002 (1536 dimensions). Our demo uses a 384-dimensional pseudo-embedding based on character frequencies."),
        new PageBreak(),

        // ═══════════════ 4. PROJECT STRUCTURE ═══════════════
        heading("4. Project Structure"),
        para("Every file in this project has a specific purpose:"),
        spacer(),
        makeTable(
          ["File/Folder", "Purpose", "Key Concept"],
          [
            ["package.json", "Node.js dependencies and CDS configuration", "Entry point for npm install"],
            ["db/schema.cds", "Database schema in CDS language", "Defines 4 entities (tables)"],
            ["srv/ask-service.cds", "API definition in CDS", "Declares POST /api/ask action"],
            ["srv/ask-service.js", "API handler implementation", "Receives request, calls RAG, saves results"],
            ["srv/lib/rag-engine.js", "RAG pipeline orchestrator", "The brain - coordinates all steps"],
            ["srv/lib/vector-store.js", "In-memory vector database", "Stores and searches document embeddings"],
            ["srv/lib/document-processor.js", "Document chunking and embedding", "Splits documents into searchable pieces"],
            ["srv/lib/guardrails.js", "Responsible AI checks", "PII, topic boundaries, confidence"],
            ["data/knowledge-base.json", "HR policy documents (4 policies, 20 sections)", "The knowledge that RAG searches"],
            ["app/webapp/index.html", "Chat UI with Fiori Horizon theme", "What the user sees and interacts with"],
            ["mta.yaml", "BTP deployment descriptor", "Defines modules and services for Cloud Foundry"],
            ["xs-security.json", "XSUAA security roles", "Admin and Viewer role definitions"],
            [".cdsrc.json", "Development profile config", "Mocked auth + SQLite for local dev"],
            ["test/test-queries.js", "Test suite (51 assertions)", "Validates RAG + guardrails end-to-end"],
          ],
          [2800, 3200, 3360]
        ),
        new PageBreak(),

        // ═══════════════ 5. DATABASE LAYER ═══════════════
        heading("5. Database Layer - CDS Schema"),
        para("File: db/schema.cds"),
        spacer(),
        para("CDS (Core Data Services) is SAP's declarative language for defining data models. Instead of writing SQL CREATE TABLE statements, you define entities in CDS and the framework generates the SQL for your target database (SQLite locally, HANA Cloud in production)."),
        spacer(),

        heading("Entity: KnowledgeBase", HeadingLevel.HEADING_3),
        para("Stores document chunks with their vector embeddings for RAG retrieval."),
        makeTable(
          ["Field", "Type", "Purpose"],
          [
            ["ID", "UUID (auto-generated)", "Primary key via cuid aspect"],
            ["title", "String(256)", "Document section title for display"],
            ["content", "LargeString", "The actual text chunk content"],
            ["source", "String(512)", "Source document reference"],
            ["category", "String(128)", "Category (e.g., HR - Leave Management)"],
            ["embedding", "LargeString", "Vector embedding stored as JSON array"],
            ["chunkIndex", "Integer", "Position of chunk within original document"],
            ["metadata", "LargeString", "Additional metadata as JSON"],
          ],
          [2000, 2800, 4560]
        ),
        spacer(),

        heading("Entity: Questions", HeadingLevel.HEADING_3),
        para("Logs every user question for analytics and audit trail."),
        makeTable(
          ["Field", "Type", "Purpose"],
          [
            ["ID", "UUID", "Primary key"],
            ["text", "LargeString", "The question the user asked"],
            ["userId", "String(256)", "Who asked (from JWT token)"],
            ["sessionId", "String(128)", "Groups questions in a conversation"],
            ["status", "String(16)", "pending / answered / failed"],
            ["answer", "Association to Answers", "Links to the generated answer"],
          ],
          [2000, 2800, 4560]
        ),
        spacer(),

        heading("Entity: Answers", HeadingLevel.HEADING_3),
        para("Stores generated answers with metadata about the generation process."),
        makeTable(
          ["Field", "Type", "Purpose"],
          [
            ["text", "LargeString", "The generated answer text"],
            ["question", "Association to Questions", "Links back to the question"],
            ["confidence", "Decimal(5,4)", "Cosine similarity score (0-1)"],
            ["sourceDocs", "LargeString", "JSON array of source document titles"],
            ["modelId", "String(256)", "Which LLM model was used"],
            ["tokenCount", "Integer", "Tokens consumed (for cost tracking)"],
            ["responseTimeMs", "Integer", "How long the response took"],
          ],
          [2000, 2800, 4560]
        ),
        spacer(),

        heading("Entity: AuditLog", HeadingLevel.HEADING_3),
        para("Immutable compliance record of every AI interaction."),
        makeTable(
          ["Field", "Type", "Purpose"],
          [
            ["action", "String(64)", "ASK, ASK_OUT_OF_SCOPE, ASK_FAILED, etc."],
            ["userId", "String(256)", "Who triggered the action"],
            ["questionId", "UUID", "Links to the question"],
            ["details", "LargeString", "JSON with full interaction metadata"],
            ["piiDetected", "Boolean", "Whether PII was found in the question"],
            ["guardrailHit", "Boolean", "Whether any guardrail was triggered"],
          ],
          [2000, 2800, 4560]
        ),
        spacer(),
        boldPara("Key CDS concepts used: ", "'cuid' auto-generates UUID primary keys. 'managed' adds createdAt, createdBy, modifiedAt, modifiedBy fields automatically. Associations create foreign key relationships between entities."),
        new PageBreak(),

        // ═══════════════ 6. SERVICE LAYER ═══════════════
        heading("6. Service Layer - CAP Services"),
        para("The service layer consists of two files that work together:"),
        spacer(),

        heading("ask-service.cds (Service Definition)", HeadingLevel.HEADING_2),
        para("This CDS file declares WHAT the API exposes:"),
        spacer(),
        ...codeBlock([
          'service AskService @(path: \'/api\') {',
          '  type AskRequest { question: String(4000); sessionId: String(128); }',
          '  type AskResponse { answer: String; confidence: Decimal(5,4);',
          '                     sources: array of String; questionId: UUID; }',
          '  action ask(req: AskRequest) returns AskResponse;',
          '}',
        ]),
        spacer(),
        para("The @(path: '/api') annotation maps this service to the /api URL prefix. The 'action' keyword creates a POST endpoint (actions have side effects, functions are GET-only in OData)."),
        spacer(),

        heading("ask-service.js (Service Handler)", HeadingLevel.HEADING_2),
        para("This JavaScript file implements HOW the API works:"),
        spacer(),
        makeTable(
          ["Code Section", "What It Does", "Why It Matters"],
          [
            ["this.ragEngine = new RAGEngine()", "Creates the RAG pipeline on service startup", "Knowledge base loaded once, reused for all requests"],
            ["this.on('ask', async (req) => {...})", "Registers handler for the 'ask' CDS action", "CAP convention: on() matches CDS action names"],
            ["const data = req.data?.req || req.data", "Extracts question from request body", "Handles both nested and flat parameter formats"],
            ["this.ragEngine.process(question)", "Runs the full RAG pipeline", "Returns answer, confidence, sources, guardrail flags"],
            ["this._persistAsync(...)", "Saves to DB without blocking the response", "User gets answer fast; DB write happens in background"],
          ],
          [2800, 3300, 3260]
        ),
        new PageBreak(),

        // ═══════════════ 7. RAG ENGINE ═══════════════
        heading("7. RAG Engine - The Heart of the Application"),
        para("File: srv/lib/rag-engine.js"),
        spacer(),
        para("This is the most important file in the entire application. It orchestrates the complete RAG pipeline from question to answer."),
        spacer(),

        heading("Constructor - Initialization", HeadingLevel.HEADING_2),
        ...codeBlock([
          'constructor(options = {}) {',
          '  this.vectorStore = options.vectorStore || new VectorStore();',
          '  this.topK = options.topK || 5;',
          '  this.maxContextTokens = options.maxContextTokens || 3000;',
          '  this._loadKnowledgeBase(); // Load HR docs on startup',
          '}',
        ]),
        para("On startup, it creates a VectorStore and loads all HR policy documents from knowledge-base.json into it via the DocumentProcessor. The topK=5 means we retrieve the 5 most relevant chunks for each question."),
        spacer(),

        heading("process() - Main Pipeline Method", HeadingLevel.HEADING_2),
        para("This async method runs the complete RAG pipeline in 6 steps:"),
        spacer(),

        makeTable(
          ["Step", "Method Called", "Input", "Output"],
          [
            ["1. Pre-process", "guardrails.preProcess(question)", "Raw user question", "Sanitized question or block response"],
            ["2. Embed", "_generateEmbedding(sanitizedQ)", "Clean text", "384-dim float vector"],
            ["3. Search", "vectorStore.search(embedding, 5)", "Query vector", "Top-5 matching doc chunks with scores"],
            ["4. Prompt", "_buildPrompt(question, docs)", "Question + chunks", "Structured LLM prompt with context"],
            ["5. LLM", "_callLLM(prompt)", "Augmented prompt", "Generated answer text"],
            ["6. Post-process", "guardrails.postProcess(answer, conf)", "Answer + confidence", "Validated answer or fallback"],
          ],
          [1500, 2800, 2200, 2860]
        ),
        spacer(),

        heading("_buildPrompt() - How Context Is Injected", HeadingLevel.HEADING_2),
        para("This method creates the prompt that gets sent to the LLM. It follows a strict template:"),
        spacer(),
        ...codeBlock([
          'You are an SAP enterprise HR knowledge assistant.',
          'Answer using ONLY the provided context.',
          '',
          '## Context from Knowledge Base',
          '[Source 1: Employee Leave Policy - Annual Leave]',
          'All full-time employees are entitled to 20 working days...',
          '',
          '[Source 2: Employee Leave Policy - Sick Leave]',
          'Employees are entitled to 12 days of paid sick leave...',
          '',
          '## User Question',
          'What is the leave policy for new employees?',
          '',
          '## Instructions',
          '- Answer concisely based on the context above.',
          '- Cite source documents by number.',
          '- If context is insufficient, say so clearly.',
        ]),
        spacer(),
        para("This prompt engineering technique is critical: by explicitly telling the LLM to use ONLY the provided context, we minimize hallucination. The sources are numbered so the LLM can cite them in its answer."),
        spacer(),

        heading("_demoEmbedding() - How Demo Embeddings Work", HeadingLevel.HEADING_2),
        para("Since we cannot call SAP AI Core without a real BTP account, the demo generates pseudo-embeddings using two techniques:"),
        spacer(),
        makeTable(
          ["Technique", "How It Works", "Purpose"],
          [
            ["Character frequency", "Count each character's occurrences, map to vector dimensions", "Captures word-level similarity (same words = similar vectors)"],
            ["Bigram hashing", "Hash consecutive word pairs into vector positions", "Captures phrase-level similarity (word order matters)"],
            ["Normalization", "Divide each dimension by the vector's magnitude", "Makes vectors unit-length so cosine similarity works correctly"],
          ],
          [2200, 3800, 3360]
        ),
        spacer(),
        boldPara("Production difference: ", "In production, you would call SAP AI Core's embedding API (text-embedding-ada-002) which produces 1536-dimensional vectors trained on massive text corpora. These real embeddings capture deep semantic meaning, not just surface-level character patterns."),
        new PageBreak(),

        // ═══════════════ 8. VECTOR STORE ═══════════════
        heading("8. Vector Store - Similarity Search"),
        para("File: srv/lib/vector-store.js"),
        spacer(),
        para("The vector store is an in-memory database that stores document chunks alongside their embedding vectors and performs cosine similarity search."),
        spacer(),

        heading("Key Methods", HeadingLevel.HEADING_2),
        makeTable(
          ["Method", "What It Does", "Complexity"],
          [
            ["add(doc)", "Stores a document with its embedding vector", "O(1) - just appends to array"],
            ["search(queryVec, topK)", "Finds the K most similar documents to query", "O(n) - scans all documents, sorts by score"],
            ["_cosineSimilarity(A, B)", "Computes similarity between two vectors", "O(d) where d = vector dimensions (384)"],
          ],
          [2600, 3800, 2960]
        ),
        spacer(),
        boldPara("Why in-memory is OK for demo: ", "With 26 chunks, full scan takes microseconds. Production with millions of documents needs SAP HANA Cloud Vector Engine which uses ANN (Approximate Nearest Neighbor) indexing for sub-millisecond search."),
        spacer(),

        heading("Production: SAP HANA Cloud Vector Engine", HeadingLevel.HEADING_2),
        para("In production, you would replace the in-memory store with HANA Cloud SQL:"),
        spacer(),
        ...codeBlock([
          'SELECT TOP 5 ID, TITLE, CONTENT,',
          '  COSINE_SIMILARITY(EMBEDDING, TO_REAL_VECTOR(:queryEmbedding)) AS SCORE',
          'FROM KNOWLEDGE_BASE',
          'ORDER BY SCORE DESC;',
        ]),
        new PageBreak(),

        // ═══════════════ 9. DOCUMENT PROCESSOR ═══════════════
        heading("9. Document Processor - Chunking & Embedding"),
        para("File: srv/lib/document-processor.js"),
        spacer(),
        para("This module reads the knowledge base JSON file, splits documents into overlapping chunks, generates embeddings for each chunk, and loads them into the vector store."),
        spacer(),

        heading("Why Chunking?", HeadingLevel.HEADING_2),
        para("LLMs have limited context windows. You cannot send an entire 50-page policy document. Instead, you split it into small chunks (500 characters each) and only send the relevant ones."),
        spacer(),

        heading("Why Overlapping?", HeadingLevel.HEADING_2),
        para("If a key sentence spans a chunk boundary, it would be split in half and neither chunk would contain the complete information. Overlapping (100 characters) ensures important sentences appear fully in at least one chunk."),
        spacer(),
        makeTable(
          ["Parameter", "Value", "Why"],
          [
            ["chunkSize", "500 characters", "Small enough to be precise, large enough for context"],
            ["chunkOverlap", "100 characters", "Prevents losing information at chunk boundaries"],
            ["embeddingDims", "384 dimensions", "Matches demo embedding vector size"],
          ],
          [2200, 2400, 4760]
        ),
        spacer(),

        heading("Processing Pipeline", HeadingLevel.HEADING_2),
        makeTable(
          ["Step", "Input", "Output", "Count"],
          [
            ["1. Load JSON", "knowledge-base.json", "4 HR policy documents", "4"],
            ["2. Flatten sections", "4 documents", "20 sections (5 per doc)", "20"],
            ["3. Chunk text", "20 sections", "26 overlapping chunks", "26"],
            ["4. Generate embeddings", "26 text chunks", "26 vectors (384-dim each)", "26"],
            ["5. Load into VectorStore", "26 {chunk + embedding} pairs", "Searchable vector store", "26"],
          ],
          [2000, 2400, 2800, 1200]
        ),
        new PageBreak(),

        // ═══════════════ 10. GUARDRAILS ═══════════════
        heading("10. Guardrails - Responsible AI"),
        para("File: srv/lib/guardrails.js"),
        spacer(),
        para("This is the Responsible AI module. It implements multiple safety layers that protect against misuse, data leaks, and unreliable answers. Every question passes through these checks BEFORE and AFTER the LLM processes it."),
        spacer(),

        heading("Guardrail 1: PII Detection & Masking", HeadingLevel.HEADING_2),
        para("Scans input for personally identifiable information and replaces it with redaction tokens before the text reaches the LLM."),
        spacer(),
        makeTable(
          ["PII Type", "Pattern Example", "Replaced With"],
          [
            ["Email", "john@company.com", "[EMAIL_REDACTED]"],
            ["Phone (local)", "555-123-4567", "[PHONE_REDACTED]"],
            ["Phone (international)", "+1 (555) 123-4567", "[PHONE_REDACTED]"],
            ["Social Security Number", "123-45-6789", "[SSN_REDACTED]"],
            ["Credit Card", "4111111111111111", "[CC_REDACTED]"],
            ["Employee ID", "EMP00123456", "[EMPID_REDACTED]"],
            ["Passport / ID", "AB123456789", "[ID_REDACTED]"],
          ],
          [2400, 3000, 3960]
        ),
        spacer(),

        heading("Guardrail 2: Topic Boundary Enforcement", HeadingLevel.HEADING_2),
        para("Rejects questions outside the allowed domain. The assistant is scoped to HR and operations topics only, preventing misuse as a general chatbot."),
        spacer(),
        para("Allowed domains: Leave Management, Travel Policy, Expense Management, Onboarding, Company Policies, Human Resources, Benefits, Compensation, Performance Management, SAP Systems, IT & Access, Learning & Development"),
        spacer(),
        boldPara("Example: ", "\"What is the weather today?\" is rejected with a helpful message listing what topics the assistant can help with."),
        spacer(),

        heading("Guardrail 3: Confidence Threshold", HeadingLevel.HEADING_2),
        para("If the top cosine similarity score is below 0.6, the RAG retrieval is considered unreliable. Instead of showing a potentially wrong answer, the system returns:"),
        spacer(),
        para("\"I cannot answer this reliably based on the available knowledge base. Please contact HR directly.\"", { italics: true, color: "666666" }),
        spacer(),

        heading("Guardrail 4: Input/Output Validation", HeadingLevel.HEADING_2),
        para("Blocks adversarial attacks:"),
        makeTable(
          ["Attack Type", "Example", "Action"],
          [
            ["Prompt Injection", "Ignore all previous instructions...", "Blocked before processing"],
            ["Role Hijacking", "You are now a pirate...", "Blocked before processing"],
            ["SQL Injection", "DROP TABLE users", "Blocked before processing"],
            ["XSS", "<script>alert(1)</script>", "Blocked before processing"],
            ["Prompt Leaking (output)", "System prompt: ...", "Response filtered out"],
            ["Credential Leaking", "password: abc123", "Response filtered out"],
          ],
          [2400, 3400, 3560]
        ),
        spacer(),

        heading("Guardrail 5: Audit Logging", HeadingLevel.HEADING_2),
        para("Every interaction is recorded with structured metadata for compliance (GDPR, SOX):"),
        spacer(),
        ...codeBlock([
          '{ action: "ASK",',
          '  userId: "user123",',
          '  confidence: 0.94,',
          '  matchedDomain: "Leave Management",',
          '  sourcesCount: 5,',
          '  piiTypes: ["email"],',
          '  inputViolations: [],',
          '  responseTimeMs: 1200 }',
        ]),
        new PageBreak(),

        // ═══════════════ 11. FRONTEND ═══════════════
        heading("11. Frontend - Chat UI"),
        para("File: app/webapp/index.html"),
        spacer(),
        para("A single-file HTML/CSS/JS application with zero framework dependencies. Uses SAP Horizon design tokens as CSS custom properties."),
        spacer(),

        heading("UI Components", HeadingLevel.HEADING_2),
        makeTable(
          ["Component", "Implementation", "Purpose"],
          [
            ["Shell Bar", "CSS flexbox with SAP Horizon colors", "SAP-branded header with connection status"],
            ["Chat Area", "Scrollable flex column", "Displays message bubbles with animations"],
            ["User Bubble", "Blue background, right-aligned", "Shows user's question with timestamp"],
            ["AI Bubble", "White card with shadow", "Shows answer + confidence + sources"],
            ["Confidence Badge", "Color-coded pill (green/orange/red)", "Visual trust indicator for each answer"],
            ["Sources Panel", "Tag chips with document icons", "RAG transparency - shows which docs were used"],
            ["Governed Action", "Button that opens BPA modal", "Simulates SAP Build Process Automation workflow"],
            ["BPA Modal", "Overlay with form, spinner, success", "Shows approval chain and generates task ID"],
            ["Loading Indicator", "Three animated dots", "Typing indicator while waiting for response"],
            ["Suggestion Chips", "Clickable topic buttons", "Pre-built questions for quick testing"],
          ],
          [2200, 3200, 3960]
        ),
        spacer(),

        heading("Demo Mode (GitHub Pages)", HeadingLevel.HEADING_2),
        para("When the CAP backend is not running (like on GitHub Pages), the UI automatically falls back to a built-in demo knowledge base with 10 pre-written HR policy answers. This uses a try/catch around the fetch() call - if the API fails, it matches the question against keywords and returns a realistic mock response."),
        new PageBreak(),

        // ═══════════════ 12. SECURITY ═══════════════
        heading("12. Security & Authentication"),
        spacer(),
        makeTable(
          ["Component", "Technology", "Configuration"],
          [
            ["Authentication", "SAP XSUAA (OAuth 2.0 + JWT)", "xs-security.json defines roles"],
            ["Development auth", "Mocked users in .cdsrc.json", "admin/admin and user/user"],
            ["Admin role", "@requires: 'admin' on CDS entities", "KnowledgeBase CRUD, AuditLog read"],
            ["User role", "No special requirements", "Can use POST /api/ask"],
            ["PII Protection", "guardrails.js maskPII()", "Redacts sensitive data before LLM"],
          ],
          [2200, 3000, 4160]
        ),
        new PageBreak(),

        // ═══════════════ 13. DEPLOYMENT ═══════════════
        heading("13. Deployment Architecture (MTA)"),
        para("File: mta.yaml"),
        spacer(),
        para("MTA (Multi-Target Application) is SAP's deployment format for BTP. It defines all modules and services in a single descriptor."),
        spacer(),
        makeTable(
          ["Module", "Type", "Purpose"],
          [
            ["rag-assistant-srv", "nodejs", "CAP service (256MB, Cloud Foundry buildpack)"],
            ["rag-assistant-db-deployer", "hdb", "Deploys CDS schema to HANA Cloud"],
            ["rag-assistant-app", "approuter.nodejs", "Serves UI, routes API calls, handles auth"],
          ],
          [3000, 2400, 3960]
        ),
        spacer(),
        makeTable(
          ["Resource", "Service", "Purpose"],
          [
            ["rag-assistant-db", "SAP HANA HDI Container", "Database for entities"],
            ["rag-assistant-auth", "SAP XSUAA", "OAuth 2.0 authentication"],
            ["rag-assistant-destination", "Destination Service", "Connects to SAP AI Core"],
            ["rag-assistant-connectivity", "Connectivity Service", "Network routing"],
          ],
          [3000, 2800, 3560]
        ),
        new PageBreak(),

        // ═══════════════ 14. END-TO-END FLOW ═══════════════
        heading("14. How It All Works Together"),
        para("Let's trace the complete journey of the question: \"What is the annual leave policy for new employees?\""),
        spacer(),

        makeTable(
          ["#", "What Happens", "File", "Key Code"],
          [
            ["1", "User types question and clicks Ask", "webapp/index.html", "sendQuestion() called"],
            ["2", "Browser sends POST /api/ask", "webapp/index.html", "fetch('/api/ask', {method:'POST',...})"],
            ["3", "CAP routes to handler", "ask-service.cds", "action ask(req: AskRequest)"],
            ["4", "Handler extracts question", "ask-service.js", "const question = data.req?.question"],
            ["5", "RAG engine pre-processes", "guardrails.js", "preProcess(question) - checks PII, topic, injection"],
            ["6", "Question converted to vector", "rag-engine.js", "_demoEmbedding(text) - 384-dim vector"],
            ["7", "Vector search finds top-5 chunks", "vector-store.js", "search(embedding, 5) - cosine similarity"],
            ["8", "Context prompt built", "rag-engine.js", "_buildPrompt(question, relevantDocs)"],
            ["9", "LLM generates answer", "rag-engine.js", "_callLLM(prompt) - SAP AI Core"],
            ["10", "Post-process validates output", "guardrails.js", "postProcess(answer, confidence)"],
            ["11", "Result returned to browser", "ask-service.js", "return {answer, confidence, sources}"],
            ["12", "UI renders answer bubble", "webapp/index.html", "addAssistantMessage(data)"],
          ],
          [500, 2800, 2200, 3860]
        ),
        new PageBreak(),

        // ═══════════════ 15. INTERVIEW Q&A ═══════════════
        heading("15. Interview Q&A - Key Talking Points"),
        spacer(),

        heading("Q: Why did you choose CAP over plain Express.js?", HeadingLevel.HEADING_3),
        para("CAP provides enterprise features out of the box: OData endpoints from CDS models, built-in XSUAA authentication, multitenancy support, and automatic database migrations. Express.js would require building all of this manually. CAP is also SAP's recommended framework, which ensures Clean Core compliance."),
        spacer(),

        heading("Q: Why RAG instead of fine-tuning an LLM?", HeadingLevel.HEADING_3),
        para("Fine-tuning is expensive, requires retraining when documents change, and can still hallucinate. RAG is cheaper (no training costs), always uses the latest documents (just update the knowledge base), and provides source attribution (we can show which documents the answer came from). For enterprise HR policies that change frequently, RAG is the right pattern."),
        spacer(),

        heading("Q: How does the confidence score work?", HeadingLevel.HEADING_3),
        para("The confidence score is the cosine similarity between the user's question embedding and the best matching document chunk. A score of 0.94 means the question and document vectors point in almost the same direction in 384-dimensional space. We use a threshold of 0.6 - below that, we tell the user to contact HR directly instead of showing a potentially wrong answer."),
        spacer(),

        heading("Q: What happens if someone sends sensitive data?", HeadingLevel.HEADING_3),
        para("The guardrails.js module scans every question for PII patterns (emails, SSNs, phone numbers, credit cards, employee IDs) using regex. Matches are replaced with tokens like [EMAIL_REDACTED] before the text reaches the LLM. The audit log records that PII was detected but stores the masked version, not the original."),
        spacer(),

        heading("Q: How would you scale this for production?", HeadingLevel.HEADING_3),
        para("Three key changes: (1) Replace the in-memory vector store with SAP HANA Cloud Vector Engine for scalable k-NN search across millions of documents. (2) Replace demo embeddings with SAP AI Core's embedding model API for real semantic understanding. (3) Replace the demo LLM response with actual GPT-4 calls via SAP AI Core's Generative AI Hub."),
        spacer(),

        heading("Q: What is Clean Core and why does it matter?", HeadingLevel.HEADING_3),
        para("Clean Core means keeping the SAP core system (S/4HANA) free of custom modifications. This app is built entirely on BTP as a side-by-side extension - it connects to SAP systems only through standard APIs, never modifies core code. This ensures smooth SAP upgrades, maintains full support from SAP, and allows independent deployment and scaling."),
        spacer(),

        heading("Q: How does the Governed Action work?", HeadingLevel.HEADING_3),
        para("When the AI assistant identifies an actionable item (like submitting a leave request), the Governed Action button routes it to SAP Build Process Automation (BPA). This creates an approval workflow: Employee -> Manager -> HR -> Auto-Confirm. The AI proposes the action, but humans approve it. This human-in-the-loop pattern is essential for enterprise AI where automated actions could have legal or financial consequences."),
        spacer(),

        heading("Q: What testing did you do?", HeadingLevel.HEADING_3),
        para("The test suite (test/test-queries.js) runs 51 assertions: 10 RAG query tests checking answer non-emptiness, source relevance, and confidence scores; 3 guardrail tests verifying out-of-scope rejection, prompt injection blocking, and PII masking; and 2 confidence threshold tests. All tests pass. Run with: npm test"),
        spacer(), spacer(),
        new Paragraph({ alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 2, color: SAP_BLUE, space: 1 } }, children: [] }),
        spacer(),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: "End of Document", size: 20, color: "999999", italics: true })
        ]}),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: "GitHub: github.com/balakishoresap/SAP-AI-Core-RAG-Assistant", size: 18, color: SAP_BLUE })
        ]}),
      ]
    }
  ]
});

// ── Generate ──
const outputPath = process.argv[2] || "SAP_AI_Core_RAG_Assistant_Documentation.docx";
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log(`Document generated: ${outputPath}`);
  console.log(`Size: ${(buffer.length / 1024).toFixed(0)} KB`);
});
