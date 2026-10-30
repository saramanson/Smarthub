import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import fs from 'node:fs';
const source = ts.transpileModule(fs.readFileSync('src/lib/cloud-storage.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const notices = [];
globalThis.window = { dispatchEvent: event => notices.push(event.detail) };
async function fresh() { return (await import('data:text/javascript;base64,' + Buffer.from(source + `\n// ${Math.random()}`).toString('base64'))).cloudStorage; }
test('queued writes use the latest version and preserve empty lists', async () => {
  const writes = []; globalThis.fetch = async (_url, options = {}) => {
    if (!options.method) return Response.json({ documents: [{ key: 'smart-home-events', value: [{ id: 'one' }], version: 7 }] });
    const body = JSON.parse(options.body); writes.push(body); return Response.json({ version: body.version + 1 });
  };
  const store = await fresh(); await store.load();
  store.setItem('smart-home-events', '[]'); store.setItem('smart-home-events', '[{"id":"two"}]'); await store.flush();
  assert.deepEqual(writes.map(w => w.version), [7, 8]); assert.deepEqual(writes[0].value, []); assert.equal(notices.at(-1), 'Saved to Neon');
});
test('conflicting writes stop saving and keep a recoverable backup', async () => {
  let writes = 0; globalThis.fetch = async (_url, options = {}) => {
    if (!options.method) return Response.json({ documents: [] });
    writes++; return Response.json({ error: 'Conflict' }, { status: 409 });
  };
  const store = await fresh(); await store.load(); store.setItem('smart-home-events', '[]'); store.setItem('smart-home-points', '{"children":[]}');
  await assert.rejects(store.flush(), /Conflict/); assert.equal(writes, 1); assert.deepEqual(store.backup()['smart-home-points'], { children: [] });
});
