// api/sheets-get.js
export default async function handler(req, res) {
  try {
    const API_URL = process.env.SHEETS_API_URL; // твой Apps Script /exec
    if (!API_URL) return res.status(500).json({ ok:false, error:'SHEETS_API_URL is missing' });

    const { month, debug } = req.query;
    const url = new URL(API_URL);
    if (month) url.searchParams.set('month', String(month));
    if (debug) url.searchParams.set('debug', String(debug));

    const r = await fetch(url.toString(), { method: 'GET' });
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
}
