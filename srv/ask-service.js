const cds = require('@sap/cds');
const { RAGEngine } = require('./lib/rag-engine');
const guardrails = require('./lib/guardrails');

module.exports = class AskService extends cds.ApplicationService {

  async init() {
    this.ragEngine = new RAGEngine();

    this.on('ask', async (req) => {
      try {
        // Extract parameters — handle both nested and flat
        const data = req.data || {};
        const question = data.req?.question || data.question;
        const sessionId = data.req?.sessionId || data.sessionId || 'default';

        console.log('[AskService] Received question:', question);
        console.log('[AskService] Raw req.data:', JSON.stringify(data));

        if (!question) {
          return req.error(400, 'Question is required.');
        }

        // Run RAG pipeline
        const result = await this.ragEngine.process(question);

        console.log('[AskService] RAG result confidence:', result.confidence);

        // Try to persist (non-blocking)
        this._persistAsync(question, result, sessionId, req.user?.id || 'anonymous');

        return {
          answer: result.answer,
          confidence: result.confidence,
          sources: result.sources,
          questionId: '00000000-0000-0000-0000-000000000000'
        };

      } catch (err) {
        console.error('[AskService] Error:', err);
        return req.error(500, err.message);
      }
    });

    await super.init();
  }

  async _persistAsync(question, result, sessionId, userId) {
    try {
      const { Questions, Answers, AuditLog } = cds.entities('sap.ai.rag');
      const questionId = cds.utils?.uuid?.() || require('crypto').randomUUID();
      const answerId = cds.utils?.uuid?.() || require('crypto').randomUUID();

      await INSERT.into(Questions).entries({
        ID: questionId, text: question, userId, sessionId, status: 'answered'
      });

      await INSERT.into(Answers).entries({
        ID: answerId, text: result.answer, question_ID: questionId,
        confidence: result.confidence, sourceDocs: JSON.stringify(result.sources),
        modelId: result.modelId || 'demo', tokenCount: result.tokenCount || 0,
        responseTimeMs: 0
      });

      const auditEntry = guardrails.buildAuditEntry({
        action: 'ASK', userId, questionId, question,
        confidence: result.confidence, piiReport: result.piiReport,
        topicCheck: result.topicCheck, sources: result.sources,
        modelId: result.modelId
      });
      await INSERT.into(AuditLog).entries(auditEntry);
    } catch (e) {
      console.error('[AskService] Persist error (non-blocking):', e.message);
    }
  }
};
