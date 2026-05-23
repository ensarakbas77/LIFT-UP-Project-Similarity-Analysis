# LIFT UP — Docker Kurulum Rehberi

## Ön Koşullar

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) kurulu ve çalışıyor olmalı
- PostgreSQL 18 kurulu olmalı — **sadece veri taşıma (pg_dump) için gerekli**, Docker çalıştıktan sonra artık kullanılmaz

---

## docker-compose.yml Nedir, Ne İşe Yarar?

`docker-compose.yml`, projenin hangi container'larla çalışacağını tanımlayan ana konfigürasyon dosyasıdır. Bu projede **4 servis** tanımlıdır:

| Servis | Container | Port | Açıklama |
|---|---|---|---|
| `db` | `pgvector/pgvector:pg17` | 5432 | PostgreSQL + pgvector veritabanı |
| `similarity-backend` | Build edilir | 8000 | AI benzerlik analizi API |
| `similarity-frontend` | `nginx:alpine` | 3000 | Similarity App arayüzü (statik HTML) |
| `admin-backend` | Build edilir | 8001 | Admin paneli (API + arayüz bir arada) |

`docker compose up --build` bu 4 servisi aynı anda ayağa kaldırır. Servisler birbirine container adıyla bağlanır (örneğin backend'ler veritabanına `db:5432` üzerinden erişir).

---

## 1. Ortam Değişkenlerini Ayarla

Tüm `.env.example` dosyalarını kopyala:

```powershell
Copy-Item .env.example .env
Copy-Item similarity_analysis_app\backend\.env.example similarity_analysis_app\backend\.env
Copy-Item admin_dashboard\backend\.env.example admin_dashboard\backend\.env
```

### Kök `.env` — docker-compose için

Kök `.env` dosyasını aç ve `POSTGRES_PASSWORD` değerini belirle:

```
POSTGRES_PASSWORD=senin_şifren
```

### `similarity_analysis_app/backend/.env`

`DB_PASSWORD` değerini kök `.env`'deki `POSTGRES_PASSWORD` ile **aynı** yap.

Sadece şunu doldur:
```
GEMINI_API_KEY=...
```
> https://aistudio.google.com adresinden ücretsiz alınır.
> Boş bırakılırsa anahtar kelime önerisi çalışmaz, geri kalan her şey çalışır.

### `admin_dashboard/backend/.env`

`DB_PASSWORD` değerini kök `.env`'deki `POSTGRES_PASSWORD` ile **aynı** yap.

`ADMIN_API_KEY` ve `JWT_SECRET` için PowerShell'de üret:

```powershell
# ADMIN_API_KEY
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# JWT_SECRET
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(64))
```

Her komutun çıktısını kopyalayıp ilgili alana yapıştır.

> `DB_HOST=db` değerini **değiştirme** — Docker ağında postgres container'ına bu adla ulaşılır.

---

## 2. Sadece Postgres Container'ını Başlat

Proje klasöründe PowerShell aç ve çalıştır:

```powershell
docker compose up db -d
```

Hazır olmasını bekle:

```powershell
docker compose ps
```

`db` satırında `(healthy)` yazana kadar birkaç kez tekrarla (~10-15 saniye).

---

## 3. Veritabanını Yükle

### Senaryo A — `liftup_backup.sql` dosyası elimde var

```powershell
docker cp liftup_backup.sql liftup-db-1:/liftup_backup.sql

docker exec liftup-db-1 psql -U postgres -d liftup_db -f /liftup_backup.sql
```

---

### Senaryo B — `liftup_backup.sql` yok, bilgisayarımda PostgreSQL kurulu

Önce `pg_dump` komutunun nerede olduğunu bul.

**PostgreSQL varsayılan kurulum konumu (C: sürücüsü):**
```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -d liftup_db -f liftup_backup.sql
```

**PostgreSQL farklı sürücüye kurulduysa (örneğin D: sürücüsü):**
```powershell
& "D:\PostgreSQL\bin\pg_dump.exe" -U postgres -d liftup_db -f liftup_backup.sql
```

> Hangi konumda olduğundan emin değilsen PowerShell'de şunu çalıştır:
> ```powershell
> Get-Command pg_dump -ErrorAction SilentlyContinue
> ```
> Çıktı yoksa tam yolu elle belirtmen gerekir.

Şifre sorulursa PostgreSQL superuser şifreni gir.

Dump alındıktan sonra Docker'a yükle:

```powershell
docker cp liftup_backup.sql liftup-db-1:/liftup_backup.sql
docker exec liftup-db-1 psql -U postgres -d liftup_db -f /liftup_backup.sql
```

---

### Yükleme Doğrulama

```powershell
docker exec liftup-db-1 psql -U postgres -d liftup_db -c "\dt"
```

Beklenen çıktı:

```
 public | admin_users      | table | postgres
 public | emrecan_projects | table | postgres
 public | projects         | table | postgres
 public | sbert_projects   | table | postgres
```

```powershell
docker exec liftup-db-1 psql -U postgres -d liftup_db -c "SELECT COUNT(*) FROM projects;"
# 840 çıkması lazım
```

---

## 4. Tüm Servisleri Build Et ve Başlat

```powershell
docker compose up --build
```

İlk çalıştırmada SBERT ve Emrecan BERT modelleri HuggingFace'ten indirilir (~500MB), **5-10 dakika** sürebilir. Sonraki başlatmalarda modeller cache'den yüklenir, indirme olmaz.

Her şey hazır olunca terminalde şunu göreceksin:

```
admin-backend-1       | INFO:     Application startup complete.
similarity-backend-1  | Sistem hazir!
similarity-backend-1  | INFO:     Application startup complete.
```

---

## 5. Erişim Adresleri

| Servis | URL |
|---|---|
| Similarity Arayüzü | http://localhost:3000 |
| Admin Paneli | http://localhost:8001 |
| Similarity API Docs | http://localhost:8000/docs |
| Similarity API Health | http://localhost:8000/health |

---

## Sonraki Başlatmalar

İlk kurulumdan sonra her seferinde sadece:

```powershell
docker compose up -d
```

Rebuild gerekmez, modeller tekrar indirilmez.

---

## Sıfırdan Başlatma (Her Şeyi Sil)

```powershell
docker compose down --rmi all -v
```

Bu komut şunları siler:
- Tüm container'lar
- Tüm volume'lar (**veritabanı dahil — tüm veriler gider**)
- Build edilmiş imajlar

> ⚠️ Çalıştırmadan önce `liftup_backup.sql` dosyasının elinizde olduğundan emin ol.
> Yoksa önce Senaryo B'deki pg_dump adımını uygula.

Silme işleminden sonra **2. adımdan** başlayarak kurulumu tekrarla.

---

## Geliştirme Notları

| Değişiklik | Ne yapman gerekir |
|---|---|
| HTML / CSS / JS | Tarayıcıyı yenile |
| Python kodu | Uvicorn otomatik reload eder (~10-20 sn) |
| Yeni pip paketi eklendi | `docker compose up --build <servis-adı> -d` |
| Sadece admin-backend rebuild | `docker compose up --build admin-backend -d` |
| Sadece similarity-backend rebuild | `docker compose up --build similarity-backend -d` |
