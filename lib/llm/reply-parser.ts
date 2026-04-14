/**
 * 답장 생성 Phase 2: 계획(Plan) JSON 파싱
 * LLM 1단계 출력을 Zod로 검증 후 ReplyPlan 타입으로 반환
 */

import { z } from 'zod';

const ReplyPlanSchema = z.object({
  detected_language: z.enum(['ko', 'en', 'ja', 'es', 'pt', 'ar']),
  fan_name: z.string().min(1),
  key_topics: z.array(z.string()),
  emotional_tone: z.string(),
  suggested_questions: z.array(z.string()),
  practice_topic: z.string(),
});

export type ReplyPlan = z.infer<typeof ReplyPlanSchema>;

/**
 * LLM 1단계(계획) 응답 텍스트에서 JSON 추출 후 파싱
 */
export function parsePlanResponse(response: string): ReplyPlan {
  let jsonStr = response;

  const jsonBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    jsonStr = jsonBlockMatch[1].trim();
  }

  const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    jsonStr = jsonObjectMatch[0];
  }

  const parsed = JSON.parse(jsonStr);
  const result = ReplyPlanSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error(
      `Invalid plan JSON: ${result.error.message}`
    );
  }

  return result.data;
}
