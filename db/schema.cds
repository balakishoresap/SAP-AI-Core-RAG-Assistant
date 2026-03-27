namespace sap.ai.rag;

using {
  cuid,
  managed,
  sap.common.CodeList
} from '@sap/cds/common';

/**
 * Knowledge Base — stores document chunks with their vector embeddings.
 * In production, embeddings are stored in SAP HANA Cloud Vector Engine columns.
 */
entity KnowledgeBase : cuid, managed {
  title       : String(256)  @title: 'Document Title';
  content     : LargeString  @title: 'Content Chunk';
  source      : String(512)  @title: 'Source Reference';
  category    : String(128)  @title: 'Category';
  embedding   : LargeString  @title: 'Vector Embedding (JSON)';
  chunkIndex  : Integer      @title: 'Chunk Index';
  metadata    : LargeString  @title: 'Additional Metadata (JSON)';
}

/**
 * Questions — logs every user question for analytics and auditing.
 */
entity Questions : cuid, managed {
  text        : LargeString  @title: 'Question Text';
  userId      : String(256)  @title: 'User ID';
  sessionId   : String(128)  @title: 'Session ID';
  status      : String enum { pending; answered; failed }  @title: 'Status';
  answer      : Association to Answers;
}

/**
 * Answers — stores generated answers linked back to the question.
 */
entity Answers : cuid, managed {
  text          : LargeString  @title: 'Answer Text';
  question      : Association to Questions;
  confidence    : Decimal(5,4) @title: 'Confidence Score';
  sourceDocs    : LargeString  @title: 'Source Document IDs (JSON)';
  modelId       : String(256)  @title: 'LLM Model ID';
  tokenCount    : Integer      @title: 'Tokens Used';
  responseTimeMs: Integer      @title: 'Response Time (ms)';
}

/**
 * AuditLog — immutable record of all AI interactions for compliance.
 */
entity AuditLog : cuid, managed {
  action      : String(64)   @title: 'Action';
  userId      : String(256)  @title: 'User ID';
  questionId  : UUID         @title: 'Question ID';
  details     : LargeString  @title: 'Details (JSON)';
  piiDetected : Boolean default false  @title: 'PII Detected';
  guardrailHit: Boolean default false  @title: 'Guardrail Triggered';
  ipAddress   : String(64)   @title: 'IP Address';
}
