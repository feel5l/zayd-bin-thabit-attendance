-- Device tokens issued by teacher-login / admin-login.
-- Only the SHA-256 hash is stored; the plaintext token stays on the client
-- (x-device-token header for submit-attendance / get-attendance).

CREATE TABLE IF NOT EXISTS device_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     TEXT NOT NULL REFERENCES schools(id),
  teacher_id    TEXT NOT NULL REFERENCES teachers(id),
  role          TEXT NOT NULL CHECK (role IN ('teacher', 'admin')),
  token_hash    TEXT NOT NULL UNIQUE,
  device_label  TEXT,
  revoked_at    TIMESTAMPTZ,
  last_seen_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_school_teacher
  ON device_tokens (school_id, teacher_id)
  WHERE revoked_at IS NULL;

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
