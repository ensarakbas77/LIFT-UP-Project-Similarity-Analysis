# LIFT UP — Admin Dashboard

**FastAPI tabanlı admin paneli ve veri yönetim arayüzü**. 
Bu klasör, LIFT UP projesinin sistem yöneticilerine sağlanan özel araçları, kontrol panellerini (Dashboard) ve veri çıkartma işlemlerini (PDF → CSV) içerir. Ayrıca, projelerin ve sistemin temel yönetimi bu arayüz üzerinden sağlanır. Şık, duyarlı (responsive) bir arayüz ile güçlü bir backend altyapısını bir araya getirir.

---

## 🏗️ Mimari ve Genel Yapı

Sistem monolitik bir yapıda fakat katmanlı olarak tasarlanmıştır. Frontend (HTML/CSS/JS) ve Backend (FastAPI API) aynı sunucu (`uvicorn`) üzerinden servis edilir.

**Klasör Yapısı:**
```text
admin_dashboard/
├── backend/
│   ├── app/
│   │   ├── main.py              # Uygulama giriş noktası (startup & routing)
│   │   ├── api/                 # API endpoint'leri (auth.py, projects.py vb.)
│   │   ├── core/                # Konfigürasyon ve Güvenlik (.env değişkenleri)
│   │   └── services/            # PDF parsing ve CSV analizleri için iş mantığı katmanı
│   ├── .env                     # PostgeSQL, JWT Key ve API anahtarı ayarları
│   └── requirements.txt         # Gerekli Python paketleri
│
└── frontend/
    ├── dashboard/               # Yönetim Paneli ana sayfası
    ├── login/                   # JWT tabanlı Güvenli Giriş Ekranı
    ├── data-management/         # CSV veya tablolarla projelerin yönetildiği sayfa
    ├── pdf-extract/             # Akademik makale PDF veri ayrıştırıcısı arayüzü
    └── shared/                  # Ortak CSS ve JS (Tasarım Sistemi, Auth Guard vb.)
```

---

## 🛡️ Kimlik Doğrulama (Auth Sistemi)

Projede gelişmiş ve güvenli **JWT (JSON Web Token)** mekanizması kullanılmaktadır. 
- Admin şifreleri veritabanında (`admin_users` tablosu) **bcrypt** algoritmasıyla hashlenerek saklanır.
- Kullanıcı giriş yaptığında (Backend `/auth/login` endpoint'i) kısa ömürlü bir JWT döner ve istemcinin `localStorage` belleğine kaydedilir.
- Sayfalar arası geçişlerde Frontend tarafında tasarlanan özel **Auth Guard** sistemi, kullanıcının token süresini kontrol eder. Yetkisiz erişimleri anında Login sayfasına geri döndürerek sistemi korur.

---

## ⚙️ Kurulum & Çalıştırma Yönergesi

**1. Python Sanal Ortamını (Virtual Environment) Kurun**
Projenin bağımlılıklarını izole etmek için bir sanal ortam oluşturun:
```powershell
cd admin_dashboard\backend
python -m venv .venv
.venv\Scripts\Activate
pip install -r requirements.txt
```

**2. Çevresel Değişkenler (.env)**
`backend` klasöründe bulunan `.env` dosyanızı oluşturup veritabanı bağlantı detaylarınızı ve JWT ayarlarınızı belirtin:
```env
# Veritabanı
DB_NAME=liftup_db
DB_USER=postges_kullanicisi
DB_PASSWORD=veritabani_sifresi
DB_HOST=localhost
DB_PORT=5432

# Güvenlik (JWT)
JWT_SECRET=gizli_bir_anahtar_belirleyin
JWT_EXPIRE_MINUTES=480
```

**3. Uygulamanın Başlatılması**
Admin Dashboard ve Backend API'sini başlatmak için sanal ortamınız (virtual environment) aktifken `backend` dizininde aşağıdaki komutu çalıştırın:
```powershell
uvicorn app.main:app --reload --port 8001
```

Sisteminiz artık **`http://localhost:8001/`** adresi üzerinde başarıyla çalışıyor olacaktır! ✨

---

## 🔌 API Dokümantasyonu (Swagger UI)

FastAPI tarafından otomatik olarak oluşturulan ve anlık testler yapabileceğiniz interaktif API dokümantasyonuna uygulamanız çalışırken şu bağlantıdan ulaşabilirsiniz:  
👉 **[http://localhost:8001/docs](http://localhost:8001/docs)**
