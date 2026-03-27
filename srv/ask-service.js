const cds = require('@sap/cds');
const { RAGEngine } = require('./lib/rag-engine');
const guardrails = require('./lib/guardrails');

module.exports = class AskService extends cds.ApplicationService {

  async init() {
    this.ragEngine = new RAGEngine();

    this.on('ask', async (req) => {
      const { question, sessionId } = req.data.req;
      const userId = req.user?.id || 'anonymous';
      const startTime = Date.now();

      const { Questions, Answers, AuditLog } = cds.entities('sap.ai.rag');

      // 1. Log the incoming question
      const questionId = cds.utils.uuid();
      await INSERT.into(Questions).entries({
        ID: questionId,
        text: question,
        userId,
        sessionId: sessionId || cds.utils.uuid(),
        status: 'pending'
      });

      try {
        // 2. Run RAG pipeline (includes pre/post guardrails)
        const result = await this.ragEngine.process(question);

        // 3. Determine action for audit
        let auditAction = 'ASK';
        if (result.blockReason === 'out_of_scope') auditAction = 'ASK_OUT_OF_SCOPE';
        else if (result.blockReason === 'input_blocked') auditAction = 'ASK_INPUT_BLOCKED';
        else if (result.guardrailHit) auditAction = 'ASK_GUARDRAIL_HIT';

        // 4. Store the answer
        const answerId = cds.utils.uuid();
        await INSERT.into(Answers).entries({
          ID: answerId,
          text: result.answer,
          question_ID: questionId,
          confidence: result.confidence,
          sourceDocs: JSON.stringify(result.sources),
          modelId: result.modelId || 'gpt-4',
          tokenCount: result.tokenCount || 0,
          responseTimeMs: Date.now() - startTime
        });

        // 5. Update question status
        const status = result.guardrailHit ? 'failed' : 'answered';
        await UPDATE(Questions, questionId).with({ status, answer_ID: answerId });

        // 6. Structured audit log via guardrails module
        const auditEntry = guardrails.buildAuditEntry({
          action: auditAction,
          userId,
          questionId,
          question,
          confidence: result.confidence,
          piiReport: result.piiReport,
          topicCheck: result.topicCheck,
          sources: result.sources,
          responseTimeMs: Date.now() - startTime,
          modelId: result.modelId
        });
        await INSERT.into(AuditLog).entries(auditEntry);

        return {
          answer: result.answer,
          confidence: result.confidence,
          sources: result.sources,
          questionId
        };

      } catch (err) {
        await UPDATE(Questions, questionId).with({ status: 'failed' });

        const auditEntry = guardrails.buildAuditEntry({
          action: 'ASK_FAILED',
          userId,
          questionId,
          question,
          confidence: 0
        });
        auditEntry.details = JSON.stringify({ error: err.message });
        await INSERT.into(AuditLog).entries(auditEntry);

        req.error(500, 'Failed to process question. Please try again.');
      }
    });

    await super.init();
  }
};
