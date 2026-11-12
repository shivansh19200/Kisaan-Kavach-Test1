export const SCHEMA = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('BUYER', 'SELLER', 'ARBITER')),
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi', 'mr')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  buyer_id INTEGER NOT NULL REFERENCES users(id),
  seller_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN (
    'CREATED', 'AUTHORIZED', 'VERIFY_PENDING', 'AWAITING_APPROVAL', 'LAB_PASSED',
    'PARTIALLY_CAPTURED', 'DELIVERED', 'DISPUTED', 'REFUNDED', 'FULLY_CAPTURED',
    'REAUTH_NEEDED', 'EXPIRED', 'VOIDED'
  )) NOT NULL DEFAULT 'CREATED',
  contract_json TEXT NOT NULL,
  total_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  advance_pct INTEGER NOT NULL DEFAULT 30,
  batch_id TEXT,
  seal_id TEXT,
  lab_deadline TEXT,
  delivery_expected TEXT,
  dispute_deadline TEXT,
  demo_mode INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS authorizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  paypal_authorization_id TEXT UNIQUE NOT NULL,
  parent_id INTEGER REFERENCES authorizations(id),
  status TEXT NOT NULL CHECK (status IN ('CREATED', 'AUTHORIZED', 'CAPTURED', 'PARTIALLY_CAPTURED', 'VOIDED', 'EXPIRED', 'REAUTHORIZED')),
  create_time TEXT NOT NULL,
  expiration_time TEXT NOT NULL,
  honor_until TEXT,
  is_current INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_auth_order ON authorizations(order_id);
CREATE INDEX IF NOT EXISTS idx_auth_paypal ON authorizations(paypal_authorization_id);

CREATE TABLE IF NOT EXISTS captures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL CHECK (stage IN (1, 2)),
  request_id TEXT NOT NULL,
  paypal_capture_id TEXT UNIQUE,
  amount_minor INTEGER NOT NULL,
  final_capture INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'RECONCILING', 'REFUNDED')),
  raw_status TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (order_id, stage)
);

CREATE INDEX IF NOT EXISTS idx_captures_order ON captures(order_id);
CREATE INDEX IF NOT EXISTS idx_captures_request ON captures(request_id);

CREATE TABLE IF NOT EXISTS refunds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  n INTEGER NOT NULL DEFAULT 1,
  request_id TEXT NOT NULL,
  paypal_refund_id TEXT UNIQUE,
  amount_minor INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'RECONCILING')),
  raw_status TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (order_id, n)
);

CREATE INDEX IF NOT EXISTS idx_refunds_order ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_request ON refunds(request_id);

CREATE TABLE IF NOT EXISTS decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  file_sha256 TEXT NOT NULL,
  path TEXT NOT NULL CHECK (path IN ('SIGNED', 'UNSIGNED')),
  result TEXT NOT NULL CHECK (result IN ('PASS', 'FAIL', 'INCONCLUSIVE')),
  values_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (order_id, file_sha256)
);

CREATE INDEX IF NOT EXISTS idx_decisions_order ON decisions(order_id);

CREATE TABLE IF NOT EXISTS evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  file_sha256 TEXT NOT NULL,
  blob BLOB NOT NULL,
  frozen_at TEXT NOT NULL DEFAULT (datetime('now')),
  submitted_by INTEGER NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_evidence_order ON evidence(order_id);

CREATE TABLE IF NOT EXISTS seller_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_id INTEGER NOT NULL REFERENCES users(id),
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('ADVANCE', 'BALANCE', 'CLAWBACK')),
  amount_minor INTEGER NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ledger_seller ON seller_ledger(seller_id);
CREATE INDEX IF NOT EXISTS idx_ledger_order ON seller_ledger(order_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL DEFAULT (datetime('now')),
  actor TEXT NOT NULL,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  before TEXT,
  after TEXT,
  paypal_debug_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_order ON audit_log(order_id);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts);
