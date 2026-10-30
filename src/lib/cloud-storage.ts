type Doc = { key: string; value: unknown; version: number };
const values = new Map<string, string>();
const versions = new Map<string, number>();
let queue = Promise.resolve();
let failure = '';
let pending = 0;
const notify = (message: string) => window.dispatchEvent(new CustomEvent('cloud-status', { detail: message }));
export const cloudStorage = {
  async load() {
    const response = await fetch('/api/data', { cache: 'no-store' });
    if (!response.ok) throw new Error((await response.json()).error || 'Unable to load family records.');
    const { documents } = await response.json();
    values.clear(); versions.clear(); failure = '';
    for (const doc of documents as Doc[]) { values.set(doc.key, JSON.stringify(doc.value)); versions.set(doc.key, doc.version); }
  },
  getItem(key: string) { return values.get(key) ?? null; },
  removeItem(_key: string) { /* Preserve invalid legacy records for backup and repair. */ },
  setItem(key: string, value: string) {
    if (values.get(key) === value) return;
    values.set(key, value);
    pending++; notify('Saving…');
    queue = queue.then(async () => {
      if (failure) throw new Error(failure);
      const response = await fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.parse(value), version: versions.get(key) ?? 0 }) });
      if (!response.ok) throw new Error((await response.json()).error || 'Unable to save. Export a backup before closing.');
      versions.set(key, (await response.json()).version);
      pending--; notify(pending ? 'Saving…' : 'Saved to Neon');
    }).catch(error => { failure = error.message; notify(`Save failed: ${failure}`); });
  },
  async flush() { await queue; if (failure) throw new Error(failure); },
  backup() { return Object.fromEntries([...values].map(([key, value]) => [key, JSON.parse(value)])); },
};
