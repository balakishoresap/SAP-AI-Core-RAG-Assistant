using {sap.ai.rag as db} from '../db/schema';

service AskService @(path: '/api') {

  /**
   * POST /api/ask — primary RAG endpoint.
   * Accepts a user question and returns an AI-generated answer
   * grounded in the knowledge base.
   */
  type AskRequest {
    question  : String(4000);
    sessionId : String(128);
  }

  type AskResponse {
    answer      : String;
    confidence  : Decimal(5,4);
    sources     : array of String;
    questionId  : UUID;
  }

  action ask(req : AskRequest) returns AskResponse;

  // Expose knowledge base for CRUD (admin)
  @requires: 'admin'
  entity KnowledgeBase as projection on db.KnowledgeBase;

  // Read-only views for monitoring
  @readonly
  entity Questions as projection on db.Questions;

  @readonly
  entity Answers as projection on db.Answers;

  @readonly
  @requires: 'admin'
  entity AuditLog as projection on db.AuditLog;
}
