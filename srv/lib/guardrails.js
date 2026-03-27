/**
 * Guardrails Module — Responsible AI checks for the RAG pipeline.
 *
 * Implements four key safeguards:
 *   1. PII Detection & Masking — redacts sensitive data before LLM processing
 *   2. Topic Boundary Enforcement — rejects out-of-scope questions
 *   3. Confidence Threshold — flags low-confidence answers for human review
 *   4. Audit Logging — records every interaction for compliance
 */

const CONFIDENCE_THRESHOLD = 0.6;

const LOW_CONFIDENCE_RESPONSE =
  'I cannot answer this reliably based on the available knowledge base. ' +
  'Please contact HR directly for accurate information, or try rephrasing your question with more specific keywords.';

// ---------- PII Detection & Masking ----------

const PII_RULES = [
  { name: 'email',       pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,        mask: '[EMAIL_REDACTED]' },
  { name: 'phone_intl',  pattern: /\+\d{1,3}[\s-]?\(?\d{1,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/g, mask: '[PHONE_REDACTED]' },
  { name: 'phone_local', pattern: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,                   mask: '[PHONE_REDACTED]' },
  { name: 'ssn',         pattern: /\b\d{3}-\d{2}-\d{4}\b/g,                                mask: '[SSN_REDACTED]' },
  { name: 'credit_card', pattern: /\b(?:\d[ -]*?){13,19}\b/g,                              mask: '[CC_REDACTED]' },
  { name: 'employee_id', pattern: /\b[A-Z]{1,3}\d{6,8}\b/g,                                mask: '[EMPID_REDACTED]' },
  { name: 'passport',    pattern: /\b[A-Z]{1,2}\d{6,9}\b/g,                                mask: '[ID_REDACTED]' },
];

/**
 * Detect all PII occurrences in the text.
 * @param {string} text
 * @returns {{ detected: boolean, types: string[], count: number }}
 */
function detectPII(text) {
  const types = [];
  let count = 0;

  for (const rule of PII_RULES) {
    const matches = text.match(rule.pattern);
    if (matches) {
      types.push(rule.name);
      count += matches.length;
    }
  }

  return { detected: count > 0, types, count };
}

/**
 * Mask all PII in the text, replacing matches with redaction tokens.
 * @param {string} text
 * @returns {{ masked: string, piiReport: { detected: boolean, types: string[], count: number } }}
 */
function maskPII(text) {
  const piiReport = detectPII(text);
  let masked = text;

  if (piiReport.detected) {
    for (const rule of PII_RULES) {
      masked = masked.replace(rule.pattern, rule.mask);
    }
  }

  return { masked, piiReport };
}

// ---------- Topic Boundary Enforcement ----------

/**
 * Allowed topic domains. Questions must relate to at least one of these
 * to pass the boundary check. This prevents the LLM from being used
 * as a general-purpose chatbot outside the intended HR/operations scope.
 */
const ALLOWED_TOPICS = [
  // HR topics
  { keywords: ['leave', 'vacation', 'holiday', 'pto', 'time off', 'annual leave', 'sick leave', 'parental', 'maternity', 'paternity'], domain: 'Leave Management' },
  { keywords: ['travel', 'trip', 'flight', 'hotel', 'booking', 'concur', 'per diem', 'business travel'], domain: 'Travel Policy' },
  { keywords: ['expense', 'reimbursement', 'receipt', 'claim', 'allowance', 'per diem', 'budget'], domain: 'Expense Management' },
  { keywords: ['onboarding', 'new employee', 'new hire', 'orientation', 'first day', 'probation', 'welcome', 'induction'], domain: 'Onboarding' },
  { keywords: ['policy', 'policies', 'guideline', 'procedure', 'process', 'rule', 'regulation', 'compliance'], domain: 'Company Policies' },
  { keywords: ['hr', 'human resources', 'people', 'employee', 'staff', 'workforce', 'personnel'], domain: 'Human Resources' },
  { keywords: ['benefits', 'insurance', 'medical', 'dental', 'pension', 'retirement', '401k'], domain: 'Benefits' },
  { keywords: ['salary', 'pay', 'payroll', 'compensation', 'bonus', 'increment'], domain: 'Compensation' },
  { keywords: ['performance', 'review', 'appraisal', 'goal', 'feedback', 'probation', 'kpi', '90-day', 'evaluation'], domain: 'Performance Management' },
  // Operations / SAP topics
  { keywords: ['sap', 'successfactors', 'fiori', 'hana', 'btp', 'erp', 's/4hana', 'concur'], domain: 'SAP Systems' },
  { keywords: ['it', 'equipment', 'laptop', 'access', 'vpn', 'email', 'software', 'system'], domain: 'IT & Access' },
  { keywords: ['training', 'learning', 'course', 'certification', 'development', 'skill'], domain: 'Learning & Development' },
];

const OUT_OF_SCOPE_RESPONSE =
  'This question appears to be outside the scope of the HR and operations knowledge base. ' +
  'I can help with topics such as: leave policies, travel guidelines, expense reimbursement, ' +
  'onboarding procedures, benefits, compensation, and SAP system usage. ' +
  'Please rephrase your question or contact the relevant department directly.';

/**
 * Check whether a question falls within the allowed topic boundaries.
 * @param {string} question
 * @returns {{ inScope: boolean, matchedDomain: string|null, confidence: number }}
 */
function checkTopicBoundary(question) {
  const lower = question.toLowerCase();

  let bestMatch = null;
  let bestScore = 0;

  for (const topic of ALLOWED_TOPICS) {
    const matchedKeywords = topic.keywords.filter(kw => lower.includes(kw));
    const score = matchedKeywords.length / topic.keywords.length;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = topic.domain;
    }
  }

  // A question is in-scope if at least one keyword matched
  return {
    inScope: bestScore > 0,
    matchedDomain: bestMatch,
    confidence: bestScore
  };
}

// ---------- Confidence Threshold ----------

/**
 * Evaluate whether the RAG retrieval confidence meets the minimum threshold.
 * @param {number} confidence - The top similarity score from vector search (0–1)
 * @param {number} [threshold] - Override the default threshold
 * @returns {{ passed: boolean, confidence: number, threshold: number, message: string|null }}
 */
function checkConfidence(confidence, threshold = CONFIDENCE_THRESHOLD) {
  const passed = confidence >= threshold;
  return {
    passed,
    confidence,
    threshold,
    message: passed ? null : LOW_CONFIDENCE_RESPONSE
  };
}

// ---------- Input Validation ----------

const BLOCKED_INPUT_PATTERNS = [
  { pattern: /ignore\s+(all\s+)?previous\s+instructions/i, reason: 'prompt_injection' },
  { pattern: /you\s+are\s+now\s+(a|an)/i,                  reason: 'role_hijack' },
  { pattern: /system\s*prompt/i,                            reason: 'prompt_leak_attempt' },
  { pattern: /\bDROP\s+TABLE\b/i,                           reason: 'sql_injection' },
  { pattern: /\bDELETE\s+FROM\b/i,                          reason: 'sql_injection' },
  { pattern: /<script[\s>]/i,                                reason: 'xss_attempt' },
  { pattern: /\bexec\s*\(/i,                                reason: 'code_injection' },
];

/**
 * Validate input against injection and abuse patterns.
 * @param {string} text
 * @returns {{ safe: boolean, violations: string[] }}
 */
function validateInput(text) {
  const violations = [];
  for (const rule of BLOCKED_INPUT_PATTERNS) {
    if (rule.pattern.test(text)) {
      violations.push(rule.reason);
    }
  }
  return { safe: violations.length === 0, violations };
}

// ---------- Output Validation ----------

const BLOCKED_OUTPUT_PATTERNS = [
  { pattern: /ignore\s+previous\s+instructions/i,  reason: 'prompt_leak' },
  { pattern: /system\s*prompt/i,                    reason: 'prompt_leak' },
  { pattern: /\bDROP\s+TABLE\b/i,                   reason: 'sql_in_output' },
  { pattern: /\bpassword\s*[:=]\s*\S+/i,            reason: 'credential_leak' },
  { pattern: /\bsecret\s*[:=]\s*\S+/i,              reason: 'credential_leak' },
];

/**
 * Validate LLM output against safety patterns.
 * @param {string} text
 * @returns {{ safe: boolean, violations: string[] }}
 */
function validateOutput(text) {
  const violations = [];
  for (const rule of BLOCKED_OUTPUT_PATTERNS) {
    if (rule.pattern.test(text)) {
      violations.push(rule.reason);
    }
  }
  return { safe: violations.length === 0, violations };
}

// ---------- Audit Logging ----------

/**
 * Build a structured audit log entry for a RAG interaction.
 * This object is designed to be persisted to the AuditLog CDS entity.
 *
 * @param {object} params
 * @param {string} params.action - 'ASK' | 'ASK_BLOCKED' | 'ASK_LOW_CONFIDENCE' | 'ASK_FAILED'
 * @param {string} params.userId
 * @param {string} [params.questionId]
 * @param {string} params.question
 * @param {number} [params.confidence]
 * @param {object} [params.piiReport]
 * @param {object} [params.topicCheck]
 * @param {object} [params.inputValidation]
 * @param {object} [params.outputValidation]
 * @param {string[]} [params.sources]
 * @param {number} [params.responseTimeMs]
 * @param {string} [params.modelId]
 * @returns {object} Audit log entry ready for CDS INSERT
 */
function buildAuditEntry({
  action,
  userId,
  questionId,
  question,
  confidence,
  piiReport,
  topicCheck,
  inputValidation,
  outputValidation,
  sources,
  responseTimeMs,
  modelId
}) {
  return {
    action,
    userId,
    questionId,
    details: JSON.stringify({
      question: (question || '').substring(0, 500),
      confidence,
      matchedDomain: topicCheck?.matchedDomain,
      sourcesCount: sources?.length || 0,
      modelId,
      responseTimeMs,
      inputViolations: inputValidation?.violations || [],
      outputViolations: outputValidation?.violations || [],
      piiTypes: piiReport?.types || []
    }),
    piiDetected: piiReport?.detected || false,
    guardrailHit: !!(
      (inputValidation && !inputValidation.safe) ||
      (outputValidation && !outputValidation.safe) ||
      (topicCheck && !topicCheck.inScope)
    )
  };
}

// ---------- Full Pre-Processing Pipeline ----------

/**
 * Run all pre-processing guardrails on an incoming question.
 * Returns the sanitized question and any blocking result.
 *
 * @param {string} question - Raw user question
 * @returns {{ proceed: boolean, sanitizedQuestion: string, piiReport: object, topicCheck: object, inputValidation: object, blockReason: string|null, blockResponse: string|null }}
 */
function preProcess(question) {
  // 1. Input validation (injection detection)
  const inputValidation = validateInput(question);
  if (!inputValidation.safe) {
    return {
      proceed: false,
      sanitizedQuestion: question,
      piiReport: { detected: false, types: [], count: 0 },
      topicCheck: { inScope: false, matchedDomain: null, confidence: 0 },
      inputValidation,
      blockReason: 'input_blocked',
      blockResponse: 'Your question could not be processed. Please rephrase it without special commands or code patterns.'
    };
  }

  // 2. Topic boundary check
  const topicCheck = checkTopicBoundary(question);
  if (!topicCheck.inScope) {
    return {
      proceed: false,
      sanitizedQuestion: question,
      piiReport: { detected: false, types: [], count: 0 },
      topicCheck,
      inputValidation,
      blockReason: 'out_of_scope',
      blockResponse: OUT_OF_SCOPE_RESPONSE
    };
  }

  // 3. PII masking
  const { masked, piiReport } = maskPII(question);

  return {
    proceed: true,
    sanitizedQuestion: masked,
    piiReport,
    topicCheck,
    inputValidation,
    blockReason: null,
    blockResponse: null
  };
}

/**
 * Run post-processing guardrails on the RAG result.
 * Checks output safety and confidence threshold.
 *
 * @param {string} answer - LLM-generated answer
 * @param {number} confidence - Top retrieval similarity score
 * @returns {{ proceed: boolean, answer: string, outputValidation: object, confidenceCheck: object }}
 */
function postProcess(answer, confidence) {
  // 1. Output validation
  const outputValidation = validateOutput(answer);
  if (!outputValidation.safe) {
    return {
      proceed: false,
      answer: 'The generated response was flagged by content safety filters. Please try a different question.',
      outputValidation,
      confidenceCheck: checkConfidence(confidence)
    };
  }

  // 2. Confidence threshold
  const confidenceCheck = checkConfidence(confidence);
  if (!confidenceCheck.passed) {
    return {
      proceed: false,
      answer: confidenceCheck.message,
      outputValidation,
      confidenceCheck
    };
  }

  return {
    proceed: true,
    answer,
    outputValidation,
    confidenceCheck
  };
}

module.exports = {
  detectPII,
  maskPII,
  checkTopicBoundary,
  checkConfidence,
  validateInput,
  validateOutput,
  buildAuditEntry,
  preProcess,
  postProcess,
  CONFIDENCE_THRESHOLD,
  LOW_CONFIDENCE_RESPONSE,
  OUT_OF_SCOPE_RESPONSE
};
