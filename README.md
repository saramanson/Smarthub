# Smarthub

Family rewards, calendar, chores, supplies, expenses, and menu planning.

Source: https://github.com/saramanson/Smarthub (main).
Vercel project: smarthub in team lj-ff0c. Git pushes deploy through the linked Vercel project.
Neon project: shy-moon-41911951, supplied through the Vercel Marketplace integration.

## Development

Use Node 24, `npm ci`, `npm run dev`. Copy `.env.example` into `.env.local` and supply development branch credentials. Keep secrets out of Git. Run `npm run typecheck` and `npm run build`.

## Storage and access

The authenticated Next.js API stores module records as versioned JSONB documents in Neon. Database credentials stay on the server. Verified emails must appear in the server-only FAMILY_ALLOWED_EMAILS comma-separated allowlist. All approved members share this one family workspace. Concurrent stale writes are rejected instead of silently overwriting another device. A failed save pauses editing and offers backup export. Refresh to load another device's changes.

Schema: `db/001_family_documents.sql`. Test on an isolated Neon branch before production. The old Supabase schema is historical and unused.

## Moving old records

The original site uses browser-local storage. Visit `/migration` for the exporter and import the resulting JSON through the dashboard. Repeat on each device. Imports replace matching modules; retain backups and reconcile differing module versions before importing. Unsaved records cannot be recovered from closed pages. Migration is complete only after all source-device backups have been imported and checked.

## Deployment

Vercel builds main automatically. Use Git branches for review. Preview deployments require an isolated Neon database/auth branch and allowlisted auth origin before testing real data. Do not point previews at production family records.

Create an account, verify your email, and sign in. Configure custom SMTP in Neon for production password reset links. ChatGPT site sessions do not transfer.
