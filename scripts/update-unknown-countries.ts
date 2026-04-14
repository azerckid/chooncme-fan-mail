import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../db/index";
import { fanLetters } from "../db/schema";
import { isNull, eq, or } from "drizzle-orm";
import { createLLMClientFromEnv } from "../lib/llm/index";

async function main() {
  const letters = await db.select({ 
    id: fanLetters.id, 
    content: fanLetters.content, 
    language: fanLetters.language,
    senderEmail: fanLetters.senderEmail 
  })
  .from(fanLetters)
  .where(
    or(
      isNull(fanLetters.country), 
      eq(fanLetters.country, "unknown"), 
      eq(fanLetters.country, "")
    )
  );

  console.log(`Found ${letters.length} letters with unknown country.`);

  if (letters.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  const client = createLLMClientFromEnv('classify');

  const SYSTEM_PROMPT = `당신은 지리 정보 및 이메일 분석 전문가입니다. 주어진 수신자의 정보(언어, 이메일 주소, 내용)를 바탕으로 가장 가능성이 높은 발신 국가의 ISO 3166-1 alpha-2 영문 대문자 2자리 국가 코드를 추론하십시오.
- 특정 국가를 암시하는 인사말, 언급된 지명, 이메일 최상위 도메인(.jp, .kr, .es 등)을 단서로 사용하십시오.
- 명확한 단서가 없다면 작성된 언어를 사용하는 가장 대표적인 국가를 추론하십시오. (예: 한국어 -> KR, 영어 -> US, 일본어 -> JP, 스페인어 -> ES, 인도네시아어 -> ID, 태국어 -> TH)
- 반드시 영문 대문자 2자리(예: KR, US, ES, FR 등)만 출력해야 하며, 설명이나 부연 설명은 절대 덧붙이지 마십시오.`;

  for (let i = 0; i < letters.length; i++) {
    const letter = letters[i];
    console.log(`[${i+1}/${letters.length}] Processing letter ID ${letter.id}...`);

    try {
      const userPrompt = `발신자 이메일: ${letter.senderEmail}\n작성 언어: ${letter.language}\n본문: ${letter.content.slice(0, 1000)}\n\n이 팬레터의 발신 국가 코드를 2글자로 출력하세요.`;

      const response = await client.chat(SYSTEM_PROMPT, userPrompt);
      const detected = response.content.trim().toUpperCase().replace(/[^A-Z]/g, '');

      if (detected.length === 2) {
        console.log(`  -> Detected country: ${detected}`);
        await db.update(fanLetters)
          .set({ country: detected })
          .where(eq(fanLetters.id, letter.id));
      } else {
        console.log(`  -> Could not detect country explicitly, got: ${response.content}`);
      }
    } catch (e) {
      console.error(`  -> Failed:`, e);
    }
    
    // Add small delay to prevent rate limit
    await new Promise(r => setTimeout(r, 600));
  }
  
  console.log("Done classifying countries.");
}

main().catch(console.error);
