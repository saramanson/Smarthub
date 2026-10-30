CREATE TABLE IF NOT EXISTS smarthub_documents (
  key text PRIMARY KEY CHECK (key LIKE 'smart-home-%'),
  value jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  updated_by text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE smarthub_documents ENABLE ROW LEVEL SECURITY;
