/**
 * 이메일 분류를 위한 LLM 프롬프트
 * 팬레터 vs 일반 메일 분류
 */

export interface ClassifyPromptInput {
  from: string;
  subject: string;
  bodyPreview: string; // 본문 앞부분 (토큰 절약을 위해 일부만)
}

export type EmailClassification = 'fan' | 'general';

export interface ClassificationResult {
  classification: EmailClassification;
  confidence: number; // 0.0 ~ 1.0
  reason: string;
}

/**
 * 분류용 시스템 프롬프트
 */
export const CLASSIFY_SYSTEM_PROMPT = `당신은 이메일 분류 전문가입니다. 주어진 이메일이 '팬레터'인지 '일반 메일'인지 분류합니다.

# 전제
이 메일함은 연예인/크리에이터에게 오는 메일함입니다. 따라서 **광고·스팸·뉴스레터·비즈니스·자동발송이 확실하지 않으면 팬레터(fan)로 분류**하세요. 애매한 경우 fan으로 분류합니다.

# 팬레터 판별 기준
다음 중 하나 이상에 해당하면 '팬레터(fan)'로 분류:
- 아이돌/연예인/크리에이터에게 보내는 응원, 사랑, 감사, 칭찬 메시지
- "좋아해요", "응원해요", "팬이에요", "사랑해요", "예쁘다", "잘했어요" 등의 표현
- 공연, 영상, 활동에 대한 감상이나 칭찬
- 팬으로서의 일상 공유, 안부 인사, 짧은 편지
- 선물, 팬아트, 팬레터임을 명시한 경우
- 짧은 칭찬·감사·인사만 있는 경우(예: "You're beautiful", "항상 응원해요", "감사해요")
- 개인적으로 보내는 메시지로 보이고 뉴스레터/광고/협업 제안이 아닌 경우

# 일반 메일 판별 기준 (다음에만 해당할 때 general)
- 광고, 스팸, 뉴스레터(구독 메일, 프로모션)
- 비즈니스 문의, 협업/업무 제안
- 시스템 알림, 자동 발송 메일
- 고객 지원·문의 폼에서 온 문의
- 위 항목이 **명확할 때만** general. 애매하면 fan.

# 출력 형식
반드시 아래 JSON 형식으로만 출력하세요:
{
  "classification": "fan" 또는 "general",
  "confidence": 0.0~1.0 사이의 신뢰도,
  "reason": "분류 이유 (한 문장)"
}`;

/**
 * 분류용 유저 프롬프트 생성
 */
export function buildClassifyUserPrompt(input: ClassifyPromptInput): string {
  return `다음 이메일을 분류해주세요:

발신자: ${input.from}
제목: ${input.subject}
본문 미리보기:
${input.bodyPreview}

위 이메일이 팬레터인지 일반 메일인지 분류해주세요.`;
}

/**
 * LLM 응답에서 분류 결과 파싱
 */
export function parseClassifyResponse(response: string): ClassificationResult {
  let jsonStr = response;

  // ```json ... ``` 블록 추출
  const jsonBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    jsonStr = jsonBlockMatch[1].trim();
  }

  // JSON 객체 추출
  const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    jsonStr = jsonObjectMatch[0];
  }

  try {
    const parsed = JSON.parse(jsonStr);

    if (!parsed.classification || !['fan', 'general'].includes(parsed.classification)) {
      throw new Error('Invalid classification value');
    }

    return {
      classification: parsed.classification as EmailClassification,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      reason: parsed.reason || '',
    };
  } catch (error) {
    // 파싱 실패 시 기본값 반환 (안전하게 general로)
    console.error('Failed to parse classification response:', error);
    return {
      classification: 'general',
      confidence: 0,
      reason: 'Failed to parse LLM response',
    };
  }
}

/**
 * 본문 미리보기 생성 (토큰 절약)
 * @param body 전체 본문
 * @param maxLength 최대 길이 (기본 500자)
 */
export function truncateBodyForClassification(body: string, maxLength = 500): string {
  if (body.length <= maxLength) {
    return body;
  }
  return body.slice(0, maxLength) + '...';
}
