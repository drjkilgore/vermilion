// Vermilion — AI image studio (room staging + generative background)
// Calls OpenAI's image edit API. The artwork is protected by a mask, so the
// model only regenerates the area AROUND the piece. The OpenAI key lives ONLY
// here, read from the Netlify env var OPENAI_API_KEY — never in the browser.

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return resp(405, { error: "Method not allowed" });

  const key = process.env.OPENAI_API_KEY;
  if (!key) return resp(500, { error: "OPENAI_API_KEY is not set in Netlify environment variables." });

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch (e) { return resp(400, { error: "Invalid request body." }); }

  const { image, mask, prompt, size } = body;
  if (!image || !prompt) return resp(400, { error: "Missing image or prompt." });

  try {
    const form = new FormData();
    form.append("model", "gpt-image-1");
    form.append("image", new Blob([Buffer.from(image, "base64")], { type: "image/png" }), "image.png");
    if (mask) form.append("mask", new Blob([Buffer.from(mask, "base64")], { type: "image/png" }), "mask.png");
    form.append("prompt", prompt);
    form.append("size", size || "1024x1024");
    form.append("moderation", "low");
    form.append("n", "1");

    const r = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: "Bearer " + key },
      body: form
    });
    const j = await r.json();
    if (!r.ok) return resp(r.status, { error: (j.error && j.error.message) || "OpenAI API error" });

    const b64 = j.data && j.data[0] && j.data[0].b64_json;
    if (!b64) return resp(502, { error: "No image returned." });
    return resp(200, { ok: true, image: b64 });
  } catch (e) {
    return resp(500, { error: String((e && e.message) || e) });
  }
};

function resp(statusCode, obj) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(obj) };
}
