module.exports = async (req, res) => {
  const origin = req.headers.origin || "";
  const allowed = new Set(["https://www.runweather.org", "https://runweather.org"]);

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Origin", allowed.has(origin) ? origin : "https://www.runweather.org");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).send("Use POST");

  const key = process.env.ORS_API_KEY;
  if (!key) return res.status(500).send("Missing ORS_API_KEY on server");

  let body = req.body;

  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).send("Bad JSON"); }
  }
  if (!body || typeof body !== "object") return res.status(400).send("Bad JSON");

  const coords = body.coordinates;
  const rt = body?.options?.round_trip;

  if (!Array.isArray(coords) || coords.length !== 1 || !Array.isArray(coords[0]) || coords[0].length !== 2) {
    return res.status(400).send("Invalid coordinates");
  }
  if (!rt || typeof rt.length !== "number" || typeof rt.points !== "number") {
    return res.status(400).send("Invalid round_trip");
  }
  if (rt.length < 500 || rt.length > 30000) return res.status(400).send("round_trip.length out of range");
  if (rt.points < 2 || rt.points > 6) return res.status(400).send("round_trip.points out of range");

  const orsRes = await fetch("https://api.openrouteservice.org/v2/directions/foot-walking/geojson", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": key },
    body: JSON.stringify(body),
  });

  const text = await orsRes.text();
  res.status(orsRes.status).setHeader("Content-Type", "application/json").send(text);
};
