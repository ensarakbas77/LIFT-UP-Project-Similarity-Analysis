# LIFT UP — Frontend Guideline

**Proje Benzerlik Analizi — Kullanıcı Arayüzü**
HTML5 + CSS3 + Vanilla JavaScript (Fetch API)

---

## Klasor Yapisi

```
frontend/
│
├── index.html              # Ana sayfa (SPA — Single Page Application)
├── frontend_guideline.md   # Bu dosya
│
├── css/
│   └── styles.css          # Design system + tum bileşen stilleri
│
├── js/
│   └── main.js             # API iletisimi + DOM yonetimi + validasyon
│
└── assets/                 # Gorsel materyaller (ikonlar, resimler vb.)
```

---

## Neyin Ne Yaptigi

### `index.html`
Uygulamanin tek HTML sayfasi. SPA mantığında calisir. Bes ana bolum icerir:
- **Header:** Logo, baslik ve canlı sistem durumu gostergesi.
- **Hero Section:** Uygulama tanitim badge'i, baslik ve aciklama.
- **Form Section:** Proje basligi, ozeti ve anahtar kelimeleri icin giris alanlari + "Analiz Et" butonu.
- **Results Section:** Siniflandirma banner'i ve proje kartlari (gizli, analiz sonrasi gosterilir).
- **Error Section:** Hata mesajlari (gizli, hata durumunda gosterilir).
- **Footer:** Telif hakki ve teknoloji bilgisi.

### `css/styles.css`
Tum stilleri barindirir. Icerik sirasi:
1. **CSS Custom Properties (Design Tokens):** Renk paleti (Indigo/Violet), tipografi, spacing, golge, radius, transition.
2. **Reset & Base:** Tarayici varsayilanlarini sifirlar.
3. **Header:** Sticky header, glassmorphism (blur) efekti, sistem durum gostergesi.
4. **Hero:** Badge, baslik, gradient text efekti.
5. **Form:** Input/textarea stilleri, hata durumlari, karakter sayaci, submit butonu, loading spinner.
6. **Results:** Siniflandirma banner'i (high/medium/low renk kodlari), proje kartlari, skor badge'leri, benzerlik cubugu, genislet/daralt toggle.
7. **Error:** Hata gosterim kutusu, tekrar dene butonu.
8. **Footer:** Alt bilgi.
9. **Animations:** fadeInUp, spin, stagger delay.
10. **Responsive:** Tablet (768px), mobil (480px), print stilleri.

### `js/main.js`
Tum JavaScript mantigi tek dosyada. Ana bolumler:
1. **Configuration:** API base URL ve endpoint tanimlari (`/analyze`, `/health`).
2. **DOM Elements:** Tum HTML elemanlarinin referanslari.
3. **Character Counters:** Input alanlarina yazarken canli karakter sayaci gunceller.
4. **Form Validation:** Bos alan kontrolu, min/max karakter siniri, hata mesajlari.
5. **Form Submission:** `POST /analyze` istegi atar, loading durumunu yonetir.
6. **Results Rendering:** API yanitini parse eder, siniflandirma banner'ini ve proje kartlarini dinamik olarak olusturur.
7. **Error Handling:** HTTP hatalari ve ag baglantisi sorunlarini yakalar, kullaniciya gosterir.
8. **Action Buttons:** "Yeni Analiz" ve "Tekrar Dene" butonlari formu sifirlar.
9. **Health Check:** Sayfa yuklendiginde `GET /health` ile backend durumunu kontrol eder.
10. **Utilities:** XSS korumasi icin `escapeHtml()` fonksiyonu.

---

## Backend API Baglantisi

Frontend asagidaki endpoint'lerle iletisim kurar:

| Endpoint | Method | Istek | Yanit |
|:---|:---|:---|:---|
| `/analyze` | POST | `{title, abstract, keywords}` | `{similar_projects[], classification}` |
| `/health` | GET | — | `{status, model_loaded, database_connected}` |

**Siniflandirma Renk Kodlari:**
- 🟢 `high` (>= 0.75) — Yesil
- 🟡 `medium` (>= 0.50) — Turuncu
- 🔴 `low` (< 0.50) — Kirmizi

---

## Calistirma

```powershell
cd similarity_analysis_app\frontend
npx -y http-server ./ -p 3000 -c-1 --cors
```

Tarayicide ac: `http://127.0.0.1:3000`

> **Not:** Backend sunucusunun `http://localhost:8000` adresinde calisiyor olmasi gerekir.
