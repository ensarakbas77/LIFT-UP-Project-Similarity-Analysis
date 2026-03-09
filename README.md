<div align="center">

# 🚀 LIFT UP — Proje Benzerlik Analizi Sistemi

**Anlamsal Proje Benzerlik Analizi | SBERT + PostgreSQL + pgvector**

Kullanıcının girdiği proje fikrini, TUSAŞ LIFT UP programı kapsamındaki mevcut projelerle  
**yapay zeka tabanlı** semantik benzerlik analizi ile karşılaştıran tam yığın (full-stack) web uygulaması.

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

---

[Özellikler](#-özellikler) •
[Mimari](#-mimari-yapı) •
[Kurulum](#-kurulum) •
[Çalıştırma](#-çalıştırma) •
[Kullanım](#-kullanım)

</div>

---

## 📋 Özellikler

- 🔍 **Semantik Benzerlik Analizi** — SBERT dil modeli ile metin tabanlı vektörel karşılaştırma
- 🧠 **Çok Dilli Model** — `paraphrase-multilingual-MiniLM-L12-v2` modeli ile Türkçe metin desteği
- 🗄️ **pgvector Entegrasyonu** — PostgreSQL üzerinde yüksek performanslı vektör benzerlik sorgusu
- 📊 **Otomatik Sınıflandırma** — Benzerlik skoruna göre üç seviyeli renk kodlu sınıflandırma
- 🎨 **Modern Arayüz** — Glassmorphism efektli, responsive ve animasyonlu SPA tasarım
- ❤️ **Sağlık Kontrolü** — Backend bağlantı durumunu canlı izleyen sistem göstergesi
- 📓 **Deney Notebookları** — BERTurk, DistilBERT, SBERT model karşılaştırma notebookları

---

## 🏗️ Mimari Yapı

```
┌─────────────────────────────────────────────────────────────────────┐
│                      KULLANICI  (Tarayıcı)                          │
│                    http://127.0.0.1:3000                             │
│                                                                     │
│    Proje başlığı, özeti ve anahtar kelimeleri girer                  │
│    "Analiz Et" butonuna tıklar                                      │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              │  POST /analyze
                              │  {title, abstract, keywords}
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   BACKEND  (FastAPI — :8000)                         │
│                                                                     │
│   1. Metni temizler (küçük harf, özel karakter)                     │
│   2. SBERT modeli ile 384 boyutlu vektör üretir                     │
│   3. pgvector ile veritabanında cosine similarity sorgusu yapar      │
│   4. En benzer 5 projeyi sınıflandırıp JSON olarak döndürür         │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              │  SQL: embedding <=> query_vector
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│              POSTGRESQL + pgvector  (Veritabanı — :5432)             │
│                                                                     │
│   666 adet LIFT UP projesi + 384 boyutlu SBERT embedding vektörleri  │
└─────────────────────────────────────────────────────────────────────┘
```

**Sınıflandırma Renk Kodları:**

| Seviye | Koşul | Renk |
|:---|:---|:---|
| 🔴 **Çok Yüksek (Kritik)** | >= %90 | Kırmızı |
| 🟠 **Yüksek** | >= %70 | Turuncu |
| 🟡 **Orta** | >= %50 | Sarı |
| 🟢 **Düşük** | >= %25 | Yeşil |
| ⚪ **Alakasız** | < %25 | Gri |

---

## 📂 Proje Yapısı

```
LIFT UP Project Similarity Analysis/
│
├── README.md                              # Bu dosya
├── requirements.txt                       # Kök seviye Python bağımlılıkları
├── .gitignore                             # Git ignore kuralları
│
├── database/                              # Veritabanı modülü
│   ├── main.py                            # Pickle → PostgreSQL veri aktarım scripti
│   ├── terminal_similarity_example.py     # Terminal üzerinden benzerlik araması örneği
│   ├── example_scripts.sql                # Veritabanı oluşturma SQL referansı
│   ├── install_guideline.md               # pgvector kurulum rehberi (Windows)
│   ├── tusas_liftup_embeddings.pkl        # Önceden hesaplanmış embedding verileri (~3.7 MB)
│   ├── .env.example                       # Ortam değişkenleri şablonu
│   └── README.md                          # Database modülü detaylı dokümanı
│
├── notebooks/                             # Model deneme ve karşılaştırma notebookları
│   ├── SBERT.ipynb                        # ✅ Seçilen model — paraphrase-multilingual-MiniLM-L12-v2
│   ├── BERTurk.ipynb                      # BERTurk model denemeleri
│   ├── DistilBERT.ipynb                   # DistilBERT model denemeleri
│   └── Emrecan_BERT.ipynb                 # Emrecan BERT model denemeleri
│
└── similarity_analysis_app/               # Ana uygulama (Full-Stack)
    │
    ├── backend/                           # FastAPI API Sunucusu
    │   ├── .env                           # Veritabanı ve model ayarları
    │   ├── .env.example                   # Ortam değişkenleri şablonu
    │   ├── README.md                      # Backend teknik dokümanı
    │   └── app/
    │       ├── main.py                    # Uygulama giriş noktası (startup/shutdown)
    │       ├── api/routes/                # API endpoint'leri (analyze, health)
    │       ├── core/config.py             # .env ayar yönetimi
    │       ├── db/                        # PostgreSQL bağlantı havuzu + sorgu katmanı
    │       ├── services/                  # İş mantığı (embedding üretimi + benzerlik analizi)
    │       ├── schemas/                   # Pydantic istek/yanıt şemaları
    │       └── ml/model_loader.py         # SBERT model yükleme ve önbellekleme
    │
    └── frontend/                          # Kullanıcı Arayüzü (SPA)
        ├── index.html                     # Ana sayfa
        ├── frontend_guideline.md          # Frontend teknik dokümanı
        ├── css/styles.css                 # Design system + tüm bileşen stilleri
        ├── js/main.js                     # API iletişimi + DOM yönetimi + validasyon
        └── assets/                        # Görsel materyaller
```

---

## ⚙️ Gereksinimler

Sistemi çalıştırmadan önce aşağıdakilerin kurulu olması gerekir:

| Araç | Versiyon | Açıklama |
|:---|:---|:---|
| **Python** | 3.10+ | Backend API ve embedding işlemleri |
| **PostgreSQL** | 18+ | Veritabanı sunucusu |
| **pgvector** | 0.8.1+ | PostgreSQL vektör benzerlik eklentisi |
| **Node.js + npm** | — | Frontend geliştirme sunucusu (`npx`) |

> 📖 pgvector kurulumu için: [`database/install_guideline.md`](database/install_guideline.md)

---

## 🛠️ Kurulum

### 1. Repoyu Klonlayın

```bash
git clone https://github.com/ensarakbas77/LIFT-UP-Project-Similarity-Analysis.git
cd LIFT-UP-Project-Similarity-Analysis
```

### 2. Python Sanal Ortamını Oluşturun

```powershell
python -m venv .venv
```

### 3. Sanal Ortamı Aktif Edin

**Windows (PowerShell):**
```powershell
.venv\Scripts\Activate
```

**Windows (CMD):**
```cmd
.venv\Scripts\activate.bat
```

**macOS / Linux:**
```bash
source .venv/bin/activate
```

> ✅ Terminal satırının başında `(.venv)` ifadesini görüyorsanız sanal ortam aktif demektir.

### 4. Bağımlılıkları Yükleyin

```powershell
pip install -r requirements.txt
```

### 5. Veritabanını Hazırlayın

#### 5.1 — Veritabanını Oluşturun

PostgreSQL üzerinde (DBeaver, pgAdmin veya psql ile):

```sql
CREATE DATABASE liftup_db;
```

#### 5.2 — pgvector Extension'ını Aktif Edin

Oluşturulan veritabanına bağlanıp:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

#### 5.3 — Tabloyu Oluşturun

```sql
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    year VARCHAR(20),
    title_tr TEXT,
    abstract_tr TEXT,
    keywords_tr TEXT,
    combined_text TEXT,
    embedding vector(384)
);
```

#### 5.4 — Ortam Değişkenlerini Ayarlayın

`database/.env.example` dosyasını `database/.env` olarak kopyalayın ve kendi bilgilerinizi girin:

```bash
cp database/.env.example database/.env
```

```env
DB_NAME=liftup_db
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=5432
```

Aynı şekilde backend için de:

```bash
cp similarity_analysis_app/backend/.env.example similarity_analysis_app/backend/.env
```

> ⚠️ **Güvenlik:** `.env` dosyalarını asla Git'e eklemeyin. `.gitignore` dosyasında zaten tanımlıdır.

#### 5.5 — Verileri Aktarın (Migration)

```powershell
cd database
python main.py
```

Bu script, `tusas_liftup_embeddings.pkl` dosyasındaki **666 adet** proje kaydını `projects` tablosuna toplu olarak yükler.

> ⚠️ Script birden fazla çalıştırılırsa veriler tekrar eklenir. Gerekirse öncesinde:
> ```sql
> TRUNCATE TABLE projects RESTART IDENTITY;
> ```

---

## 🚀 Çalıştırma

> **ÖNEMLİ:** Backend ve frontend birer terminal sürecidir. Her kullanımda aşağıdaki iki adımı tekrar çalıştırmanız gerekir. Her iki terminal de açık kaldığı sürece sistem çalışmaya devam eder.

### 1. Backend'i Başlatın (Terminal 1)

```powershell
cd similarity_analysis_app\backend
.venv\Scripts\Activate           # Sanal ortam aktif değilse
pip install -r requirements.txt  # İlk seferde veya yeni paket eklendiğinde
uvicorn app.main:app --reload --port 8000
```

Terminalde aşağıdaki çıktıyı görmelisiniz:

```
SBERT modeli yukleniyor: paraphrase-multilingual-MiniLM-L12-v2
Model basariyla yuklendi.
PostgreSQL baglanti havuzu olusturuldu.
Sistem hazir!

INFO:     Uvicorn running on http://127.0.0.1:8000
```

> 💡 İlk çalıştırmada SBERT modeli indirilir (~120 MB), bu birkaç dakika sürebilir. Sonraki çalıştırmalarda önbellekten yüklenir.

**Doğrulama:** Tarayıcıda [http://localhost:8000/docs](http://localhost:8000/docs) açıldığında Swagger UI görüntülenmelidir.

### 2. Frontend'i Başlatın (Terminal 2)

Yeni bir terminal açın (backend terminalini **kapatmayın**):

```powershell
cd similarity_analysis_app\frontend
npx -y http-server ./ -p 3000 -c-1 --cors
```

Terminalde aşağıdaki çıktıyı görmelisiniz:

```
Starting up http-server, serving ./
Available on:
  http://127.0.0.1:3000
```

---

## 💻 Kullanım

**Tarayıcıda açın:** [http://127.0.0.1:3000](http://127.0.0.1:3000)

1. Sağ üst köşede **"Sistem hazır"** (yeşil nokta) yazısını doğrulayın
2. **Proje Başlığı** alanına projenizin başlığını yazın
3. **Proje Özeti** alanına projenizin özetini yazın
4. **Anahtar Kelimeler** alanına virgülle ayrılmış anahtar kelimeleri yazın
5. **"Analiz Et"** butonuna tıklayın
6. Sonuçlar kart yapısında, benzerlik skorlarıyla birlikte listelenecektir

### Örnek Test Verisi

| Alan | Değer |
|:---|:---|
| **Başlık** | Hava Muharebesinde Otonom Savunma Algoritmasının Geliştirilmesi |
| **Özet** | Bu çalışma kapsamında, temel hava muharebesi manevraları kullanılarak birebir muharebeler için otonom savunma algoritması geliştirilmiştir. Algoritma, hedef hava aracı ile beklenmedik bir şekilde karşılaşıldığı durumlarda saldırı üstünlüğünün sağlanması için en uygun muharebe manevrasını seçmeyi sağlamaktadır. |
| **Anahtar Kelimeler** | bire-bir hava muharebesi, kural tabanlı yöntem, temel hava muharebe manevraları |

---

## 🔌 API Referansı

| Endpoint | Method | İstek Gövdesi | Yanıt |
|:---|:---|:---|:---|
| `/analyze` | `POST` | `{ title, abstract, keywords }` | `{ similar_projects[], classification }` |
| `/health` | `GET` | — | `{ status, model_loaded, database_connected }` |

**Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🔧 Port Özeti

| Port | Servis | Adres |
|:---|:---|:---|
| `3000` | Frontend Arayüz | [http://127.0.0.1:3000](http://127.0.0.1:3000) |
| `8000` | Backend API (FastAPI) | [http://localhost:8000](http://localhost:8000) |
| `8000/docs` | Swagger UI (API Test) | [http://localhost:8000/docs](http://localhost:8000/docs) |
| `5432` | PostgreSQL Veritabanı | Sadece backend erişir |

---

## 🧰 Teknoloji Yığını

| Katman | Teknoloji | Açıklama |
|:---|:---|:---|
| **Frontend** | HTML5 + CSS3 + Vanilla JS | SPA, Fetch API ile backend iletişimi |
| **Backend** | FastAPI (Python) | Async REST API sunucusu |
| **AI Modeli** | Sentence-Transformers (SBERT) | `paraphrase-multilingual-MiniLM-L12-v2` — 384 boyutlu vektör |
| **Veritabanı** | PostgreSQL + pgvector | Cosine similarity ile vektörel arama |
| **Veri** | TUSAŞ LIFT UP Bildiri Kitapları | Önceden hesaplanmış embedding vektörleri |

---

## ❓ Sık Karşılaşılan Sorunlar

| Sorun | Çözüm |
|:---|:---|
| Sağ üstte **"Bağlantı yok"** yazıyor | Backend çalışmıyor. Backend terminalini kontrol edin. |
| "Analiz Et" sonrası hata çıkıyor | PostgreSQL servisi çalışıyor mu? `.env` bilgileri doğru mu? |
| `npx` komutu bulunamıyor | Node.js kurulu değil. [nodejs.org](https://nodejs.org) adresinden indirin. |
| Frontend sayfası açılmıyor | `http://127.0.0.1:3000` adresini kontrol edin. Port farklı olabilir. |
| SBERT modeli indirme hatası | İnternet bağlantınızı kontrol edin. İlk çalıştırmada model ~120 MB indirilir. |
| Migration'da duplicate veri oluştu | `TRUNCATE TABLE projects RESTART IDENTITY;` ile tabloyu temizleyin. |
| `(.venv)` terminal başında görünmüyor | Sanal ortam aktif değil. `.venv\Scripts\Activate` komutunu çalıştırın. |

---

## 📓 Notebooklar

`notebooks/` klasöründe farklı dil modellerinin karşılaştırma deneyleri bulunur:

| Notebook | Model | Açıklama |
|:---|:---|:---|
| `SBERT.ipynb` | paraphrase-multilingual-MiniLM-L12-v2 | ✅ **Seçilen model** — En iyi Türkçe performans |
| `BERTurk.ipynb` | BERTurk | Türkçe odaklı BERT varyantı |
| `DistilBERT.ipynb` | DistilBERT | Hafif BERT modeli |
| `Emrecan_BERT.ipynb` | Emrecan BERT | Alternatif Türkçe BERT modeli |

---

## 🔗 Kaynaklar

- [pgvector — GitHub](https://github.com/pgvector/pgvector)
- [Sentence-Transformers Dökümantasyonu](https://www.sbert.net/)
- [paraphrase-multilingual-MiniLM-L12-v2 — Hugging Face](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2)
- [FastAPI Dökümantasyonu](https://fastapi.tiangolo.com/)
- [PostgreSQL Dökümantasyonu](https://www.postgresql.org/docs/)

---

<div align="center">

**LIFT UP** — Semantik Proje Benzerlik Analizi Sistemi

</div>
