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
  shipping_json jsonb,
  card_id text,
  paypal_order_id text,
  capture_id text,
  paid_cents integer,
  refund_cents integer NOT NULL DEFAULT 0,
  refund_id text,
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
  amount_cents integer NOT NULL,
  status text NOT NULL,
  thank_you_note text
);

ALTER TABLE options ADD COLUMN IF NOT EXISTS turn integer NOT NULL DEFAULT 0;
ALTER TABLE options ADD COLUMN IF NOT EXISTS merchant text;
ALTER TABLE options ADD COLUMN IF NOT EXISTS selected boolean NOT NULL DEFAULT false;
ALTER TABLE options ADD COLUMN IF NOT EXISTS variants_json jsonb NOT NULL DEFAULT '[]';
ALTER TABLE options ADD COLUMN IF NOT EXISTS variant_choice_json jsonb NOT NULL DEFAULT '{}';
ALTER TABLE options ADD COLUMN IF NOT EXISTS images_json jsonb NOT NULL DEFAULT '[]';
ALTER TABLE options ADD COLUMN IF NOT EXISTS age_label text NOT NULL DEFAULT '';
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS shipping_json jsonb;
ALTER TABLE gifts DROP COLUMN IF EXISTS parent_contact;
ALTER TABLE gifts DROP COLUMN IF EXISTS approve_secret;
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS paypal_order_id text;
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS capture_id text;
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS paid_cents integer;
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS refund_cents integer NOT NULL DEFAULT 0;
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS refund_id text;
ALTER TABLE gifts DROP COLUMN IF EXISTS setup_token_id;
ALTER TABLE gifts DROP COLUMN IF EXISTS vault_id;
ALTER TABLE gifts DROP COLUMN IF EXISTS paypal_customer_id;
ALTER TABLE orders DROP COLUMN IF EXISTS paypal_order_id;
ALTER TABLE orders DROP COLUMN IF EXISTS capture_id;
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS card_id text;
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS skin text NOT NULL DEFAULT 'kraft';
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'any';
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS recipient_last_name text NOT NULL DEFAULT '';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS turn integer NOT NULL DEFAULT 0;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS suggestions_json jsonb NOT NULL DEFAULT '[]';
ALTER TABLE options ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE options ADD COLUMN IF NOT EXISTS wrap_json jsonb;
ALTER TABLE options ADD COLUMN IF NOT EXISTS cost_json jsonb;
UPDATE gifts g SET card_id = c.id FROM cards c WHERE c.current_gift_id = g.id AND g.card_id IS NULL;
UPDATE gifts SET status = 'draft' WHERE status IN ('saved', 'picked');
UPDATE gifts SET status = 'chosen' WHERE status = 'charged';
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
