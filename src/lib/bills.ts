export async function uploadBill(id: string, file: Blob) {
  if (file.size > 25 * 1024 * 1024) throw new Error('Bills must be 25 MB or smaller.');
  const count = Math.max(1, Math.ceil(file.size / (1024 * 1024)));
  for (let index = 0; index < count; index++) {
    const bytes = new Uint8Array(await file.slice(index * 1024 * 1024, (index + 1) * 1024 * 1024).arrayBuffer());
    let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
    const value = { data: btoa(binary), count, type: file.type };
    const key = `smart-home-bill-${id}-${index}`;
    const existing = await fetch(`/api/data?key=${key}`, { cache: 'no-store' });
    if (!existing.ok) throw new Error('Unable to check receipt storage.');
    const doc = (await existing.json()).documents[0];
    if (doc) {
      if (JSON.stringify(doc.value) !== JSON.stringify(value) && (doc.value.data !== value.data || doc.value.count !== count)) throw new Error('A different receipt already uses this ID.');
      continue;
    }
    const response = await fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value, version: 0 }) });
    if (!response.ok) throw new Error('Unable to upload receipt. Please retry.');
  }
}
export async function downloadBill(id: string): Promise<Blob | null> {
  const chunks: Uint8Array<ArrayBuffer>[] = []; let count = 1; let type = '';
  for (let index = 0; index < count; index++) {
    const response = await fetch(`/api/data?key=smart-home-bill-${id}-${index}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Unable to download receipt.');
    const doc = (await response.json()).documents[0];
    if (!doc) return null;
    count = doc.value.count; type = doc.value.type;
    chunks.push(Uint8Array.from(atob(doc.value.data), c => c.charCodeAt(0)));
  }
  return new Blob(chunks, { type });
}
