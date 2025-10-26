# WealthWiseApp

WealthWiseApp adalah platform manajemen keuangan pribadi dan kolaboratif berbasis web yang memadukan pencatatan transaksi, otomatisasi, perencanaan tujuan, dan analitik cerdas dalam satu aplikasi. Proyek ini dibangun dengan **React + Vite** di sisi frontend dan **Express + Drizzle ORM** di sisi backend sehingga mudah dikembangkan, diuji, dan dideploy ke lingkungan server tradisional maupun serverless.

## Daftar Isi
- [Arsitektur](#arsitektur)
- [Prasyarat](#prasyarat)
- [Instalasi &amp; Setup Lokal](#instalasi--setup-lokal)
- [Konfigurasi Environment](#konfigurasi-environment)
- [Migrasi &amp; Seed Database](#migrasi--seed-database)
- [Perintah NPM Penting](#perintah-npm-penting)
- [Fitur Utama](#fitur-utama)
- [Struktur Proyek](#struktur-proyek)
- [Testing](#testing)
- [Build &amp; Deployment](#build--deployment)
- [Troubleshooting](#troubleshooting)
- [Lisensi](#lisensi)

## Arsitektur
- **Frontend**: React 18 dengan Vite, Tailwind CSS, Radix UI, TanStack Query, dan dukungan PWA (install prompt &amp; pull-to-refresh) untuk pengalaman pengguna modern.【F:client/src/App.tsx†L1-L111】【F:client/src/components/pwa-install-button.tsx†L1-L120】
- **Backend**: Express 4 yang merender API REST/JSON, logging request terintegrasi, serta mendukung mode development dengan Vite dev server atau mode produksi dengan file statis hasil build.【F:server/index.ts†L1-L63】
- **Database**: PostgreSQL melalui Drizzle ORM dengan konfigurasi siap pakai untuk Neon/Postgres serverless, termasuk fallback variabel Netlify.【F:drizzle.config.ts†L1-L18】【F:server/db.ts†L1-L18】
- **Serverless**: Tersedia handler Netlify Functions untuk menjalankan API yang sama di lingkungan serverless bila dibutuhkan.【F:netlify/functions/api.ts†L1-L80】

## Prasyarat
Pastikan tool berikut telah terpasang:
- **Node.js 18+** (disarankan Node 20 LTS).
- **npm** 9+ (mengikuti versi Node 20) atau package manager kompatibel.
- **PostgreSQL**/Neon database yang dapat diakses melalui `DATABASE_URL`.
- Akun OpenAI (opsional) bila ingin mengaktifkan fitur AI Smart Goal &amp; rekomendasi otomatis.

## Instalasi &amp; Setup Lokal
1. Klon repositori:
   ```bash
   git clone <url-repo-anda>
   cd WealthWiseApp
   ```
2. Install dependensi:
   ```bash
   npm install
   ```
3. Salin contoh environment dan sesuaikan:
   ```bash
   cp .env.example .env.local # jika Anda menyiapkan file contoh sendiri
   ```
   > Catatan: proyek ini tidak menyertakan file contoh. Silakan buat file `.env.local` mengikuti daftar variabel di bagian [Konfigurasi Environment](#konfigurasi-environment).
4. Jalankan aplikasi dalam mode pengembangan (server API + Vite dev server pada port 5000):
   ```bash
   npm run dev
   ```
5. Buka `http://localhost:5000` untuk mengakses aplikasi.

## Konfigurasi Environment
Buat file `.env`, `.env.local`, atau gunakan variable environment langsung pada shell/deployment. Variabel penting:

| Variabel | Wajib | Deskripsi |
| --- | --- | --- |
| `DATABASE_URL` | Ya | URL koneksi PostgreSQL/Neon untuk Drizzle &amp; backend.【F:server/db.ts†L1-L18】 |
| `NETLIFY_DATABASE_URL_UNPOOLED` | Opsional | Fallback otomatis saat deploy ke Netlify serverless.【F:server/db.ts†L8-L13】 |
| `JWT_SECRET` | Ya | Secret untuk menandatangani token JWT auth.【F:server/routes.ts†L36-L45】 |
| `SESSION_SECRET` | Disarankan | Secret untuk session Netlify Function/API serverless.【F:netlify/functions/api.ts†L10-L35】 |
| `OPENAI_API_KEY` | Opsional | Mengaktifkan AI Goals &amp; Smart Matching.【F:server/ai-goals-service.ts†L1-L18】【F:server/smart-goal-matcher-service.ts†L1-L36】 |

Tambahkan variabel lain sesuai kebutuhan (mis. integrasi pembayaran Stripe jika diaktifkan di masa depan).

## Migrasi &amp; Seed Database
Drizzle ORM menyimpan definisi skema di `shared/schema.ts` dan migrasi di folder `migrations`.

1. Pastikan `DATABASE_URL` valid.
2. Jalankan migrasi terbaru:
   ```bash
   npm run migrate
   ```
3. (Opsional) Dorong skema langsung ke database saat pengembangan:
   ```bash
   npm run db:push
   ```
4. Seed data dasar (roles, permissions, subscription packages, workspaces dummy, dsb.):
   ```bash
   npm run db:seed
   ```
   Seeder akan mereset tabel terkait lalu mengisi data peran/permission, paket langganan, user awal, dan workspace contoh dengan hash password menggunakan bcrypt.【F:server/enhanced-seeder.ts†L1-L98】
5. Untuk mengulangi seed dari kondisi bersih gunakan parameter `--reset`:
   ```bash
   npm run db:reset
   ```

## Perintah NPM Penting
| Perintah | Deskripsi |
| --- | --- |
| `npm run dev` | Menjalankan Express + Vite dev server dengan hot reload.【F:package.json†L7-L17】 |
| `npm run build` | Build frontend (Vite) dan fungsi Netlify (esbuild).【F:package.json†L11-L13】 |
| `npm run build:frontend` | Hanya build bundle frontend Vite.【F:package.json†L10-L12】 |
| `npm run build:functions` | Build handler Netlify Functions.【F:package.json†L10-L13】 |
| `npm run start` | Menjalankan server produksi dari hasil build (`dist/index.js`).【F:package.json†L13-L14】 |
| `npm run check` | Type-check keseluruhan project menggunakan TypeScript.【F:package.json†L14-L15】 |
| `npm test` | Menjalankan unit test dengan Vitest/Testing Library.【F:package.json†L15-L16】 |
| `npm run migrate` | Menjalankan migrasi database Drizzle.【F:package.json†L8-L9】 |
| `npm run db:push` | Sinkronisasi skema saat pengembangan cepat.【F:package.json†L16-L17】 |
| `npm run db:seed` | Seed data awal (lihat bagian migrasi).【F:package.json†L17-L18】 |
| `npm run db:reset` | Reset + seed ulang database (menjalankan seeder dengan flag `--reset`).【F:package.json†L18-L19】 |

## Fitur Utama
### Autentikasi &amp; Manajemen Pengguna
- Registrasi, login, logout dengan JWT + bcrypt, penyimpanan token di local storage, dan validasi session otomatis.【F:server/routes.ts†L1-L120】【F:client/src/lib/auth.tsx†L1-L120】
- Manajemen user, role, dan permission granular yang dikontrol lewat RBAC pada halaman admin.【F:client/src/pages/users.tsx†L1-L40】【F:client/src/pages/roles.tsx†L1-L60】【F:server/enhanced-seeder.ts†L37-L160】

### Workspace &amp; Kolaborasi
- Dukungan multi-workspace (personal &amp; shared) dengan batasan sesuai paket langganan serta selector workspace di sidebar.【F:client/src/components/layout/sidebar.tsx†L1-L160】【F:client/src/pages/collaboration.tsx†L1-L80】
- Layanan validasi batas anggota workspace yang membaca paket langganan aktif.【F:server/workspace-subscription-service.ts†L1-L58】

### Keuangan Inti
- Manajemen akun, kategori, transaksi (termasuk transfer &amp; debt repayment), budget, dan laporan/analitik berbasis chart.【F:client/src/pages/accounts.tsx†L1-L80】【F:client/src/pages/categories.tsx†L1-L90】【F:client/src/pages/transactions.tsx†L1-L120】【F:client/src/pages/budget.tsx†L1-L100】【F:client/src/pages/reports.tsx†L1-L80】【F:client/src/pages/analytics.tsx†L1-L80】
- Struktur skema PostgreSQL lengkap mencakup users, workspaces, subscriptions, budgets, debts, recurring transactions, goals, notifications, dsb.【F:shared/schema.ts†L1-L220】

### Otomasi &amp; Smart Features
- Automation Service mengeksekusi transaksi berulang, memperbarui progres goals, serta mengirim notifikasi keberhasilan/kegagalan.【F:server/automation-service.ts†L1-L120】
- AI Goals Service dan Smart Goal Matcher memanfaatkan OpenAI untuk rekomendasi dan tracking otomatis (opsional berdasarkan API key).【F:server/ai-goals-service.ts†L1-L60】【F:server/smart-goal-matcher-service.ts†L1-L80】
- Enhanced Goals page menggabungkan visualisasi progres, milestone, rekomendasi otomatis, dan notifikasi pintar berbasis workspace.【F:client/src/pages/enhanced-goals.tsx†L1-L140】

### Langganan &amp; Monetisasi
- Paket langganan personal &amp; shared dengan batas fitur, manajemen user subscription, serta workspace subscription validation di backend.【F:client/src/pages/subscription-packages.tsx†L1-L100】【F:client/src/pages/subscription.tsx†L1-L120】【F:server/workspace-subscription-service.ts†L1-L58】
- Halaman upgrade &amp; notifikasi untuk mendorong peningkatan paket.【F:client/src/pages/upgrade.tsx†L1-L60】【F:client/src/pages/notifications.tsx†L1-L80】

### Pengalaman Pengguna Modern
- Dashboard komprehensif dengan kartu ringkasan, grafik, dan quick actions.【F:client/src/pages/comprehensive-dashboard.tsx†L1-L160】
- Header adaptif dengan date range picker, sidebar responsif, tombol tambah transaksi/akun/debt, serta komponen PWA install &amp; pull-to-refresh untuk mobile.【F:client/src/components/layout/header.tsx†L1-L140】【F:client/src/components/modals/add-transaction-modal.tsx†L1-L120】【F:client/src/components/enhanced-pull-to-refresh.tsx†L1-L80】
- Tema Tailwind, Radix UI, dan utility class custom untuk tampilan konsisten.【F:tailwind.config.ts†L1-L40】【F:client/src/index.css†L1-L80】

## Struktur Proyek
```
WealthWiseApp/
├── client/              # Frontend React (Vite)
│   ├── src/
│   │   ├── components/  # UI reusable (sidebar, header, modals, forms, dll.)
│   │   ├── pages/       # Halaman utama aplikasi (dashboard, accounts, goals, ...)
│   │   ├── lib/         # utilitas auth, query client, permissions, notification service
│   │   └── types/       # Definisi TypeScript untuk entitas frontend
├── server/              # Backend Express, services, routes, dan integrasi Vite
│   ├── routes.ts        # Endpoint utama (auth, workspace, transaksi, goals, dsb.)
│   ├── automation-service.ts
│   ├── goals-service.ts &amp; smart-goal-matcher-service.ts
│   ├── ai-goals-service.ts
│   └── enhanced-seeder.ts
├── shared/              # Skema Drizzle ORM yang dipakai frontend &amp; backend
├── migrations/          # File migrasi SQL hasil generate Drizzle
├── netlify/             # Konfigurasi &amp; build helper untuk deployment Netlify
├── package.json         # Script &amp; dependencies
└── README.md            # Dokumentasi proyek ini
```

## Testing
Gunakan Vitest &amp; Testing Library untuk menguji komponen dan service.
```bash
npm test
```
Untuk memastikan type safety jalankan:
```bash
npm run check
```
Test dan type-check dapat digabung dalam pipeline CI sesuai kebutuhan.

## Build &amp; Deployment
- **Build produksi lokal**:
  ```bash
  npm run build
  npm run start
  ```
  Mode produksi akan menyajikan bundle Vite statis dan API Express pada port 5000 secara default.【F:server/index.ts†L43-L63】
- **Netlify**:
  - Gunakan `build-netlify.sh` atau workflow yang memanggil `npm run build`.
  - Pastikan environment Netlify berisi `DATABASE_URL`, `SESSION_SECRET`, `JWT_SECRET`, serta variabel tambahan lain yang diperlukan (lihat `NETLIFY_DEPLOYMENT.md`).
  - Folder `netlify/` berisi konfigurasi tambahan termasuk handler serverless (`netlify/functions/api.ts`).
- **Platform lain**: Anda dapat menjalankan `npm run start` pada server Node standar setelah menyiapkan variabel environment dan database.

## Troubleshooting
- **DATABASE_URL tidak ditemukan**: Server akan memunculkan error eksplisit dan berhenti agar tidak menjalankan aplikasi tanpa database.【F:server/db.ts†L8-L18】
- **JWT error / 401**: Pastikan `JWT_SECRET` konsisten antar server dan token tersimpan di local storage klien.【F:server/routes.ts†L36-L90】【F:client/src/lib/auth.tsx†L1-L120】
- **Fitur AI tidak aktif**: Set `OPENAI_API_KEY` sebelum menjalankan server; jika tidak, beberapa layanan AI akan menampilkan fallback log/warning.【F:server/ai-goals-service.ts†L1-L60】
- **Batas anggota workspace**: Lihat log `WorkspaceSubscriptionService` saat menambah anggota untuk mengetahui alasan penolakan.【F:server/workspace-subscription-service.ts†L1-L58】

## Lisensi
Proyek ini dirilis di bawah lisensi **MIT**. Silakan gunakan, modifikasi, dan distribusikan sesuai kebutuhan.
