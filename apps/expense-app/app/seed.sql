CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'editor'))
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id),
  updated_at TEXT NOT NULL
);

INSERT INTO users (id, username, password_hash, role) VALUES
  (1, 'viewer', 'viewer-fixture-salt:6e968489aa24fac57b35325192d7bce76cc22be23b676a25ff1eaf540686e881a7ee1684c837ae0cadc19186dfc8d7336b1c9395baaf34229f342e30fa660768', 'viewer'),
  (2, 'editor', 'editor-fixture-salt:b13e7722592f307a527874be175b69ad284e90b6c4cd4130f100ca9db72052049cf7d232b307bc8e939b4175b2aebf24f066418e4a64f343946b55f0c63e4cab', 'editor');

INSERT INTO expenses (id, title, category, amount_cents, created_by, updated_at) VALUES
  (1, 'Train to Pune', 'travel', 4250, 2, '2026-01-01T10:00:00.000Z'),
  (2, 'Team lunch', 'meals', 6840, 2, '2026-01-02T10:00:00.000Z'),
  (3, 'Notebooks', 'office', 1299, 2, '2026-01-03T10:00:00.000Z'),
  (4, 'Client taxi', 'travel', 1875, 2, '2026-01-04T10:00:00.000Z'),
  (5, 'Coffee with team', 'meals', 1560, 2, '2026-01-05T10:00:00.000Z'),
  (6, 'Printer paper', 'office', 2450, 2, '2026-01-06T10:00:00.000Z'),
  (7, 'Hotel booking', 'travel', 12400, 2, '2026-01-07T10:00:00.000Z'),
  (8, 'Project dinner', 'meals', 9325, 2, '2026-01-08T10:00:00.000Z');
