# PostgreSQL pgvector Kurulum Rehberi (Windows)

Bu doküman, **PostgreSQL 18 (Windows)** üzerinde **pgvector 0.8.1** eklentisinin manuel kurulumunu adım adım anlatır. Kurulum tamamlandığında PostgreSQL, vektör tabanlı (embedding / semantik) arama ve analiz işlemlerini destekler hale gelir.

---

## 1. Gerekli Dosyayı İndir

Windows için derlenmiş pgvector paketini aşağıdaki bağlantıdan indir:

> [https://github.com/andreiramani/pgvector_pgsql_windows/releases/tag/0.8.1_18.0.2](https://github.com/andreiramani/pgvector_pgsql_windows/releases/tag/0.8.1_18.0.2)

İndirilecek dosya:

* **vector.v0.8.1-pg18.zip**

> ⚠️ Not: Bu paket PostgreSQL **18** sürümü içindir. Farklı bir PostgreSQL sürümü kullanıyorsan uyumlu paketi indirmen gerekir.

---

## 2. ZIP Dosyasını Aç

İndirdiğin **vector.v0.8.1-pg18.zip** dosyasını herhangi bir klasöre çıkart.

ZIP içeriğinde temel olarak şu klasörleri göreceksin:

* `lib`
* `share/extension`

Bu dosyalar PostgreSQL'in kurulu olduğu dizinlere manuel olarak kopyalanacaktır.

---

## 3. Dosyaları Doğru Klasörlere Kopyala

> ⚠️ Bu adımda **Yönetici (Administrator)** izni gerekebilir.

### 3.1 DLL Dosyasını Kopyala

ZIP içindeki:

```
lib/vector.dll
```

Dosyasını aşağıdaki dizine kopyala:

```
C:\Program Files\PostgreSQL\18\lib\
```

---

### 3.2 Extension Dosyalarını Kopyala

ZIP içindeki:

```
share/extension/
```

klasöründe bulunan **tüm dosyaları** (örnekler):

* `vector.control`
* `vector--0.8.1.sql`
* (varsa diğer `.sql` dosyaları)

Aşağıdaki dizine kopyala:

```
C:\Program Files\PostgreSQL\18\share\extension\
```

---

## 4. PostgreSQL Servisini Yeniden Başlat

Dosyalar kopyalandıktan sonra PostgreSQL servisinin yeniden başlatılması gerekir.

1. **Windows + R** → `services.msc` yaz ve Enter’a bas
2. Listeden **PostgreSQL 18** servisini bul
3. Sağ tık → **Yeniden Başlat (Restart)**

Bu işlem PostgreSQL’in yeni extension dosyalarını tanımasını sağlar.

---

## 5. pgvector Extension’ını Aktif Et

### 5.1 DBeaver (veya psql) Üzerinden Bağlan

* PostgreSQL veritabanına bağlan
* Boş bir SQL Editor aç

### 5.2 Extension Komutunu Çalıştır

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Eğer aşağıdaki mesajı görürsen:

```
Query executed successfully
```

🎉 **Kurulum başarıyla tamamlanmıştır.**

---

## 6. Kurulumu Doğrulama (Opsiyonel)

Kurulumun gerçekten aktif olduğunu kontrol etmek için:

```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

Sonuç dönüyorsa pgvector aktif demektir.

---

## 7. Sonuç

Bu noktadan sonra PostgreSQL veritabanın:

* `vector` veri tipini
* embedding saklamayı
* semantik benzerlik ve vektör aramalarını

desteklemeye hazırdır.

> 🚀 Artık PostgreSQL üzerinde modern **AI / NLP / RAG** senaryoları çalıştırabilirsin.

---

## Kaynaklar

* pgvector Windows build: [https://github.com/andreiramani/pgvector_pgsql_windows](https://github.com/andreiramani/pgvector_pgsql_windows)
* Resmi pgvector dokümantasyonu: [https://github.com/pgvector/pgvector](https://github.com/pgvector/pgvector)
