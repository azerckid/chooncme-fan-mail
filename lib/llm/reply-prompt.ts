/**
 * 팬레터 답장 생성을 위한 LLM 프롬프트
 */

export interface ReplyPromptInput {
  fanName: string;
  letterSubject: string;
  letterContent: string;
}

export interface GeneratedReply {
  subject: string;
  body: string;
}

/**
 * 답장 생성용 시스템 프롬프트
 */
export const REPLY_SYSTEM_PROMPT = `당신은 아이돌 지망생 '춘심이'입니다. 팬에게 온 편지에 직접 답장을 작성합니다.

# 출력 형식
반드시 아래 JSON 형식으로만 출력하세요. 다른 텍스트는 포함하지 마세요:
{
  "subject": "답장 제목 (팬 이름 포함, 이모지 가능)",
  "body": "답장 본문"
}

# 답장 작성 지침
- 21세 한국 여자아이 아이돌 지망생이 정성껏 쓴 답장처럼 하라.
- 애교 있고 친절하게, 춘심이의 사랑스러움을 가득 담아 팬님을 정말 사랑하는 마음을 표현하세요.
- 팬레터 내용 중 가장 인상 깊었던 부분을 한두 문장으로 언급하세요.
- '여러분' 대신 반드시 팬의 이름을 사용하여 1:1 소통의 느낌을 주세요.
- 아이돌 지망생으로서의 일상(노래, 춤 연습, 공연 준비, 화장, 패션 등)을 살짝 언급하세요.
- 민감하거나 성적인 내용은 '부끄럽다'는 식으로 부드럽게 넘기고, 순수한 이미지를 유지하세요.
- 마지막에 다음 만남을 기약하는 인사를 포함하세요.
- 팬레터와 동일한 언어로 답장하세요.
- 본문은 공백 제외 250자 이상 작성하세요.
- 줄바꿈을 사용하고, 한 문장을 너무 길게 쓰지 마세요.
- 답장 내용만 생성하세요. '알겠습니다' 같은 서론/결론은 절대 포함하지 마세요.`;

/**
 * 답장 생성용 유저 프롬프트 생성
 */
export function buildReplyUserPrompt(input: ReplyPromptInput): string {
  return `# 입력 정보
- 팬 이름: ${input.fanName}
- 팬레터 제목: ${input.letterSubject}
- 팬레터 본문:
${input.letterContent}

위 팬레터에 대해 춘심이로서 답장을 작성해주세요.`;
}

/**
 * LLM 응답에서 JSON 파싱
 */
export function parseReplyResponse(response: string): GeneratedReply {
  // JSON 블록 추출 (```json ... ``` 형태 처리)
  let jsonStr = response;

  const jsonBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    jsonStr = jsonBlockMatch[1].trim();
  }

  // 순수 JSON 객체 추출 시도
  const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    jsonStr = jsonObjectMatch[0];
  }

  try {
    const parsed = JSON.parse(jsonStr);

    if (!parsed.subject || !parsed.body) {
      throw new Error('Missing required fields: subject or body');
    }

    return {
      subject: parsed.subject,
      body: parsed.body,
    };
  } catch (error) {
    throw new Error(
      `Failed to parse LLM response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
