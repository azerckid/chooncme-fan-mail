/**
 * 스케줄러 모듈 진입점
 */

// 답장 생성
export {
  generateReply,
  generateReplyFromEmail,
  generateReplies,
  type GenerateReplyInput,
  type GenerateReplyResult,
  type GeneratedReply,
} from './reply-generator';

// 지연 발송
export {
  calculateRandomDelay,
  getDelayConfig,
  isDryRunMode,
  sendReplyImmediately,
  scheduleDelayedSend,
  scheduleMultipleDelayedSends,
  type DelayedSendOptions,
  type SendRequest,
  type SendResult,
} from './delayed-send';

// 이메일 처리 파이프라인
export {
  processEmails,
  formatProcessResult,
  type ProcessResult,
  type ProcessOptions,
} from './process-emails';

// Cron 스케줄러
export {
  startScheduler,
  stopScheduler,
  isSchedulerRunning,
  runNow,
} from './cron';

// 팔로업 추적
export {
  createFollowUp,
  cancelFollowUpsForSender,
  getPendingFollowUps,
  hasFanRepliedSince,
  updateFollowUpAfterSend,
  getFollowUpContext,
  calculateNextFollowUpDate,
  isFollowUpEnabled,
  getMaxFollowUps,
  FOLLOW_UP_INTERVALS_DAYS,
  MAX_FOLLOW_UPS,
} from './follow-up';

// 팔로업 콘텐츠 생성
export {
  generateFollowUp,
  calculateDaysSince,
  type GenerateFollowUpResult,
} from './followup-generator';

// 팔로업 처리
export {
  processFollowUps,
  formatFollowUpResult,
  type ProcessFollowUpsResult,
} from './process-followups';
