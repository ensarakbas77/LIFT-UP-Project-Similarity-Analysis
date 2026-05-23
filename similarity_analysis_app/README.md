# LIFT UP — Proje Benzerlik Analizi Uygulaması

**SBERT ve pgvector tabanlı semantik benzerlik analiz sistemi.**

Kullanıcının girdiği proje başlığı, özeti ve anahtar kelimelerini iki farklı dil modeli (SBERT ve Emrecan BERT) ile vektöre dönüştürür; PostgreSQL + pgvector üzerinde cosine similarity hesaplayarak veritabanındaki mevcut LIFT UP projelerine karşı benzerlik analizi yapar.

---

## Klasör Yapısı

```text
similarity_analysis_app/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI giriş noktası (lifespan, CORS, router)
│   │   ├── core/
│   │   │   └── config.py        # Ortam değişkenleri ve model/eşik konfigürasyonu
│   │   ├── api/routes/
│   │   │   ├── analyze.py       # POST /analyze endpoint'i
│   │   │   ├── health.py        # GET /health endpoint'i
│   │   │   ├── keywords.py      # POST /suggest-keywords endpoint'i
│   │   │   └── projects.py      # GET /projects/ endpoint'i
│   │   ├── db/
│   │   │   ├── session.py       # PostgreSQL bağlantı havuzu (psycopg2 pool)
│   │   │   └── queries.py       # pgvector cosine similarity sorguları
│   │   ├── ml/
│   │   │   └── model_loader.py  # SBERT ve Emrecan BERT model singleton'ları
│   │   ├── services/
│   │   │   ├── similarity_service.py  # Ana analiz iş mantığı
│   │   │   ├── embedding_service.py   # Ağırlıklı embedding üretimi
│   │   │   └── keyword_service.py     # Gemini API ile anahtar kelime önerisi
│   │   └── schemas/
│   │       ├── request_schema.py      # Pydantic istek modelleri
│   │       └── response_schema.py     # Pydantic yanıt modelleri
│   ├── .env.example
│   ├── requirements.txt
│   └── Dockerfile
│
└── frontend/
    ├── index.html               # Tek sayfalı uygulama (tabpanel layout)
    ├── js/main.js               # Tüm uygulama mantığı (Fetch API, state yönetimi)
    └── css/styles.css           # Design system (dark mode, TUSAŞ renk paleti)
```

---

## Teknoloji Stack'i

| Katman | Teknoloji |
|---|---|
| Web Framework | FastAPI 0.115 + Uvicorn 0.30 |
| ML Modeller | Sentence-Transformers 3.0, Transformers 4.57 |
| Veritabanı | PostgreSQL + pgvector (cosine similarity) |
| AI Özelliği | Google Gemini API (anahtar kelime önerisi) |
| Frontend | HTML5 + Vanilla JS (Fetch API) + CSS3 |
| Deployment | Docker (CPU-only PyTorch) |

---

## Kullanılan Modeller

| Model | Boyut | Kullanım |
|---|---|---|
| `paraphrase-multilingual-MiniLM-L12-v2` | 384 boyutlu | Birincil benzerlik analizi (SBERT) |
| `emrecan/bert-base-turkish-cased-mean-nli-stsb-tr` | 768 boyutlu | İkincil doğrulama (Türkçe BERT) |

Her iki model de uygulama başlangıcında RAM'e yüklenir ve tüm istekler boyunca tek örnek olarak tutulur.

---

## Embedding Üretimi

Kullanıcı girdisinden embedding şu ağırlıklarla üretilir:

| Alan | Ağırlık |
|---|---|
| Proje Başlığı | %20 |
| Proje Özeti | %70 |
| Anahtar Kelimeler | %10 |

Ağırlıklı toplam sonrası L2 normalizasyonu uygulanır. Aynı süreç her iki model için de bağımsız olarak çalışır.

---

## Benzerlik Seviyeleri

| Seviye | Skor Aralığı | Açıklama |
|---|---|---|
| Kritik | ≥ 0.90 | Potansiyel mükerrer kayıt |
| Yüksek | 0.70 – 0.89 | Yakın tematik bağlantı |
| Orta | 0.50 – 0.69 | Disiplin paralelliği |
| Düşük | 0.25 – 0.49 | Uzak tematik ilişki |
| Alakasız | < 0.25 | Anlamlı bağlantı yok |

