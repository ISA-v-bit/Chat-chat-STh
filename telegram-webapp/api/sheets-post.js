// api/sheets-post.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const API_URL = process.env.SHEETS_API_URL;
    if (!API_URL) return res.status(500).json({ ok:false, error:'SHEETS_API_URL is missing' });

    // передаём тело как JSON на Apps Script
    const r = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(req.body || {})
    });
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
}
