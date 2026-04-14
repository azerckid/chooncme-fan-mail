import { db } from "../db/index";
import { fanLetters } from "../db/schema";
import { isNull, eq, or } from "drizzle-orm";

async function main() {
  const letters = await db.select({ 
    id: fanLetters.id, 
    subject: fanLetters.subject, 
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

  console.log("Found unknown languages:", letters.length);
  if (letters.length > 0) {
    console.log(letters[0]);
  }
}

main().catch(console.error);