---

## API Endpoint'leri

| Yöntem | Yol | Açıklama |
|---|---|---|
| POST | `/analyze` | Benzerlik analizi — `{title, abstract, keywords, top_k?}` alır |
| POST | `/suggest-keywords` | Gemini ile anahtar kelime önerisi — `{abstract}` alır |
| GET | `/projects/` | Veritabanındaki tüm projeleri listele |
| GET | `/health` | Model ve veritabanı durum kontrolü |
| GET | `/` | API bilgileri ve döküman bağlantıları |

İnteraktif API dokümantasyonu: **http://localhost:8000/docs**

---

## Ortam Değişkenleri

```powershell
Copy-Item similarity_analysis_app\backend\.env.example similarity_analysis_app\backend\.env
```

`.env` dosyasını açıp doldurun:

```env
# PostgreSQL
DB_NAME=liftup_db
DB_USER=postgres
DB_PASSWORD=veritabani_sifresi
DB_HOST=localhost        # Docker kullanıyorsanız: db
DB_PORT=5432

# Gemini API (opsiyonel — boş bırakılırsa anahtar kelime önerisi devre dışı kalır)
GEMINI_API_KEY=
```

> Gemini API anahtarı https://aistudio.google.com adresinden ücretsiz alınabilir.

---

## Çalıştırma

### Docker ile (Önerilen)

Tüm servisler birlikte ayağa kalkar. İlk başlatmada SBERT ve Emrecan BERT modelleri HuggingFace'ten indirilir (~500 MB), 5–10 dakika sürebilir. Sonraki başlatmalarda modeller önbellekten yüklenir.

Kurulum adımları için:  
**[DOCKER_SETUP.md](../DOCKER_SETUP.md)**

Uygulamaya **http://localhost:3000** adresinden erişilir.

### Yerel Geliştirme (.venv)

```powershell
cd similarity_analysis_app\backend
python -m venv .venv
.venv\Scripts\Activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend için ayrı bir sunucuya gerek yoktur; `frontend/` klasörünü tarayıcıdan doğrudan açabilir ya da nginx/live-server ile servis edebilirsiniz.

> `.env` dosyasında `DB_HOST=localhost` olarak ayarlayın.

---

## Analiz Akışı

```
Kullanıcı Girişi (başlık, özet, anahtar kelimeler)
  ↓
Frontend validasyonu
  ↓
POST /analyze
  ↓
  ├─ SBERT embedding üretimi (ağırlıklı, L2 normalize)
  ├─ pgvector cosine similarity → top-k benzer proje
  ├─ Emrecan BERT embedding üretimi
  ├─ Aynı projeler için Emrecan skorları hesaplama
  ├─ 5 seviyeli benzerlik sınıflandırması
  └─ AnalyzeResponse döndür
  ↓
Frontend: sonuç kartları, yıl filtresi, sıralama
```

## Anahtar Kelime Önerisi Akışı

```
Kullanıcı "AI Önerisi" butonuna tıklar (min 50 karakter özet)
  ↓
5 saniyelik cooldown kontrolü
  ↓
POST /suggest-keywords {abstract}
  ↓
Gemini Flash API → 5 Türkçe anahtar kelime (JSON array)
  ↓
Anahtar kelime alanı otomatik doldurulur
```

---

## Frontend Özellikleri

- **Benzerlik Analizi:** Form girişi, anlık validasyon, sonuç kartları
- **Filtre ve Sıralama:** Yıl filtresi, benzerlik skoru sıralaması (artan/azalan)
- **Top-K Güncelleme:** Yeni sorgu açmadan mevcut sonuçta sonuç sayısını değiştirme
- **Proje Geçmişi:** Veritabanındaki tüm projeleri sayfalı listele, ara ve filtrele (12 proje/sayfa)
- **Dark Mode:** `localStorage`'da saklanan tema tercihi
- **Responsive:** Masaüstü ve mobil uyumlu
