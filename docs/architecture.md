# Architecture — SAP AI Core RAG Assistant

## High-Level Architecture

```mermaid
flowchart LR
    subgraph User Layer
        A[👤 User]
    end

    subgraph Presentation
        B[Fiori / HTML UI]
    end

    subgraph Application Layer - SAP BTP
        C[CAP Service\nPOST /api/ask]
        D[RAG Engine]
        E[Audit Logger]
    end

    subgraph AI Services - SAP AI Core
        F[Embedding Model\ntext-embedding-ada-002]
        G[LLM\nGPT-4 / Custom]
        H[AI Launchpad\nModel Management]
    end

    subgraph Data Layer
        I[(SAP HANA Cloud\nVector Engine)]
        J[(CDS Persistence\nQuestions / Answers\nAudit Log)]
    end

    A -->|Ask Question| B
    B -->|HTTP POST| C
    C -->|Process| D
    D -->|1. Generate Embedding| F
    D -->|3. Query Vectors| I
    I -->|Relevant Chunks| D
    D -->|4. Augmented Prompt| G
    G -->|Answer| D
    D -->|5. Response| C
    C -->|Log| E
    E -->|Persist| J
    C -->|Answer + Sources| B
    B -->|Display| A
    H -.->|Manage Models| F
    H -.->|Manage Models| G
```

## RAG Pipeline Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Fiori UI
    participant CAP as CAP Service
    participant RAG as RAG Engine
    participant EMB as Embedding Model
    participant VS as Vector Store
    participant LLM as LLM (GPT-4)
    participant DB as HANA Cloud

    U->>UI: Enter question
    UI->>CAP: POST /api/ask
    CAP->>RAG: process(question)

    Note over RAG: PII Detection & Sanitization

    RAG->>EMB: Generate embedding
    EMB-->>RAG: Query vector [384d]

    RAG->>VS: search(vector, topK=5)
    VS-->>RAG: Relevant document chunks

    Note over RAG: Build context-augmented prompt

    RAG->>LLM: Chat completion with context
    LLM-->>RAG: Generated answer

    Note over RAG: Response guardrail validation

    RAG-->>CAP: {answer, confidence, sources}

    CAP->>DB: Log question + answer
    CAP->>DB: Write audit log

    CAP-->>UI: JSON response
    UI-->>U: Display answer with sources
```

## Component Details

| Component | Technology | Purpose |
|-----------|-----------|---------|
| UI | HTML/JS + SAP Fiori | Chat interface for end users |
| CAP Service | @sap/cds (Node.js) | API layer, routing, auth, persistence |
| RAG Engine | Custom Node.js | Orchestrates embedding → search → LLM flow |
| Vector Store | HANA Cloud Vector Engine* | Stores and searches document embeddings |
| Embedding Model | SAP AI Core (ada-002) | Converts text to vector representations |
| LLM | SAP AI Core (GPT-4) | Generates natural language answers |
| AI Launchpad | SAP AI Launchpad | Model deployment and monitoring UI |
| Database | SAP HANA Cloud | Persists questions, answers, audit logs |

*Demo uses in-memory store; production uses HANA Cloud Vector Engine.
