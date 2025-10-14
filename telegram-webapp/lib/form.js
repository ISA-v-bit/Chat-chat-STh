export async function postJSON(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(await res.text().catch(()=>res.statusText));
  return res.json().catch(()=>({ok:true}));
}
