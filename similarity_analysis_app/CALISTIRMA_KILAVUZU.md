# LIFT UP — Proje Benzerlik Analizi Sistemi

## Çalıştırma ve Kullanım Kılavuzu

Bu doküman, LIFT UP Proje Benzerlik Analizi Sistemi'ni sıfırdan çalıştırmak isteyen takım arkadaşları için hazırlanmıştır.

---

## Sistem Nedir?

Kullanıcı bir proje fikri girer (başlık + özet + anahtar kelimeler), sistem bu fikri **SBERT dil modeli** ile vektöre dönüştürür ve **PostgreSQL + pgvector** veritabanındaki mevcut TÜBİTAK projelerinin vektörleriyle karşılaştırır. Sonuç olarak **en benzer 5 projeyi** benzerlik skorlarıyla birlikte listeler.

---

## Mimari Yapı

Sistem iki parçadan oluşur:

```
┌──────────────────────────────────────────────────────────────────┐
│                        KULLANICI (Tarayıcı)                      │
│                     http://127.0.0.1:3000                        │
│                                                                  │
│   Proje başlığı, özeti ve anahtar kelimeleri girer               │
│   "Analiz Et" butonuna tıklar                                   │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              │  POST /analyze
                              │  {title, abstract, keywords}
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI API Sunucusu)                │
│                     http://localhost:8000                         │
│                                                                  │
│   1. Metni temizler                                              │
│   2. SBERT modeli ile 384 boyutlu vektör üretir                  │
│   3. pgvector ile veritabanında benzerlik sorgusu yapar           │
│   4. En benzer 5 projeyi sınıflandırıp JSON olarak döndürür      │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              │  JSON Yanıt
                              │  {similar_projects[], classification}
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Arayüz)                         │
│                                                                  │
│   Sonuçları kart yapısında ekrana render eder:                    │
│   - 🟢 Yüksek Benzerlik (>= %75)                                │
│   - 🟡 Orta Benzerlik   (>= %50)                                │
│   - 🔴 Düşük Benzerlik  (<  %50)                                │
└──────────────────────────────────────────────────────────────────┘
```

**Kısacası:**
- **Backend** = Arka planda çalışan API sunucusu (veri işleme, model, veritabanı)
- **Frontend** = Kullanıcının gördüğü ve etkileşime girdiği arayüz

İkisi ayrı portlarda çalışır ve frontend, backend'e HTTP istekleri atarak iletişim kurar.

---

## Gereksinimler

Sistemi çalıştırmadan önce aşağıdakilerin kurulu olması gerekir:

| Araç | Açıklama |
|:---|:---|
| **Python 3.10+** | Backend için |
| **Node.js + npm** | Frontend dev server için (`npx` komutu) |
| **PostgreSQL** | Veritabanı (pgvector eklentisi kurulu olmalı) |

---

## Adım Adım Çalıştırma

### Adım 1 — Veritabanını Hazırla

PostgreSQL'de `liftup_db` veritabanının oluşturulmuş ve proje verilerinin yüklenmiş olması gerekir. Veritabanı bağlantı bilgileri `backend/.env` dosyasında tanımlıdır:

```
DB_NAME=liftup_db
DB_USER=postgres
DB_PASSWORD=12345
DB_HOST=localhost
DB_PORT=5432
```

> Kendi bilgisayarınızdaki PostgreSQL bilgilerine göre `.env` dosyasını düzenleyin.

---

### Adım 2 — Backend'i Çalıştır

Bir terminal açın ve aşağıdaki komutları sırayla çalıştırın:

```powershell
cd similarity_analysis_app\backend
python -m venv .venv
.venv\Scripts\Activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Terminalde şunları görmeniz gerekir:

```
SBERT modeli yukleniyor: paraphrase-multilingual-MiniLM-L12-v2
Model basariyla yuklendi.
PostgreSQL baglanti havuzu olusturuldu.
Sistem hazir!

INFO:     Uvicorn running on http://127.0.0.1:8000
```

> **Not:** İlk çalıştırmada SBERT modeli indirilir (~120 MB), bu birkaç dakika sürebilir. Sonraki çalıştırmalarda önbelleğe alınır.

**Doğrulama:** Tarayıcıda `http://localhost:8000/docs` adresine gidin. Swagger UI açılıyorsa backend çalışıyor demektir.

