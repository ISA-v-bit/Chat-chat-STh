export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const API_URL = process.env.SHEETS_API_URL; // твой /exec из Apps Script

  try {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await resp.json();

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
}
