/**
 * 팔로업 이메일 콘텐츠 생성 (LLM 사용)
 */

import { createReplyClient, withRetry } from '@/lib/llm';
import {
  getFollowUpSystemPrompt,
  buildFollowUpUserPrompt,
  parseFollowUpResponse,
  type FollowUpPromptInput,
  type GeneratedFollowUp,
} from '@/lib/llm/followup-prompt';
import { DateTime } from 'luxon';

export interface GenerateFollowUpResult {
  success: boolean;
  followUp?: GeneratedFollowUp;
  error?: string;
}

/**
 * 팔로업 이메일 콘텐츠 생성
 */
export async function generateFollowUp(
  input: FollowUpPromptInput
): Promise<GenerateFollowUpResult> {
  try {
    const llm = createReplyClient();

    const systemPrompt = getFollowUpSystemPrompt(input.followUpCount);
    const userPrompt = buildFollowUpUserPrompt(input);

    const response = await withRetry(() => llm.chat(systemPrompt, userPrompt));
    const followUp = parseFollowUpResponse(response.content);

    return {
      success: true,
      followUp,
    };
  } catch (error) {
    console.error('[FollowUpGenerator] Failed to generate follow-up:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * ISO 날짜로부터 경과일 계산
 */
export function calculateDaysSince(isoDate: string): number {
  const then = DateTime.fromISO(isoDate);
  const now = DateTime.utc();
  return Math.floor(now.diff(then, 'days').days);
}
