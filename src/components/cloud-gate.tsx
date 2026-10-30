'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { downloadBill, uploadBill } from '@/lib/bills';
import { cloudStorage } from '@/lib/cloud-storage';
import { authClient } from '@/lib/auth/client';

export function CloudGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Loading family records…');
  const [error, setError] = useState('');
  useEffect(() => {
    cloudStorage.load().then(() => { setReady(true); setStatus('Connected to Neon'); }).catch(e => setError(e.message));
    const update = (event: Event) => setStatus((event as CustomEvent<string>).detail);
    window.addEventListener('cloud-status', update);
    return () => { window.removeEventListener('cloud-status', update); };
  }, []);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (status === 'Saving…' || status.startsWith('Save failed')) event.preventDefault(); };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [status]);
  async function backup() {
    const data = cloudStorage.backup();
    const bills = [];
    for (const expense of (data['smart-home-expenses'] || []) as { bill?: { id: string } }[]) {
      if (!expense.bill) continue;
      const file = await downloadBill(expense.bill.id);
      if (!file) continue;
      const encoded = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); });
      bills.push({ id: expense.bill.id, type: file.type, data: encoded });
    }
    data['smart-home-bills'] = bills;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'smarthub-backup.json'; a.click(); URL.revokeObjectURL(url);
  }
  async function restore(file?: File) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || Array.isArray(data) || typeof data !== 'object' || !Object.keys(data).length || Object.keys(data).some(k => !k.startsWith('smart-home-'))) throw new Error('Choose a Smarthub JSON backup.');
      if (!window.confirm('Import this backup? Matching modules will be replaced. Export the current backup first if you want to keep it.')) return;
      await cloudStorage.flush();
      for (const bill of data['smart-home-bills'] || []) await uploadBill(bill.id, new Blob([Uint8Array.from(atob(bill.data), c => c.charCodeAt(0))], { type: bill.type }));
      for (const [key, value] of Object.entries(data)) if (key !== 'smart-home-bills') cloudStorage.setItem(key, JSON.stringify(value));
      await cloudStorage.flush(); window.location.reload();
    } catch (e) { setStatus(`Save failed: ${(e as Error).message}`); }
  }
  if (!ready) return <main className="mx-auto max-w-xl space-y-5 p-10"><h1 className="text-2xl font-semibold">SMART - HOME</h1><p role="status">{error || status}</p>{error && <><Link className="underline" href="/sign-in">Sign in</Link><p>Use an approved family email and verify it before opening the dashboard.</p><button onClick={() => window.location.reload()}>Try again</button></>}</main>;
  return <><div className="flex flex-wrap items-center justify-end gap-4 bg-slate-900 px-4 py-2 text-xs text-white"><span role="status">{status}</span><button onClick={() => void backup().catch(e => setStatus(`Backup failed: ${e.message}`))}>Export backup</button><label className="cursor-pointer">Import backup<input className="sr-only" type="file" accept="application/json" onChange={e => void restore(e.target.files?.[0])} /></label><a href="/migration">Move old device records</a><button onClick={async () => { await cloudStorage.flush(); await authClient.signOut(); window.location.assign('/sign-in'); }}>Sign out</button></div>{status.startsWith('Save failed') ? <main className="p-10"><h1 className="text-xl">Your latest changes could not be saved</h1><p>{status}</p><p>Export a backup above before reloading. Editing is paused to protect your records.</p><button onClick={() => window.location.reload()}>Reload saved records</button></main> : children}</>;
}
