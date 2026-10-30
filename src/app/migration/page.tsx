export default function Migration() {
  const exporter = `(async () => {
const records = Object.fromEntries(Object.keys(localStorage).filter(key => key.startsWith('smart-home-')).map(key => [key, JSON.parse(localStorage.getItem(key))]));
const request = indexedDB.open('smart-home-expense-bills', 1);
const db = await new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
records['smart-home-bills'] = [];
for (const expense of records['smart-home-expenses'] || []) {
  if (!expense.bill || !db.objectStoreNames.contains('bills')) continue;
  const read = db.transaction('bills', 'readonly').objectStore('bills').get(expense.bill.id);
  const file = await new Promise((resolve, reject) => { read.onsuccess = () => resolve(read.result); read.onerror = () => reject(read.error); });
  if (!file) { alert('Missing receipt: ' + expense.bill.name); continue; }
  const data = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result.split(',')[1]); r.onerror = reject; r.readAsDataURL(file); });
  records['smart-home-bills'].push({ id: expense.bill.id, type: file.type, data });
}
db.close();
const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([JSON.stringify(records, null, 2)], {type:'application/json'})); link.download = 'smarthub-old-device.json'; link.click();
})();`;

  return <main className="mx-auto max-w-3xl space-y-5 p-8"><h1 className="text-2xl font-semibold">Move records from your old device</h1><p>The old website stores records in this browser only. Repeat these steps on each device with records you need to preserve.</p><ol className="list-decimal space-y-3 pl-6"><li>Open the original Family Rewards site on the original device and browser.</li><li>Open the browser developer console. Review and run the export code below. It downloads the smart-home records without changing them.</li><li>Return to Smarthub, sign in, and choose Import backup. Import replaces matching modules; export a backup first. If devices contain different versions of the same module, keep both files and reconcile them before importing.</li></ol><pre className="overflow-auto whitespace-pre-wrap rounded-xl bg-slate-100 p-4 text-sm">{exporter}</pre><p>Records that were never saved by the original site cannot be recovered after the old page was closed. The exporter includes receipt files from the old browser database when they are available.</p><a className="underline" href="/">Back to dashboard</a></main>;
}
