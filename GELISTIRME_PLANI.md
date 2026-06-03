# MSgrdrps — Kapsamlı Geliştirme Planı

## Mevcut Durum

**Stack:** React 19 + TypeScript + Vite 7 + Tailwind 4 + Express 5 + Vercel Blob  
**Platform:** Vercel (serverless API + static SPA) + local Express dev server  
**Boyut:** ~5500 satır frontend, ~550 satır Express server, ~700 satır API fonksiyonları

---

## 1. KRİTİK HATALAR (Çözüm Bekleyen)

| # | Sorun | Etki | Çözüm |
|---|-------|------|-------|
| 1 | **Senkronizasyon tek yönlü** — localStorage → API yazılır ama Express'te `/api/db` GET düzgün cache kırmıyor | Veri kaybı, PC-mobil tutarsızlığı | `api/db.js`'de CDN cache buster eklendi (test edildi ✅) |
| 2 | **Express server `/api/db` eksikti** — local'de yapılan değişiklikler hiçbir yere kaydolmuyordu | Local'de tüm veriler kayboluyor | Eklendi ✅ |
| 3 | **`allowOverwrite: true` eksik** — `@vercel/blob` v2'de aynı isimde dosya varsa PUT hata fırlatıyor | Blob'a yazma işlemi sessizce başarısız | Eklendi ✅ |
| 4 | **Frontend boş API verisini local'den üstün tutuyor** — `if(d.products)` `[]` için de truthy | API boş döndüğünde tüm ürünler kayboluyor | `?.length` kontrolü eklendi ✅ |
| 5 | **Admin şifresi hardcode** (`tanem123+`) | Güvenlik riski | `.env`'den okunmalı |

---

## 2. MİMARİ İYİLEŞTİRMELER (Yüksek Öncelik)

### 2.1 Veri Senkronizasyonu (Sync) — En Kritik
**Mevcut:** Her state değişiminde 2sn debounce'lu `POST /api/db` + localStorage
**Sorunlar:**
- `dataLoaded` flag'i init fetch'te `.finally()`'de set ediliyor → fetch başarısız olsa bile dataLoaded=true oluyor, ilk render'da boş veriyle sync tetikleniyor
- Sync sırasında `catch(()=>{})` — hatalar tamamen sessiz
- Birden çok sekme açıkken race condition: A sekmesi yazıyor, B sekmesi okuyor → üstüne yazma

**Öneri:**
```
dataLoaded → isLoading (boolean) + dataInitialized (boolean) + syncVersion (number)
- isLoading: ilk fetch sırasında true
- dataInitialized: veri başarıyla yüklendiğinde true (fail'de false kalır)
- syncVersion: her başarılı POST'ta artar, GET'te karşılaştırılır
```

### 2.2 State Management
**Mevcut:** Tek bir `StoreProvider`'da 30+ state değişkeni, 50+ fonksiyon
**Sorun:** Herhangi bir state değişimi tüm context consumer'ları re-render eder

**Öneri:** State'i mantıksal gruplara böl:
- `useProductStore` — ürünler
- `useCartStore` — sepet, siparişler
- `useAuthStore` — kullanıcı, giriş
- `useSocialStore` — yorumlar, mesajlar
- `useGamificationStore` — çark, kuponlar, ödüller

### 2.3 API /api/db — Veri Modeli
**Mevcut:** Tek bir `store.json` blob'unda 4 koleksiyon (products, reviews, settings, discounts)
**Sorun:** 
- Her değişimde 4 koleksiyon da tekrar yazılıyor (kota/performans)
- 4 koleksiyonun tamamını okumak için hepsini fetch ediyor

**Öneri:** Ayrı blob'lar:
- `products.json` / `reviews.json` / `settings.json` / `discounts.json`
- Sadece değişen koleksiyon yazılır
- GET'te paralel fetch

