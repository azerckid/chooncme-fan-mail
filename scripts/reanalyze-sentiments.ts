import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../db/index";
import { fanLetters } from "../db/schema";
import { eq, or, isNull } from "drizzle-orm";
import { createLLMClientFromEnv } from "../lib/llm/index";
import { PLAN_SYSTEM_PROMPT, parsePlanResponse } from "../lib/llm/index";

async function main() {
  const letters = await db.select({ 
    id: fanLetters.id, 
    content: fanLetters.content, 
    subject: fanLetters.subject,
    senderName: fanLetters.senderName 
  })
  .from(fanLetters)
  .where(
    or(
      isNull(fanLetters.sentiment), 
      eq(fanLetters.sentiment, "unknown"), 
      eq(fanLetters.sentiment, ""),
      eq(fanLetters.sentiment, "positive"), // 기존 3단계 데이터도 8단계로 재정의 요청
      eq(fanLetters.sentiment, "neutral"),
      eq(fanLetters.sentiment, "negative")
    )
  );

  console.log(`Found ${letters.length} letters to re-analyze sentiments.`);

  if (letters.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  const client = createLLMClientFromEnv('reply'); // Reply 클라이언트를 사용하여 Plan 추출

  for (let i = 0; i < letters.length; i++) {
    const letter = letters[i];
    console.log(`[${i+1}/${letters.length}] Re-analyzing letter ID ${letter.id}...`);

    try {
      const userPrompt = `# 팬레터 정보
발신자: ${letter.senderName}
제목: ${letter.subject}
본문: ${letter.content.slice(0, 1500)}

위 팬레터의 감정 톤과 주제를 분석하여 계획 JSON을 출력하십시오.`;

      const response = await client.chat(PLAN_SYSTEM_PROMPT, userPrompt);
      const plan = parsePlanResponse(response.content);

      console.log(`  -> Detected emotion: ${plan.emotional_tone}`);
      
      await db.update(fanLetters)
        .set({ 
          sentiment: plan.emotional_tone,
          topics: JSON.stringify(plan.key_topics),
          language: plan.detected_language 
        })
        .where(eq(fanLetters.id, letter.id));

    } catch (e) {
      console.error(`  -> Failed:`, e);
    }
    
    // Rate limit delay
    await new Promise(r => setTimeout(r, 600));
  }
  
  console.log("Done re-analyzing all letters.");
}

main().catch(console.error);
