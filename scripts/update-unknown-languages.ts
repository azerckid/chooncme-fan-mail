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
    language: fanLetters.language 
  })
  .from(fanLetters)
  .where(
    or(
      isNull(fanLetters.language), 
      eq(fanLetters.language, "unknown"), 
      eq(fanLetters.language, "")
    )
  );

  console.log(`Found ${letters.length} letters with unknown language.`);

  if (letters.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  const client = createLLMClientFromEnv('classify');

  const SYSTEM_PROMPT = `당신은 언어 감지 전문가입니다. 주어진 텍스트의 언어를 판별하여 ISO 639-1 언어 코드(소문자 2자리)만 출력하십시오.
예: 한국어 -> ko, 영어 -> en, 일본어 -> ja, 중국어 -> zh, 스페인어 -> es, 프랑스어 -> fr, 독일어 -> de, 헝가리어 -> hu, 베트남어 -> vi, 태국어 -> th, 튀르키예어 -> tr 등.
혼합된 경우 가장 비중이 큰 언어를 선택하세요. 결괏값은 반드시 2글자 코드만 출력해야 합니다.`;

  for (let i = 0; i < letters.length; i++) {
    const letter = letters[i];
    console.log(`[${i+1}/${letters.length}] Processing letter ID ${letter.id}...`);

    try {
      const userPrompt = `다음 텍스트의 언어를 판별해주세요:\n\n${letter.content.slice(0, 1000)}`;

      const response = await client.chat(SYSTEM_PROMPT, userPrompt);
      const detected = response.content.trim().toLowerCase().replace(/[^a-z]/g, '');

      if (detected.length === 2 || detected.length === 3) {
        console.log(`  -> Detected language: ${detected}`);
        await db.update(fanLetters)
          .set({ language: detected })
          .where(eq(fanLetters.id, letter.id));
      } else {
        console.log(`  -> Could not detect language explicitly, got: ${response.content}`);
      }
    } catch (e) {
      console.error(`  -> Failed:`, e);
    }
    
    // Add small delay to prevent rate limit
    await new Promise(r => setTimeout(r, 800));
  }
  
  console.log("Done classifying languages.");
}

main().catch(console.error);
