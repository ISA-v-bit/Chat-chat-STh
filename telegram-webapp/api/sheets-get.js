export default async function handler(req, res) {
  const { month, debug } = req.query;

  const API_URL = process.env.SHEETS_API_URL; // твой /exec из Apps Script

  try {
    const target = new URL(API_URL);
    if (month) target.searchParams.set('month', month);
    if (debug) target.searchParams.set('debug', debug);

    const resp = await fetch(target.toString());
    const data = await resp.json();

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
}
