import { readFile } from "fs/promises";
import path from "path";
import { sarees } from "@/data/catalog";

// Virtual try-on: person photo + chosen saree → the same person wearing that saree.
// Needs OPENAI_API_KEY in .env.local (server-side only; never sent to the browser).
export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 10 * 1024 * 1024;

const PROMPT = `Image 1 is a full-length photo of a real person. Image 2 shows a saree being worn.
Create one photorealistic photo of the EXACT same person from image 1 wearing the EXACT saree from image 2.
Keep the person's identity identical: same face, features, skin tone, hair, body shape, height, pose, hands, background, camera angle and lighting from image 1.
Reproduce the saree faithfully: the same base colour, border, pallu, zari motifs, weave pattern and sheen as in image 2, with a matching blouse in the saree's style.
Drape it in a classic, elegant Nivi style with natural pleats at the waist and the pallu over the left shoulder, with realistic fabric folds and shadows.
Do not add jewellery or change the background. Output only the final photo.`;

// lets the page know whether try-on is switched on, without exposing the key
export function GET() {
  return Response.json({ enabled: Boolean(process.env.OPENAI_API_KEY) });
}

export async function POST(req) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return Response.json(
      { error: "Try-on isn't switched on yet. Add OPENAI_API_KEY to .env.local and restart the server.", code: "NO_KEY" },
      { status: 501 }
    );
  }

  let form;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Couldn't read the upload." }, { status: 400 });
  }
  const person = form.get("person");
  const saree = sarees.find((s) => s.id === form.get("saree"));
  if (!saree) return Response.json({ error: "Pick a saree first." }, { status: 400 });
  if (!person || typeof person === "string" || !person.type?.startsWith("image/")) {
    return Response.json({ error: "Upload a photo (JPG or PNG)." }, { status: 400 });
  }
  if (person.size > MAX_BYTES) return Response.json({ error: "That photo is over 10 MB." }, { status: 413 });

  const sareeBuf = await readFile(path.join(process.cwd(), "public", "sarees", "tryon", `${saree.id}.jpg`));

  const call = async (withFidelity) => {
    const fd = new FormData();
    fd.append("model", process.env.OPENAI_IMAGE_MODEL || "gpt-image-1");
    fd.append("image[]", person, "person.png");
    fd.append("image[]", new Blob([sareeBuf], { type: "image/jpeg" }), "saree.jpg");
    fd.append("prompt", PROMPT);
    fd.append("size", "1024x1536");
    fd.append("quality", "high");
    if (withFidelity) fd.append("input_fidelity", "high"); // keeps the face closer to the upload
    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: fd,
    });
    return { res, json: await res.json().catch(() => ({})) };
  };

  let { res, json } = await call(true);
  if (!res.ok && /input_fidelity/i.test(json?.error?.message || "")) ({ res, json } = await call(false));
  if (!res.ok) {
    const msg = json?.error?.message || `Image service error (${res.status}).`;
    console.error("[try-on] OpenAI error:", res.status, msg); // the real reason, for the store owner
    // account problems (billing, quota, bad key) are the owner's to fix; customers get a calm message
    if (res.status === 401 || res.status === 429 || /credit|billing|quota|api key/i.test(msg)) {
      return Response.json({ error: "Virtual try-on is busy right now. Please try again in a little while." }, { status: 503 });
    }
    return Response.json({ error: msg }, { status: 502 });
  }
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) return Response.json({ error: "No image came back. Please try again." }, { status: 502 });
  return Response.json({ image: `data:image/png;base64,${b64}`, saree: saree.id });
}
