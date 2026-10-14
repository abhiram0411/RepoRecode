import { z } from "zod";

const text = z.string().trim().min(1).max(1500);
export const lessonSchema = z
  .object({
    summary: text,
    inputs: text,
    outputs: text,
    sideEffects: text,
    blocks: z
      .array(
        z
          .object({
            file: z.string().max(250),
            line: z.number().int().positive(),
            explanation: text,
          })
          .strict(),
      )
      .min(1)
      .max(12),
    commonMistakes: z.array(text).min(1).max(5),
    questions: z.array(text).min(1).max(5),
  })
  .strict();

export function validateLesson(content, source) {
  const lesson = lessonSchema.parse(JSON.parse(content));
  const end = source.line + source.source.split("\n").length - 1;
  if (
    lesson.blocks.some(
      (b) => b.file !== source.file || b.line < source.line || b.line > end,
    )
  )
    throw Error(
      "The generated lesson contains an unsupported source reference.",
    );
  return lesson;
}

export const lessonInstruction = `Return only a JSON object with string fields summary, inputs, outputs, sideEffects; a blocks array of objects {file, line, explanation}; and arrays of strings commonMistakes and questions. Use only the supplied file and line numbers within the supplied source, beginning at reference.line. Explain actual code in small blocks, using the requested experience and learning goal. Distinguish inferred purpose from syntax facts. Do not invent dependencies, runtime observations, test results, or certifications. Never generate HTML.`;

export async function boundedJson(response, limit = 64000) {
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw Error("Provider response too large");
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally {
    await reader.cancel();
  }
}
