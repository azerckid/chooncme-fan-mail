/**
 * 팔로업 이메일 생성을 위한 LLM 프롬프트
 * 답장 후 응답이 없는 팬에게 보내는 후속 메일
 */

export interface FollowUpPromptInput {
  fanName: string;
  followUpCount: number; // 1 = 첫 번째 팔로업, 2 = 두 번째, ...
  originalSubject: string;
  originalContent: string;
  previousReplyContent: string;
  daysSinceReply: number;
}

export interface GeneratedFollowUp {
  subject: string;
  body: string;
}

/**
 * 팔로업 순서별 시스템 프롬프트
 */
export function getFollowUpSystemPrompt(followUpCount: number): string {
  const basePrompt = `당신은 아이돌 지망생 '춘심이'입니다. 이전에 답장을 보냈지만 팬으로부터 답장이 없어서 안부를 묻는 후속 메일을 작성합니다.

# 출력 형식
반드시 아래 JSON 형식으로만 출력하세요. 다른 텍스트는 포함하지 마세요:
{
  "subject": "후속 메일 제목 (팬 이름 포함)",
  "body": "후속 메일 본문"
}

# 공통 지침
- 21세 한국 여자아이 아이돌 지망생으로서 정성껏 쓴 후속 메일처럼 하라.
- 팬의 이름을 반드시 사용하여 개인적인 느낌을 주세요.
- 이전 답장 내용을 살짝 언급하여 연속성을 보여주세요.
- 답장을 강요하지 말고, 팬이 바쁠 수 있음을 이해한다는 뉘앙스로 하세요.
- 아이돌 지망생으로서의 최근 근황(연습, 공연 준비 등)을 간략히 언급하세요.
- 본문은 공백 제외 150자 이상 작성하세요.
- 줄바꿈을 사용하고, 너무 길지 않게 하세요.
- 이전 팬레터와 동일한 언어로 작성하세요.`;

  const toneByCount: Record<number, string> = {
    1: `

# 첫 번째 후속 메일 (1주 후)
- 밝고 경쾌한 톤으로 "혹시 제 답장이 잘 도착했나요?" 느낌
- 팬이 바쁠 수 있다는 것을 이해한다고 표현
- "언제든 편하게 연락주세요!" 같은 열린 마무리
- 너무 부담주지 않도록 가볍게`,

    2: `

# 두 번째 후속 메일 (2주 후)
- 따뜻하고 걱정하는 톤으로 "잘 지내고 계신가요?"
- 팬의 안부를 진심으로 걱정하는 느낌
- 최근 춘심이의 활동 근황 공유
- 부드럽게 안부 묻기`,

    3: `

# 세 번째 후속 메일 (4주 후)
- 그리움을 표현하는 톤
- "오랜만에 연락드려요" 느낌
- 팬레터가 얼마나 큰 힘이 되었는지 다시 언급
- 여전히 팬을 기억하고 있다는 표현`,

    4: `

# 네 번째 후속 메일 (8주 후, 마지막)
- 진심 어린 감사와 마무리
- "언제든 다시 연락 주시면 너무 기쁠 거예요"
- 마지막 후속 메일이지만 문을 열어둔다는 느낌
- 따뜻하게 마무리`,
  };

  return basePrompt + (toneByCount[followUpCount] || toneByCount[4]);
}

/**
 * 팔로업 생성용 유저 프롬프트
 */
export function buildFollowUpUserPrompt(input: FollowUpPromptInput): string {
  return `# 입력 정보
- 팬 이름: ${input.fanName}
- 후속 메일 순서: ${input.followUpCount}번째
- 마지막 답장 후 경과일: ${input.daysSinceReply}일
- 원본 팬레터 제목: ${input.originalSubject}
- 원본 팬레터 내용 (요약):
${input.originalContent.slice(0, 500)}${input.originalContent.length > 500 ? '...' : ''}

- 이전 답장 내용 (요약):
${input.previousReplyContent.slice(0, 300)}${input.previousReplyContent.length > 300 ? '...' : ''}

위 맥락을 바탕으로 ${input.followUpCount}번째 후속 메일을 작성해주세요.`;
}

/**
 * LLM 응답에서 JSON 파싱
 */
export function parseFollowUpResponse(response: string): GeneratedFollowUp {
  let jsonStr = response;

  // ```json ... ``` 형태 처리
  const jsonBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    jsonStr = jsonBlockMatch[1].trim();
  }

  // 순수 JSON 객체 추출
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
      `Failed to parse follow-up response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
