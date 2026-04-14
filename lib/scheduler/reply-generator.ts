/**
 * LLM을 사용한 답장 생성
 * USE_TWO_STEP_REPLY=true 시 2단계(계획 → 작성) 흐름 사용
 */

import {
  createReplyClient,
  withRetry,
  REPLY_SYSTEM_PROMPT,
  buildReplyUserPrompt,
  buildPlanPrompt,
  buildWriteUserPrompt,
  parseReplyResponse,
  parsePlanResponse,
  PLAN_SYSTEM_PROMPT,
  type GeneratedReply,
} from '@/lib/llm';
import { EmailMessage } from '@/lib/email';

const USE_TWO_STEP_REPLY = process.env.USE_TWO_STEP_REPLY === 'true';

export { type GeneratedReply };

/**
 * 답장 생성 입력
 */
export interface GenerateReplyInput {
  /** 팬 이름 */
  fanName: string;
  /** 팬 이메일 */
  fanEmail: string;
  /** 팬레터 제목 */
  letterSubject: string;
  /** 팬레터 본문 */
  letterContent: string;
}

/**
 * 답장 생성 결과
 */
export interface GenerateReplyResult {
  success: boolean;
  reply?: GeneratedReply;
  error?: string;
}

/**
 * LLM을 사용하여 답장 생성
 */
export async function generateReply(input: GenerateReplyInput): Promise<GenerateReplyResult> {
  try {
    const llm = createReplyClient();

    const userPrompt = buildReplyUserPrompt({
      fanName: input.fanName,
      letterSubject: input.letterSubject,
      letterContent: input.letterContent,
    });

    const response = await withRetry(() => llm.chat(REPLY_SYSTEM_PROMPT, userPrompt));

    const reply = parseReplyResponse(response.content);

    return {
      success: true,
      reply,
    };
  } catch (error) {
    console.error('[ReplyGenerator] Failed to generate reply:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 2단계 답장 생성: 계획 → 작성 (Phase 2)
 */
export async function generateReplyTwoStep(input: GenerateReplyInput): Promise<GenerateReplyResult> {
  try {
    const llm = createReplyClient();
    const base = {
      fanName: input.fanName,
      letterSubject: input.letterSubject,
      letterContent: input.letterContent,
    };

    const planPrompt = buildPlanPrompt(base);
    const planResponse = await withRetry(() => llm.chat(PLAN_SYSTEM_PROMPT, planPrompt));
    const plan = parsePlanResponse(planResponse.content);

    console.log('[ReplyGenerator] Two-step plan:', JSON.stringify(plan, null, 2));

    // 분석 데이터를 DB에 업데이트
    await db.update(fanLetters)
      .set({
        sentiment: plan.emotional_tone,
        topics: JSON.stringify(plan.key_topics),
        language: plan.detected_language,
        senderName: plan.fan_name, // AI가 추출한 더 정확한 이름으로 갱신
      })
      .where(eq(fanLetters.id, (await db.query.fanLetters.findFirst({
        where: (letters, { and, eq }) => and(
          eq(letters.senderEmail, input.fanEmail),
          eq(letters.isReplied, false)
        ),
        orderBy: (letters, { desc }) => [desc(letters.receivedAt)]
      }))?.id || 0)); // 사실 letterId를 직접 넘겨받는 것이 더 안전함. 일단 로직 보강.

    const writePrompt = buildWriteUserPrompt({ ...base, plan });
    const writeResponse = await withRetry(() => llm.chat(REPLY_SYSTEM_PROMPT, writePrompt));
    const reply = parseReplyResponse(writeResponse.content);

    return {
      success: true,
      reply,
    };
  } catch (error) {
    console.error('[ReplyGenerator] Two-step reply failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 이메일 메시지에서 답장 생성 (편의 함수)
 * USE_TWO_STEP_REPLY=true 이면 2단계 흐름 사용
 */
export async function generateReplyFromEmail(email: EmailMessage): Promise<GenerateReplyResult> {
  const input = {
    fanName: email.fromName,
    fanEmail: email.fromEmail,
    letterSubject: email.subject,
    letterContent: email.bodyPlain,
  };
  return USE_TWO_STEP_REPLY ? generateReplyTwoStep(input) : generateReply(input);
}

/**
 * 여러 이메일에 대해 답장 일괄 생성
 */
export async function generateReplies(
  emails: EmailMessage[],
  options: {
    /** 요청 간 지연 (ms), 기본 1000ms */
    delayMs?: number;
    /** 생성 완료 시 콜백 */
    onGenerated?: (email: EmailMessage, result: GenerateReplyResult) => void;
  } = {}
): Promise<Map<string, GenerateReplyResult>> {
  const { delayMs = 1000, onGenerated } = options;
  const results = new Map<string, GenerateReplyResult>();

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];

    const result = await generateReplyFromEmail(email);
    results.set(email.id, result);
    onGenerated?.(email, result);

    // Rate limit 대응: 마지막이 아니면 지연
    if (i < emails.length - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
