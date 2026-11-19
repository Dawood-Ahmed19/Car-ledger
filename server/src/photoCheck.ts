import fs from "node:fs/promises";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL ?? "qwen2.5vl:7b";

type Verdict = {
  subject: "car" | "motorcycle" | "other";
  isRealPhoto: boolean;
  reason: string;
};

const PROMPT = `You check photos for a used car and motorbike marketplace.
Decide what the photo mainly shows.
- subject "car": a real car (exterior, interior, dashboard, engine bay, wheels, odometer).
- subject "motorcycle": a real motorbike or scooter (any part of it).
- subject "other": anything else (games, screenshots, memes, logos, people, animals, buildings, documents, products, empty roads).
- isRealPhoto: true only for a camera photo of a real vehicle. False for drawings, renders, game graphics, screenshots, posters or edited ads.
Reply with JSON only.`;

async function checkOne(path: string): Promise<Verdict> {
  const image = (await fs.readFile(path)).toString("base64");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 120_000); // first call loads the model
  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: VISION_MODEL,
        stream: false,
        keep_alive: "30m",
        format: {
          type: "object",
          properties: {
            subject: { type: "string", enum: ["car", "motorcycle", "other"] },
            isRealPhoto: { type: "boolean" },
            reason: { type: "string" },
          },
          required: ["subject", "isRealPhoto", "reason"],
        },
        options: { temperature: 0 },
        messages: [{ role: "user", content: PROMPT, images: [image] }],
      }),
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}`);
    const data = (await res.json()) as any;
    const v = JSON.parse(data?.message?.content ?? "");
    if (!["car", "motorcycle", "other"].includes(v?.subject))
      throw new Error("Bad vision response");
    return v as Verdict;
  } finally {
    clearTimeout(timer);
  }
}

// Returns the indexes of photos that are not real car/bike photos.
// Throws if the AI can't be reached (caller decides what to do).
export async function findRejectedPhotos(
  files: { path: string }[],
): Promise<number[]> {
  const rejected: number[] = [];
  for (let i = 0; i < files.length; i++) {
    const v = await checkOne(files[i].path);
    if (!v.isRealPhoto || v.subject === "other") {
      rejected.push(i);
      console.log(`Photo ${i} rejected: ${v.subject}, ${v.reason}`);
    }
  }
  return rejected;
}
