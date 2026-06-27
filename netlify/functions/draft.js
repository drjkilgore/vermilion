// Vermilion — AI text studio
// Serverless proxy that calls Claude with vision. The Anthropic key lives
// ONLY here, read from the Netlify environment variable ANTHROPIC_API_KEY.
// It is never sent to the browser.

const MODEL = "claude-sonnet-4-6"; // change to claude-haiku-4-5-20251001 for lower cost

const ALLOWED_COLORS = ["Red","Orange","Yellow","Green","Blue","Purple","Pink",
  "Brown","Black","White","Gray","Gold","Multicolor"];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return resp(405, { error: "Method not allowed" });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return resp(500, { error: "ANTHROPIC_API_KEY is not set in Netlify environment variables." });

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch (e) { return resp(400, { error: "Invalid request body." }); }

  const image = body.image;            // { media_type, data(base64) }
  const details = body.details || {};  // any fields the artist already typed

  const system =
    "You are a senior gallery copywriter for a luxury fine-art gallery called Vermilion, " +
    "writing collector-facing catalogue copy for original works by the artist Barbara. " +
    "Write with restraint and warmth — refined, confident, specific, never flowery, clichéd, or salesy. " +
    "Be truthful to what is actually visible in the image and to the details provided. " +
    "Never invent biographical facts, awards, exhibitions, dates, materials, or provenance that you were not given. " +
    "If a detail is already provided, respect it rather than contradicting it. " +
    "Return ONLY a single valid JSON object, with no markdown fences and no text before or after it.";

  const userText =
    "Catalogue this artwork.\n\nKnown details (any may be blank):\n" +
    JSON.stringify(details, null, 2) +
    "\n\nReturn a JSON object with EXACTLY these keys:\n" +
    "titles: array of exactly 3 short, evocative title ideas (2-4 words each).\n" +
    "description: 2-3 sentences describing what the work is and how it reads on the wall.\n" +
    "story: 2-4 sentences of 'the story behind the work', grounded and non-fabricated.\n" +
    "inspiration: 1-3 sentences on the mood or artistic inspiration the piece suggests.\n" +
    "subject: one short label (e.g. Abstract, Landscape, Still Life, Figurative, Floral).\n" +
    "category: one short label (e.g. Painting, Sculpture, Relief, Mixed Media).\n" +
    "medium: a concise medium description (echo the provided one if present, else a careful guess from the image).\n" +
    "tags: array of 4-7 short lowercase keyword tags.\n" +
    "colors: array choosing ONLY from this exact list (the dominant colors you actually see): " +
    JSON.stringify(ALLOWED_COLORS) + ".\n" +
    "Output the JSON object only.";

  const content = [];
  if (image && image.data) {
    content.push({ type: "image", source: { type: "base64",
      media_type: image.media_type || "image/jpeg", data: image.data } });
  }
  content.push({ type: "text", text: userText });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 1300, system, messages: [{ role: "user", content }] })
    });
    const j = await r.json();
    if (!r.ok) return resp(r.status, { error: (j.error && j.error.message) || "Anthropic API error" });

    const text = (j.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    const clean = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    let data;
    try { data = JSON.parse(clean); }
    catch (e) { return resp(502, { error: "The model did not return valid JSON. Try again." }); }

    return resp(200, { ok: true, data });
  } catch (e) {
    return resp(500, { error: String((e && e.message) || e) });
  }
};

function resp(statusCode, obj) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(obj) };
}
