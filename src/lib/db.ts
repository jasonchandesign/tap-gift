import { Pool } from "pg";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS gifts (
  id uuid PRIMARY KEY,
  token text UNIQUE NOT NULL,
  delivery text NOT NULL DEFAULT 'link',
  giver_name text NOT NULL,
  recipient_name text NOT NULL,
  recipient_age integer NOT NULL,
  budget_cents integer NOT NULL,
  note text NOT NULL,
  rules_json jsonb NOT NULL,
  setup_token_id text,
  vault_id text,
  paypal_customer_id text,
  parent_contact text NOT NULL,
  approve_secret text NOT NULL,
  turns_used integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cards (
  id text PRIMARY KEY,
  current_gift_id uuid REFERENCES gifts(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id bigserial PRIMARY KEY,
  gift_id uuid NOT NULL REFERENCES gifts(id),
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS options (
  id bigserial PRIMARY KEY,
  gift_id uuid NOT NULL REFERENCES gifts(id),
  channel3_id text NOT NULL,
  title text NOT NULL,
  price_cents integer NOT NULL,
  image_url text,
  merchant_url text,
  reason text NOT NULL,
  rule_check_json jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY,
  gift_id uuid NOT NULL REFERENCES gifts(id),
  option_id bigint NOT NULL REFERENCES options(id),
  paypal_order_id text,
  capture_id text,
  amount_cents integer NOT NULL,
  status text NOT NULL,
  thank_you_note text
);
`;

type Db = {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
};

async function connect(): Promise<Db> {
  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(SCHEMA);
    return {
      query: async <T>(sql: string, params?: unknown[]) => {
        const result = await pool.query(sql, params);
        return { rows: result.rows as T[] };
      },
    };
  }

  // Local development only: an embedded Postgres, so no database install is needed.
  const { PGlite } = await import("@electric-sql/pglite");
  const lite = new PGlite(".pglite");
  await lite.exec(SCHEMA);
  return {
    query: async <T>(sql: string, params?: unknown[]) => {
      const result = await lite.query<T>(sql, params);
      return { rows: result.rows };
    },
  };
}

const store = globalThis as unknown as { tapGiftDb?: Promise<Db> };

export function db(): Promise<Db> {
  store.tapGiftDb ??= connect().catch((error) => {
    store.tapGiftDb = undefined;
    throw error;
  });
  return store.tapGiftDb;
}
