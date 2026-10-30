import { auth } from '@/lib/auth/server';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';
const keys = new Set(['events','points','menu-planner','expenses','chores','supplies','rewards','notifications','reward-sheet'].map(k => `smart-home-${k}`));
async function member() {
  const { data } = await auth.getSession();
  const user = data?.user;
  const allowed = (process.env.FAMILY_ALLOWED_EMAILS || '').toLowerCase().split(',').map(s => s.trim());
  return user?.email && user.emailVerified && allowed.includes(user.email.toLowerCase()) ? user : null;
}
export async function GET(request: Request) {
  if (!await member()) return Response.json({ error: 'Sign in with an approved, verified family email.' }, { status: 403 });
  const sql = neon(process.env.DATABASE_URL!);
  const key = new URL(request.url).searchParams.get('key');
  const rows = key
    ? await sql`SELECT key,value,version FROM smarthub_documents WHERE key=${key}`
    : await sql`SELECT key,value,version FROM smarthub_documents WHERE key NOT LIKE 'smart-home-bill-%'`;
  return Response.json({ documents: rows }, { headers: { 'Cache-Control': 'private, no-store' } });
}
export async function PUT(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  const user = await member();
  if (!user) return Response.json({ error: 'Access denied' }, { status: 403 });
  const raw = await request.text();
  if (raw.length > 4_000_000) return Response.json({ error: 'Record too large' }, { status: 413 });
  let body;
  try { body = JSON.parse(raw); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return Response.json({ error: 'Invalid record' }, { status: 400 });
  const { key, value, version } = body;
  if (!(keys.has(key) || /^smart-home-bill-[a-f0-9-]{36}-[0-9]{1,2}$/.test(key)) || value === undefined || !Number.isInteger(version) || version < 0) return Response.json({ error: 'Invalid record' }, { status: 400 });
  const sql = neon(process.env.DATABASE_URL!);
  const rows = version === 0
    ? await sql`INSERT INTO smarthub_documents (key,value,updated_by) VALUES (${key},${JSON.stringify(value)}::jsonb,${user.id}) ON CONFLICT DO NOTHING RETURNING version`
    : await sql`UPDATE smarthub_documents SET value=${JSON.stringify(value)}::jsonb, version=version+1, updated_by=${user.id}, updated_at=now() WHERE key=${key} AND version=${version} RETURNING version`;
  if (!rows.length) return Response.json({ error: 'Another device changed this record. Export your backup, then reload before editing again.' }, { status: 409 });
  return Response.json(rows[0]);
}
