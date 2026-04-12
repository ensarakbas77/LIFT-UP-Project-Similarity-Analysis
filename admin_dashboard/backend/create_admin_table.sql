-- =============================================================
--  LIFT UP Admin Paneli — Admin Kullanıcı Tablosu
--  Veritabanı : liftup_db
--  Çalıştır   : psql -U postgres -d liftup_db -f create_admin_table.sql
--
--  NOT: Hash formatı pgcrypto bf (bcrypt $2a$) kullanır.
--       Python bcrypt kütüphanesi bu formatı destekler;
--       auth.py bcrypt.checkpw() ile doğrulama yapar.
-- =============================================================

-- pgcrypto uzantısı (bcrypt hash üretimi için)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Admin Kullanıcı Tablosu ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
    id            SERIAL        PRIMARY KEY,
    username      VARCHAR(64)   NOT NULL UNIQUE,
    email         VARCHAR(255)  NOT NULL UNIQUE,
    password_hash TEXT          NOT NULL,   -- bcrypt $2a$ hash (pgcrypto gen_salt('bf'))
    full_name     VARCHAR(128),
    is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    last_login    TIMESTAMPTZ
);

-- ─── İndeksler ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users (username);
CREATE INDEX IF NOT EXISTS idx_admin_users_email    ON admin_users (email);

-- ─── İlk Admin Kaydı ─────────────────────────────────────────────────────────
--  Kullanıcı adı : admin
--  Şifre         : admin123       ← buraya kendi şifrenizi girin
--  E-posta       : admin@gmail.com
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO admin_users (username, email, password_hash, full_name)
VALUES (
    'admin',
    'admin@gmail.com',
    crypt('admin123', gen_salt('bf', 12)),
    'LIFT UP Sistem Yöneticisi'
)
ON CONFLICT (username) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        email         = EXCLUDED.email;

-- ─── Doğrulama ────────────────────────────────────────────────────────────────
SELECT id, username, email, full_name, is_active, created_at
FROM   admin_users;
