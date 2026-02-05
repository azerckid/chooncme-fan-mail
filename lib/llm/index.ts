/**
 * LLM 모듈 진입점
 */

// 클라이언트
export {
  createLLMClient,
  createLLMClientFromEnv,
  createClassifyClient,
  createReplyClient,
  withRetry,
  type LLMProvider,
  type LLMTaskType,
  type LLMConfig,
  type LLMMessage,
  type LLMResponse,
} from './client';

// 분류 프롬프트
export {
  CLASSIFY_SYSTEM_PROMPT,
  buildClassifyUserPrompt,
  parseClassifyResponse,
  truncateBodyForClassification,
  type ClassifyPromptInput,
  type EmailClassification,
  type ClassificationResult,
} from './classify-prompt';

// 답장 프롬프트
export {
  REPLY_SYSTEM_PROMPT,
  buildReplyUserPrompt,
  parseReplyResponse,
  type ReplyPromptInput,
  type GeneratedReply,
} from './reply-prompt';

// 팔로업 프롬프트
export {
  getFollowUpSystemPrompt,
  buildFollowUpUserPrompt,
  parseFollowUpResponse,
  type FollowUpPromptInput,
  type GeneratedFollowUp,
} from './followup-prompt';