---

### Adım 3 — Frontend'i Çalıştır

**Yeni bir terminal** açın (backend terminalini kapatmayın!) ve şu komutları çalıştırın:

```powershell
cd similarity_analysis_app\frontend
npx -y http-server ./ -p 3000 -c-1 --cors
```

Terminalde şunu görmeniz gerekir:

```
Starting up http-server, serving ./
Available on:
  http://127.0.0.1:3000
```

---

### Adım 4 — Arayüzü Aç ve Kullan

Tarayıcıda şu adresi açın:

**👉 http://127.0.0.1:3000**

Arayüzde şunları göreceksiniz:
1. Sağ üst köşede **"Sistem hazır"** (yeşil nokta) yazısı — backend bağlantısı aktif
2. **Proje Başlığı** alanına projenizin başlığını yazın
3. **Proje Özeti** alanına projenizin özetini yazın
4. **Anahtar Kelimeler** alanına anahtar kelimeleri yazın
5. **"Analiz Et"** butonuna tıklayın
6. Birkaç saniye bekleyin (spinner dönecek)
7. Sonuçlar ekranda kart yapısında listelenecek

---

## Örnek Kullanım

Aşağıdaki bilgileri girerek test edebilirsiniz:

| Alan | Değer |
|:---|:---|
| **Başlık** | Hava Muharebesinde Otonom Savunma Algoritmasının Geliştirilmesi |
| **Özet** | Bu çalışma kapsamında, temel hava muharebesi manevraları kullanılarak birebir muharebeler için otonom savunma algoritması geliştirilmiştir. Algoritma, hedef hava aracı ile beklenmedik bir şekilde karşılaşıldığı durumlarda saldırı üstünlüğünün sağlanması için en uygun muharebe manevrasını seçmeyi sağlamaktadır. |
| **Anahtar Kelimeler** | bire-bir hava muharebesi, kural tabanlı yöntem, temel hava muharebe manevraları |

---

## Sık Karşılaşılan Sorunlar

| Sorun | Çözüm |
|:---|:---|
| Sağ üstte "Bağlantı yok" yazıyor | Backend çalışmıyor. Adım 2'yi tekrar kontrol edin. |
| "Analiz Et" sonrası hata çıkıyor | PostgreSQL servisi çalışıyor mu? `.env` bilgileri doğru mu? |
| `npx` komutu bulunamıyor | Node.js kurulu değil. nodejs.org'dan indirin. |
| Frontend sayfası açılmıyor | `http://127.0.0.1:3000` adresini kontrol edin. Port farklı olabilir. |
| SBERT modeli indirme hatası | İnternet bağlantınızı kontrol edin. İlk çalıştırmada model indirilir. |

---

## Port Özeti

| Port | Servis | Erişim |
|:---|:---|:---|
| `8000` | Backend API (FastAPI) | `http://localhost:8000` |
| `8000/docs` | Swagger UI (API Test) | `http://localhost:8000/docs` |
| `3000` | Frontend Arayüz | `http://127.0.0.1:3000` |
| `5432` | PostgreSQL Veritabanı | Sadece backend erişir |

---

## Klasör Yapısı

```
similarity_analysis_app/
│
├── backend/                          # API Sunucusu
│   ├── .env                          # Veritabanı ve model ayarları
│   ├── requirements.txt              # Python bağımlılıklar
│   ├── backend_guideline.md          # Backend teknik dokümanı
│   └── app/
│       ├── main.py                   # Uygulama giriş noktası
│       ├── api/routes/               # API endpoint'leri
│       ├── core/config.py            # Ayar yönetimi
│       ├── db/                       # Veritabanı katmanı
│       ├── services/                 # İş mantığı katmanı
│       ├── schemas/                  # Veri doğrulama şemaları
│       └── ml/model_loader.py        # SBERT model yönetimi
│
└── frontend/                         # Kullanıcı Arayüzü
    ├── index.html                    # Ana sayfa
    ├── frontend_guideline.md         # Frontend teknik dokümanı
    ├── css/styles.css                # Stiller
    ├── js/main.js                    # JavaScript mantığı
    └── assets/                       # Görseller
```