### 2.4 Hata Yönetimi
**Mevcut:** `catch(()=>{})` ile tüm hatalar sessizce yutuluyor
**Öneri:**
- Global error handler + toast notification
- Retry mekanizması (3 kez dene, aralıklı)
- Offline kuyruğu (değişiklikleri IndexedDB'de biriktir, online olunca sync et)

---

## 3. EKSİK ÖZELLİKLER

### 3.1 Gerçek Kullanıcı Kimlik Doğrulama
**Mevcut:** Basit email/password, localStorage'ta düz metin şifreler
**Yapılması gereken:**
- [ ] JWT tabanlı auth (access + refresh token)
- [ ] Şifre hash'leme (bcrypt)
- [ ] Auth endpoint'leri (`/api/auth/login`, `/api/auth/register`)
- [ ] Token'ı Blob'da değil, ayrı bir store'da veya HTTP-only cookie'de sakla
- [ ] Şifre sıfırlama

### 3.2 Ödeme Entegrasyonu
**Mevcut:** Gardrops'a yönlendirme
**Yapılması gereken:**
- [ ] Iyzico veya benzeri Türk ödeme sağlayıcısı entegrasyonu
- [ ] Sipariş → Ödeme → Stok düşme akışı
- [ ] Kargo takip numarası girişi
- [ ] Otomatik stok düşümü

### 3.3 Gerçek Yorum Sistemi
**Mevcut:** Fake/gardrops yorumları
**Yapılması gereken:**
- [ ] Kullanıcılar satın aldıktan sonra yorum yapabilmeli
- [ ] Doğrulama: "Bu ürünü satın aldı" rozeti
- [ ] Fotoğraflı yorum
- [ ] Puan ortalaması hesaplama

### 3.4 Bildirimler (Admin)
**Mevcut:** Sadece push notification (web-push)
**Yapılması gereken:**
- [ ] Yeni sipariş bildirimi (admin için)
- [ ] Yeni mesaj bildirimi
- [ ] Düşük stok uyarısı
- [ ] SMS / e-posta bildirimi

### 3.5 Dashboard Geliştirmeleri
**Mevcut:** Basit KPI kartları + bar chart
**Yapılması gereken:**
- [ ] Grafik kütüphanesi (Chart.js / Recharts)
- [ ] Satış grafikleri (günlük/haftalık/aylık)
- [ ] En çok satan ürünler
- [ ] Stok raporu
- [ ] Müşteri analizi

### 3.6 Veri Yedekleme / Export
**Mevcut:** Yok
**Yapılması gereken:**
- [ ] Admin panelinden JSON/CSV export
- [ ] Otomatik yedekleme (günlük Blob snapshot)
- [ ] Veri geri yükleme

---

## 4. PERFORMANS İYİLEŞTİRMELERİ

| # | İyileştirme | Etki |
|---|-------------|------|
| 1 | **Code splitting** — Admin.tsx (2501 satır) lazy load | İlk yükleme süresi ↓ %50 |
| 2 | **Görsel optimizasyonu** — WebP formatı, lazy loading, blur placeholder | Bant genişliği ↓ %70 |
| 3 | **React.memo + useMemo** — ProductCard, ProductDetailPanel | Re-render ↓ %80 |
| 4 | **Virtual scroll** — Ürün listesi 100+ ürün için | Scroll performansı |
| 5 | **Service worker** — API yanıtlarını da cache'le | Offline deneyim |
| 6 | **Debounce** — Arama input'u 300ms | Gereksiz fetch ↓ |
| 7 | **Bundle analizi** — `vite-plugin-inspect` ile boyut kontrolü | JS/CSS boyutu ↓ |

---

## 5. YENİ ÖZELLİKLER

### 5.1 Kısa Vadeli (1-2 Hafta)
- [ ] **Sipariş e-posta bildirimi** — Yeni siparişte admin'e e-posta
- [ ] **Stok uyarısı** — Düşük stokta ürünleri admin panelde vurgula
- [ ] **Toplu ürün silme** — Admin'de çoklu seç + sil
- [ ] **Ürün kopyalama** — Admin'de "Çoğalt" butonu
- [ ] **Sipariş notu** — Admin müşteri notu ekleyebilsin
- [ ] **Fatura numarası** — Siparişe fatura no girme

### 5.2 Orta Vadeli (2-4 Hafta)
- [ ] **Kupon paylaşma** — Kullanıcı kuponu başkasına gönderebilsin
- [ ] **Hediye çeki** — Admin belirli kullanıcılara hediye çeki göndersin
- [ ] **Ürün varyantları** — Beden/renk seçenekleri
- [ ] **Filtreleme geliştirmeleri** — Birden çok kategori, fiyat aralığı slider
- [ ] **Sosyal medya paylaşım linkleri** — Instagram, Pinterest
- [ ] **Google Analytics / Vercel Analytics** entegrasyonu

### 5.3 Uzun Vadeli (1-2 Ay)
- [ ] **Çoklu dil desteği** — i18n (Türkçe + İngilizce)
- [ ] **Karanlık mod**
- [ ] **Sepeti kaydetme** — Oturum kapansa bile sepetteki ürünler kalsın
- [ ] **Fiyat geçmişi grafiği** — Ürün detayında fiyat değişimi
- [ ] **Stok bildirimi** — Tükendiğinde "gelince haber ver" butonu
- [ ] **API rate limiting** — Gardrops scraping için
- [ ] **Docker** — Local geliştirme ortamı

---

## 6. GÜVENLİK

| # | Açık | Risk | Çözüm |
|---|------|------|-------|
| 1 | Admin şifresi hardcode | Yetkisiz erişim | `.env` → `ADMIN_PASSWORD` |
| 2 | Kullanıcı şifreleri düz metin localStorage | Veri sızıntısı | Hash'le + JWT |
| 3 | CORS `Access-Control-Allow-Origin: *` | Güvenlik açığı | Sadece gerekli domain'leri izin ver |
| 4 | Rate limiting yok | DDOS / abuse | Vercel WAF + rate limiting |
| 5 | Helmet.js yok | Güvenlik header'ları eksik | Express'e helmet ekle |
| 6 | Input validation yok (API) | NoSQL/JS injection | Zod/joi validation |
| 7 | `.env.local`'de OIDC token | Token sızıntısı | `.gitignore` zaten var ✅ |

---

## 7. TEST & CI/CD

| # | Yapılması Gereken |
|---|-------------------|
| 1 | **Unit test** — `vitest` ile store fonksiyonları, API yardımcıları |
| 2 | **API test** — Her endpoint için otomatik test |
| 3 | **E2E test** — Playwright ile kullanıcı akışları (ürün ekle, sepete at, sipariş ver) |
| 4 | **GitHub Actions** — Push'ta lint + test + build |
| 5 | **Preview deployments** — Her PR için Vercel preview |
| 6 | **Lint** — ESLint + Prettier |
| 7 | **TypeScript strict mode** — Eksik type'ları tamamla |

---

## 8. ÖNCELİK SIRASI

```
AŞAMA 1 (Bu Hafta) — Kararlılık
  □ Veri senkronizasyonu yeniden yaz (2.1)
  □ Hata yönetimi + toast bildirimleri (2.4)
  □ Admin şifresini .env'den oku (6.1)

AŞAMA 2 (Gelecek Hafta) — Performans
  □ Code splitting — Admin.tsx lazy load (4.1)
  □ React.memo + useMemo optimizasyonları (4.3)
  □ API /api/db koleksiyonları ayır (2.3)

AŞAMA 3 (3. Hafta) — Yeni Özellikler
  □ Gerçek kullanıcı auth (3.1)
  □ Sipariş e-posta bildirimi (5.1)
  □ Grafikler + dashboard (3.5)

AŞAMA 4 (4. Hafta) — Test & CI/CD
  □ Unit test + API test (7.1-7.2)
  □ GitHub Actions (7.4)
  □ E2E test (7.3)
```