`;

export const SEED_USERS = [
  { email: 'buyer@globalimports.com', password: 'demo1234', role: 'BUYER', language: 'en' },
  { email: 'seller.hindi@kisaankavach.demo', password: 'demo1234', role: 'SELLER', language: 'hi' },
  { email: 'seller.marathi@kisaankavach.demo', password: 'demo1234', role: 'SELLER', language: 'mr' },
  { email: 'arbiter@kisaankavach.org', password: 'demo1234', role: 'ARBITER', language: 'en' },
];

export function getSeedOrders(): Array<{
  buyer_email: string;
  seller_email: string;
  status: string;
  contract_json: string;
  total_minor: number;
  advance_pct: number;
  batch_id: string;
  seal_id?: string;
  lab_deadline?: string;
  delivery_expected?: string;
  dispute_deadline?: string;
  demo_mode: number;
}> {
  const now = new Date();
  const deadline = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const delivery = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
  const dispute = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const baseContract = {
    product: 'Organic Turmeric',
    quantity: '500 kg',
    price_per_kg_usd: 12.00,
    total_usd: 6000.00,
    advance_pct: 30,
    quality_limits: [
      { name: 'Moisture', max: 10.0, unit: '%' },
      { name: 'Curcumin', min: 3.0, unit: '%' },
      { name: 'Pesticide Residue', max: 0.01, unit: 'ppm' },
    ],
    lab_window_days: 14,
  };

  return [
    {
      buyer_email: 'buyer@globalimports.com',
      seller_email: 'seller.hindi@kisaankavach.demo',
      status: 'CREATED',
      contract_json: JSON.stringify(baseContract),
      total_minor: 600000,
      advance_pct: 30,
      batch_id: 'LOT-TUR-001',
      seal_id: 'SEAL-001',
      lab_deadline: deadline.toISOString(),
      delivery_expected: delivery.toISOString(),
      dispute_deadline: dispute.toISOString(),
      demo_mode: 1,
    },
    {
      buyer_email: 'buyer@globalimports.com',
      seller_email: 'seller.hindi@kisaankavach.demo',
      status: 'AUTHORIZED',
      contract_json: JSON.stringify(baseContract),
      total_minor: 600000,
      advance_pct: 30,
      batch_id: 'LOT-TUR-002',
      seal_id: 'SEAL-002',
      lab_deadline: deadline.toISOString(),
      delivery_expected: delivery.toISOString(),
      dispute_deadline: dispute.toISOString(),
      demo_mode: 1,
    },
    {
      buyer_email: 'buyer@globalimports.com',
      seller_email: 'seller.marathi@kisaankavach.demo',
      status: 'VERIFY_PENDING',
      contract_json: JSON.stringify(baseContract),
      total_minor: 600000,
      advance_pct: 30,
      batch_id: 'LOT-TUR-003',
      seal_id: 'SEAL-003',
      lab_deadline: deadline.toISOString(),
      delivery_expected: delivery.toISOString(),
      dispute_deadline: dispute.toISOString(),
      demo_mode: 1,
    },
    {
      buyer_email: 'buyer@globalimports.com',
      seller_email: 'seller.marathi@kisaankavach.demo',
      status: 'AWAITING_APPROVAL',
      contract_json: JSON.stringify(baseContract),
      total_minor: 600000,
      advance_pct: 30,
      batch_id: 'LOT-TUR-004',
      seal_id: 'SEAL-004',
      lab_deadline: deadline.toISOString(),
      delivery_expected: delivery.toISOString(),
      dispute_deadline: dispute.toISOString(),
      demo_mode: 1,
    },
    {
      buyer_email: 'buyer@globalimports.com',
      seller_email: 'seller.hindi@kisaankavach.demo',
      status: 'LAB_PASSED',
      contract_json: JSON.stringify(baseContract),
      total_minor: 600000,
      advance_pct: 30,
      batch_id: 'LOT-TUR-005',
      seal_id: 'SEAL-005',
      lab_deadline: deadline.toISOString(),
      delivery_expected: delivery.toISOString(),
      dispute_deadline: dispute.toISOString(),
      demo_mode: 1,
    },
    {
      buyer_email: 'buyer@globalimports.com',
      seller_email: 'seller.marathi@kisaankavach.demo',
      status: 'PARTIALLY_CAPTURED',
      contract_json: JSON.stringify(baseContract),
      total_minor: 600000,
      advance_pct: 30,
      batch_id: 'LOT-TUR-006',
      seal_id: 'SEAL-006',
      lab_deadline: deadline.toISOString(),
      delivery_expected: delivery.toISOString(),
      dispute_deadline: dispute.toISOString(),
      demo_mode: 1,
    },
    {
      buyer_email: 'buyer@globalimports.com',
      seller_email: 'seller.hindi@kisaankavach.demo',
      status: 'DELIVERED',
      contract_json: JSON.stringify(baseContract),
      total_minor: 600000,
      advance_pct: 30,
      batch_id: 'LOT-TUR-007',
      seal_id: 'SEAL-007',
      lab_deadline: deadline.toISOString(),
      delivery_expected: delivery.toISOString(),
      dispute_deadline: dispute.toISOString(),
      demo_mode: 1,
    },
    {
      buyer_email: 'buyer@globalimports.com',
      seller_email: 'seller.marathi@kisaankavach.demo',
      status: 'DISPUTED',
      contract_json: JSON.stringify(baseContract),
      total_minor: 600000,
      advance_pct: 30,
      batch_id: 'LOT-TUR-008',
      seal_id: 'SEAL-008',
      lab_deadline: deadline.toISOString(),
      delivery_expected: delivery.toISOString(),
      dispute_deadline: dispute.toISOString(),
      demo_mode: 1,
    },
    {
      buyer_email: 'buyer@globalimports.com',
      seller_email: 'seller.hindi@kisaankavach.demo',
      status: 'REFUNDED',
      contract_json: JSON.stringify(baseContract),
      total_minor: 600000,
      advance_pct: 30,
      batch_id: 'LOT-TUR-009',
      seal_id: 'SEAL-009',
      lab_deadline: deadline.toISOString(),
      delivery_expected: delivery.toISOString(),
      dispute_deadline: dispute.toISOString(),
      demo_mode: 1,
    },
    {
      buyer_email: 'buyer@globalimports.com',
      seller_email: 'seller.marathi@kisaankavach.demo',
      status: 'FULLY_CAPTURED',
      contract_json: JSON.stringify(baseContract),
      total_minor: 600000,
      advance_pct: 30,
      batch_id: 'LOT-TUR-010',
      seal_id: 'SEAL-010',
      lab_deadline: deadline.toISOString(),
      delivery_expected: delivery.toISOString(),
      dispute_deadline: dispute.toISOString(),
      demo_mode: 1,
    },
    {
      buyer_email: 'buyer@globalimports.com',
      seller_email: 'seller.hindi@kisaankavach.demo',
      status: 'REAUTH_NEEDED',
      contract_json: JSON.stringify(baseContract),
      total_minor: 600000,
      advance_pct: 30,
      batch_id: 'LOT-TUR-011',
      seal_id: 'SEAL-011',
      lab_deadline: deadline.toISOString(),
      delivery_expected: delivery.toISOString(),
      dispute_deadline: dispute.toISOString(),
      demo_mode: 1,
    },
    {
      buyer_email: 'buyer@globalimports.com',
      seller_email: 'seller.marathi@kisaankavach.demo',
      status: 'EXPIRED',
      contract_json: JSON.stringify(baseContract),
      total_minor: 600000,
      advance_pct: 30,
      batch_id: 'LOT-TUR-012',
      seal_id: 'SEAL-012',
      lab_deadline: deadline.toISOString(),
      delivery_expected: delivery.toISOString(),
      dispute_deadline: dispute.toISOString(),
      demo_mode: 1,
    },
    {
      buyer_email: 'buyer@globalimports.com',
      seller_email: 'seller.hindi@kisaankavach.demo',
      status: 'VOIDED',
      contract_json: JSON.stringify(baseContract),
      total_minor: 600000,
      advance_pct: 30,
      batch_id: 'LOT-TUR-013',
      seal_id: 'SEAL-013',
      lab_deadline: deadline.toISOString(),
      delivery_expected: delivery.toISOString(),
      dispute_deadline: dispute.toISOString(),
      demo_mode: 1,
    },
  ];
}