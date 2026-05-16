# Docker PostgreSQL — Hızlı Erişim Rehberi

## 1. Terminal ile (psql)

Proje klasöründe PowerShell aç:

```powershell
docker exec -it liftupprojectsimilarityanalysis-db-1 psql -U postgres -d liftup_db
```

## 2. Docker Desktop ile

`liftupprojectsimilarityanalysis-db-1` → **Exec** sekmesi → şunu yaz:

```bash
psql -U postgres -d liftup_db
```

## 3. DBeaver / pgAdmin ile

| Alan     | Değer      |
|----------|------------|
| Host     | localhost  |
| Port     | 5432       |
| Database | liftup_db  |
| User     | postgres   |
| Password | `.env` dosyandaki `DB_PASSWORD` değeri |

---

## Sık Kullanılan psql Komutları

```sql
\dt                          -- tabloları listele
\d projects                  -- tablo şemasını göster

-- silme
DELETE FROM projects WHERE id = 840;

SELECT COUNT(*) FROM projects;
SELECT COUNT(*) FROM admin_users;
SELECT COUNT(*) FROM emrecan_projects;
SELECT COUNT(*) FROM sbert_projects;

SELECT id, title_tr FROM projects LIMIT 5;

\q                           -- çıkış
```

---

## Container Yönetimi

```powershell
docker compose up db -d          -- sadece db'yi başlat
docker compose up --build        -- tüm servisleri başlat (build ile)
docker compose up -d             -- tüm servisleri arka planda başlat
docker compose down              -- durdur (veriler korunur)
docker compose down -v           -- durdur + volume SİL (veri kaybolur!)
docker compose ps                -- container durumlarını göster
```
