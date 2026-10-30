/* far-agent — data statis: daftar model cadangan, template, contoh rencana, preset */
const FENCE = "```";

const FALLBACK_MODELS = [
  { id: "anthropic/claude-3.7-sonnet", name: "Claude 3.7 Sonnet", inP: 3, outP: 15, ctx: 200000 },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", inP: 3, outP: 15, ctx: 200000 },
  { id: "openai/gpt-4o", name: "GPT-4o", inP: 2.5, outP: 10, ctx: 128000 },
  { id: "openai/gpt-4o-mini", name: "GPT-4o mini", inP: 0.15, outP: 0.6, ctx: 128000 },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", inP: 1.25, outP: 10, ctx: 1000000 },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", inP: 0.15, outP: 0.6, ctx: 1000000 },
  { id: "deepseek/deepseek-chat-v3.1", name: "DeepSeek V3.1", inP: 0.27, outP: 1.1, ctx: 163000 },
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1", inP: 0.55, outP: 2.19, ctx: 163000 },
  { id: "qwen/qwen-2.5-coder-32b-instruct", name: "Qwen 2.5 Coder 32B", inP: 0.2, outP: 0.2, ctx: 131000 },
  { id: "moonshotai/kimi-k2", name: "Kimi K2", inP: 0.6, outP: 2.5, ctx: 131000 },
];

/* Model Gemini API (Google AI Studio). Cadangan ketika offline/belum dimuat dari API */
const GEMINI_FALLBACK = [
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", ctx: 1000000, tag: "Cepat, disarankan" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", ctx: 2000000, tag: "Penalaran terbaik (PRD/SPEC)" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", ctx: 1000000, tag: "Stabil & responsif" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", ctx: 1000000, tag: "Paling hemat kuota" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", ctx: 2000000, tag: "Konteks raksasa" },
];

const AGENTS = {
  "Claude Code": { file: "CLAUDE.md", desc: "CLI agent resmi dari Anthropic untuk terminal" },
  "Cursor": { file: ".cursor/rules/project.mdc", desc: "IDE AI populer dengan dukungan rules berbasis MDC" },
  "Windsurf": { file: ".windsurfrules", desc: "Agentic IDE dari Codeium dengan aturan terstruktur" },
  "Codex / agent lain": { file: "AGENTS.md", desc: "Standar universal AGENTS.md untuk beragam AI agent" },
};

const CHAT_PERSONAS = {
  umum: { label: "Asisten umum", desc: "Solusi cepat & kode praktis", sys: "Kamu asisten yang membantu developer Indonesia. Jawab dalam bahasa yang dipakai pengguna, ringkas, solutif, dan jelas. Pakai Markdown dan blok kode bila perlu." },
  arsitek: { label: "Arsitek software", desc: "Desain sistem & skema data", sys: "Kamu arsitek software senior. Bantu memilih stack, merancang struktur data, API, dan arsitektur. Sebutkan trade-off secara jujur, beri rekomendasi tegas, dan contoh struktur folder atau skema bila relevan." },
  reviewer: { label: "Reviewer kode", desc: "Audit keamanan & bug", sys: "Kamu reviewer kode yang teliti. Cari bug, celah keamanan, masalah performa, dan kode yang sulit dirawat. Urutkan temuan dari yang paling berbahaya, beri potongan kode perbaikan." },
  debug: { label: "Teman debugging", desc: "Analisis error bertahap", sys: "Kamu ahli debugging. Minta pesan error dan potongan kode yang relevan bila belum ada. Jelaskan penyebab yang paling mungkin dulu, lalu langkah pengecekan berurutan, lalu perbaikannya." },
  prompt: { label: "Penulis prompt agent", desc: "Prompt spesifik Claude/Cursor", sys: "Kamu ahli menulis prompt untuk AI coding agent (Claude Code, Cursor, Codex). Ubah permintaan pengguna menjadi prompt yang spesifik: konteks, file yang disentuh, langkah, batasan, dan kriteria selesai." },
};

const QUICK_INSPIRATIONS = [
  "Aplikasi kasir warung kopi sederhana: catat menu, penjualan harian, cetak struk Bluetooth",
  "SaaS langganan gym & fitness dengan WhatsApp reminder dan payment Midtrans",
  "Aplikasi antrean online barbershop dengan notifikasi WhatsApp saat giliran tiba",
  "Bot AI Telegram asisten belanja cerdas dengan perbandingan harga produk UMKM",
  "Landing page modern jasa konsultan pajak & keuangan dengan kalkulator interaktif",
];

const DESIGN_PRESETS = [
  { label: "Landing page", text: "Landing page modern untuk jasa laundry kiloan premium di Bandung: hero dengan harga per kg, keunggulan, paket layanan kilat 4 jam, testimoni pelanggan, area layanan, dan tombol booking WhatsApp." },
  { label: "Dashboard admin", text: "Dashboard admin toko online UMKM: kartu ringkasan omzet hari ini, pesanan per status, grafik penjualan 7 hari, tabel pesanan terbaru, dan peringatan stok menipis." },
  { label: "Layar mobile", text: "Layar aplikasi mobile pencatat keuangan pribadi: total saldo bulan ini, kategori pengeluaran visual, daftar transaksi terbaru dengan ikon, dan floating action button tambah transaksi." },
  { label: "Form pendaftaran", text: "Halaman checkout & pendaftaran bootcamp coding online: data diri lengkap, pilihan paket kelas, jadwal belajar, metode pembayaran (QRIS, VA Bank), dan kartu ringkasan biaya." },
  { label: "Tabel harga SaaS", text: "Halaman pricing SaaS kasir cloud untuk UMKM: 3 paket langganan dalam Rupiah (Starter, Pro, Enterprise), toggle bulanan/tahunan diskon 20%, tabel fitur komparatif, dan FAQ." },
];

const DESIGN_STYLES = [
  "Bersih & minimalis",
  "Modern SaaS (Linear/Raycast style)",
  "Gelap & elegan (Dark luxury)",
  "Berani & berwarna",
  "Ramah & membulat (Neo-brutalism soft)",
  "Korporat rapi"
];

const BASE_RULES = [
  "Kerjakan satu task dari TASKS.md per sesi. Setelah selesai, centang task itu dan berhenti untuk direview.",
  "Baca file yang akan diubah sebelum mengedit. Jangan menulis ulang file utuh kalau cukup mengubah bagian kecil.",
  "Jangan menambah dependensi baru tanpa menyebutkan alasannya di ringkasan akhir.",
  "Simpan semua rahasia di .env dan perbarui .env.example setiap kali ada variabel baru. Jangan pernah commit .env.",
  "Jalankan lint, typecheck, dan tes yang relevan sebelum menyatakan task selesai.",
  "Kalau ada keputusan desain yang tidak tertulis di PRD/SPEC, tanyakan dulu, jangan menebak.",
];

const TEMPLATES = [
  {
    id: "saas", name: "SaaS Starter", cat: "Web app",
    blurb: "Aplikasi langganan lengkap dengan autentikasi, dashboard member, multi-tenant tim, dan pembayaran Midtrans.",
    stack: ["Next.js App Router", "TypeScript", "Supabase", "Tailwind CSS", "shadcn/ui", "Midtrans"],
    tree: ["app/", "  (marketing)/page.tsx", "  (auth)/login/page.tsx", "  (app)/dashboard/page.tsx", "  (app)/billing/page.tsx", "  api/webhooks/midtrans/route.ts", "components/ui/", "lib/", "  supabase/client.ts", "  supabase/server.ts", "  payments/midtrans.ts", "  validators/", "supabase/migrations/", ".env.example"],
    env: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "MIDTRANS_SERVER_KEY", "NEXT_PUBLIC_MIDTRANS_CLIENT_KEY", "MIDTRANS_IS_PRODUCTION"],
    cmds: ["npx create-next-app@latest nama-app --ts --tailwind --app --eslint", "npx shadcn@latest init", "npm i @supabase/supabase-js @supabase/ssr zod midtrans-client"],
    rules: ["Aktifkan Row Level Security di setiap tabel Supabase. Service role key hanya dipakai di route handler server.", "Validasi semua input server action dan route handler dengan zod.", "Verifikasi signature_key webhook Midtrans sebelum mengubah status langganan.", "Server Component secara default; pakai 'use client' hanya untuk komponen interaktif."],
    first: "auth (daftar, masuk, keluar) dan halaman dashboard kosong yang hanya bisa dibuka setelah login",
  },
  {
    id: "landing", name: "Landing Page Kilat", cat: "Website",
    blurb: "Situs statis super cepat untuk bisnis atau produk, skor Lighthouse 100, SEO otomatis, dan form kontak WhatsApp.",
    stack: ["Astro", "Tailwind CSS", "MDX", "Formspree", "Lucide Icons"],
    tree: ["src/", "  pages/index.astro", "  pages/blog/[slug].astro", "  components/Hero.astro", "  components/Pricing.astro", "  components/Faq.astro", "  content/blog/", "  layouts/Base.astro", "public/", "astro.config.mjs"],
    env: ["PUBLIC_FORM_ENDPOINT", "PUBLIC_WA_NUMBER"],
    cmds: ["npm create astro@latest nama-situs", "npx astro add tailwind mdx sitemap"],
    rules: ["Tanpa JavaScript di client kecuali benar-benar perlu (pakai island `client:visible`).", "Semua gambar lewat komponen <Image> Astro dengan alt yang deskriptif.", "Isi meta title, description, dan Open Graph di setiap halaman."],
    first: "layout dasar responsif, hero section, dan tombol kontak WhatsApp interaktif",
  },
  {
    id: "dashboard", name: "Dashboard Admin", cat: "Web app",
    blurb: "Panel admin Single Page Application dengan filter dinamis, tabel sorting, chart performa, dan modal CRUD.",
    stack: ["React", "Vite", "TypeScript", "TanStack Query", "TanStack Table", "shadcn/ui", "Recharts"],
    tree: ["src/", "  routes/", "  features/orders/", "    api.ts", "    columns.tsx", "    OrdersPage.tsx", "  features/products/", "  components/ui/", "  lib/http.ts", "  lib/format.ts", "  main.tsx", "index.html"],
    env: ["VITE_API_BASE_URL"],
    cmds: ["npm create vite@latest nama-dashboard -- --template react-ts", "npm i @tanstack/react-query @tanstack/react-table recharts zod", "npx shadcn@latest init"],
    rules: ["Kelompokkan kode per fitur di src/features/<fitur>/.", "Semua pemanggilan API lewat lib/http.ts dan TanStack Query, jangan fetch di komponen.", "Format Rupiah dan tanggal hanya lewat lib/format.ts (Intl, locale id-ID)."],
    first: "layout sidebar navigasi, halaman pesanan dengan tabel dan filter status memakai data dummy",
  },
  {
    id: "api", name: "REST API Ringan", cat: "Backend",
    blurb: "API cepat & modular dengan validasi type-safe, JWT token authentication, rate limit, dan database migration.",
    stack: ["Hono", "TypeScript", "Drizzle ORM", "PostgreSQL", "Zod", "Vitest"],
    tree: ["src/", "  index.ts", "  routes/auth.ts", "  routes/items.ts", "  db/schema.ts", "  db/client.ts", "  middleware/auth.ts", "  lib/errors.ts", "drizzle/", "drizzle.config.ts", "tests/"],
    env: ["DATABASE_URL", "JWT_SECRET", "PORT"],
    cmds: ["npm create hono@latest nama-api", "npm i drizzle-orm pg zod @hono/zod-validator", "npm i -D drizzle-kit vitest"],
    rules: ["Setiap route memakai zValidator untuk body, query, dan params.", "Semua error lewat lib/errors.ts dengan format { error: { code, message } }.", "Setiap perubahan skema lewat migrasi drizzle-kit, jangan ubah database manual.", "Tulis tes Vitest untuk setiap endpoint baru."],
    first: "endpoint health check, skema tabel users, dan register/login dengan JWT",
  },
  {
    id: "toko", name: "Toko Online UMKM", cat: "Web app",
    blurb: "Katalog produk interaktif, keranjang belanja lokal, opsi checkout otomatis Xendit atau pesan langsung via WhatsApp.",
    stack: ["Next.js App Router", "Supabase", "Tailwind CSS", "Xendit", "WhatsApp link"],
    tree: ["app/", "  page.tsx", "  produk/[slug]/page.tsx", "  keranjang/page.tsx", "  checkout/page.tsx", "  admin/produk/page.tsx", "  api/webhooks/xendit/route.ts", "lib/cart.ts", "lib/ongkir.ts", "lib/supabase/", "supabase/migrations/"],
    env: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "XENDIT_SECRET_KEY", "XENDIT_CALLBACK_TOKEN", "NEXT_PUBLIC_WA_NUMBER"],
    cmds: ["npx create-next-app@latest nama-toko --ts --tailwind --app", "npm i @supabase/supabase-js @supabase/ssr zod xendit-node"],
    rules: ["Harga disimpan sebagai integer Rupiah, jangan float.", "Stok dikurangi di server saat pembayaran lunas (webhook), bukan saat checkout.", "Cocokkan header x-callback-token Xendit sebelum memproses webhook.", "Tombol WhatsApp memakai wa.me dengan pesan berisi ringkasan pesanan."],
    first: "skema produk di Supabase, halaman katalog produk, dan halaman detail produk",
  },
  {
    id: "mobile", name: "Aplikasi Mobile", cat: "Mobile",
    blurb: "Aplikasi Android dan iOS dari satu codebase, navigasi tab modern, offline-first sync, dan autentikasi aman.",
    stack: ["Expo", "React Native", "TypeScript", "Expo Router", "Supabase", "NativeWind"],
    tree: ["app/", "  (tabs)/index.tsx", "  (tabs)/profil.tsx", "  (auth)/masuk.tsx", "  _layout.tsx", "components/", "lib/supabase.ts", "lib/storage.ts", "assets/", "app.json"],
    env: ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY"],
    cmds: ["npx create-expo-app@latest nama-app", "npx expo install @supabase/supabase-js @react-native-async-storage/async-storage nativewind"],
    rules: ["Navigasi hanya lewat Expo Router (berbasis file).", "Sesi Supabase disimpan di AsyncStorage melalui lib/storage.ts.", "Uji setiap layar di ukuran layar kecil (360dp) dan mode gelap."],
    first: "navigasi bottom tab, layar login, dan layar beranda yang menampilkan data profil pengguna",
  },
  {
    id: "bot", name: "Bot AI Telegram", cat: "Bot",
    blurb: "Bot Telegram pintar dengan pemanggilan AI multi-model, manajemen memori percakapan berbasis SQLite, dan command handler.",
    stack: ["Node.js", "TypeScript", "grammY", "OpenRouter", "SQLite"],
    tree: ["src/", "  bot.ts", "  handlers/start.ts", "  handlers/message.ts", "  ai/openrouter.ts", "  db/history.ts", "  config.ts", "data/", "Dockerfile"],
    env: ["TELEGRAM_BOT_TOKEN", "OPENROUTER_API_KEY", "OPENROUTER_MODEL", "ALLOWED_USER_IDS"],
    cmds: ["npm init -y && npm i grammy better-sqlite3 dotenv", "npm i -D typescript tsx @types/node @types/better-sqlite3"],
    rules: ["Batasi riwayat percakapan yang dikirim ke model (misalnya 20 pesan terakhir) agar hemat token.", "Tangani error API AI dengan pesan ramah ke pengguna, jangan biarkan bot crash.", "Batasi akses lewat ALLOWED_USER_IDS kalau bot bersifat pribadi."],
    first: "perintah /start dan balasan AI sederhana tanpa memori",
  },
  {
    id: "ext", name: "Ekstensi Chrome", cat: "Lainnya",
    blurb: "Ekstensi browser Manifest V3 modern dengan popup interaktif, content script injector, dan sinkronisasi chrome.storage.",
    stack: ["WXT", "TypeScript", "React", "Tailwind CSS", "Manifest V3"],
    tree: ["entrypoints/", "  popup/App.tsx", "  content.ts", "  background.ts", "  options/App.tsx", "components/", "utils/storage.ts", "wxt.config.ts"],
    env: [],
    cmds: ["npx wxt@latest init nama-ekstensi", "npm i -D tailwindcss"],
    rules: ["Minta izin (permissions) seminimal mungkin di wxt.config.ts.", "Simpan pengaturan lewat utils/storage.ts (chrome.storage.sync).", "Content script tidak boleh memuat skrip dari domain luar."],
    first: "popup dengan satu tombol yang membaca dan memanipulasi konten halaman aktif",
  },
];

function templateAgentsMd(t) {
  const L = [];
  L.push("# " + t.name + " — aturan proyek", "");
  L.push("## Stack", t.stack.map(s => "- " + s).join("\n"), "");
  L.push("## Struktur folder", FENCE, t.tree.join("\n"), FENCE, "");
  L.push("## Perintah awal", FENCE + "bash", t.cmds.join("\n"), FENCE, "");
  if (t.env.length) L.push("## Variabel lingkungan (.env.example)", FENCE, t.env.map(e => e + "=").join("\n"), FENCE, "");
  L.push("## Aturan khusus stack", t.rules.map(r => "- " + r).join("\n"), "");
  L.push("## Aturan kerja agent", BASE_RULES.map(r => "- " + r).join("\n"), "");
  return L.join("\n");
}

function templatePrompt(t) {
  return [
    "Kita akan membangun proyek baru dengan template \"" + t.name + "\".",
    "",
    "1. Baca AGENTS.md di root proyek. Itu aturan yang wajib kamu ikuti.",
    "2. Jalankan perintah awal di bagian \"Perintah awal\" lalu buat struktur folder sesuai AGENTS.md.",
    "3. Buat .env.example berisi semua variabel yang tercantum.",
    "4. Implementasikan tahap pertama saja: " + t.first + ".",
    "5. Jalankan lint dan typecheck, perbaiki semua error.",
    "6. Berhenti, lalu tulis ringkasan: file yang dibuat, cara menjalankan, dan apa yang perlu saya cek.",
  ].join("\n");
}

const EXAMPLE_PLAN = {
  id: "contoh-barbershop", example: true, created: Date.now() - 864e5,
  title: "Antrean Online Barbershop",
  idea: "Aplikasi web antrean untuk barbershop: pelanggan ambil nomor antrean dari HP, lihat estimasi waktu tunggu, dan dapat notifikasi WhatsApp saat gilirannya hampir tiba. Kapster mengatur antrean dari tablet.",
  type: "Web app", platform: "Web (responsif HP)", agent: "Claude Code", level: "Pemula", lang: "Indonesia", stack: "Next.js + Supabase",
  questions: [],
  docs: {
    prd: "# PRD — Antrean Online Barbershop\n\n## Ringkasan\nPelanggan barbershop mengambil nomor antrean dari HP tanpa harus menunggu lama di tempat. Kapster mengelola antrean dari tablet di meja kasir.\n\n## Masalah\n- Pelanggan menunggu 30–90 menit di lokasi saat akhir pekan.\n- Kapster sering lupa urutan saat pelanggan keluar sebentar.\n\n## Target pengguna\n| Peran | Kebutuhan utama |\n|---|---|\n| Pelanggan | Ambil nomor, tahu estimasi tunggu, notifikasi WhatsApp |\n| Kapster | Panggil antrean berikutnya, tandai selesai atau lewati |\n| Pemilik | Laporan harian jumlah pelanggan & pendapatan |\n\n## Ruang lingkup MVP\n- Ambil nomor antrean tanpa registrasi akun (cukup nama & WhatsApp)\n- Layar status antrean publik realtime\n- Panel kapster terlindungi PIN: panggil, selesai, lewati\n- Pengiriman WhatsApp otomatis via API Fonnte saat sisa 2 nomor\n\n## Di luar MVP\n- Reservasi jam khusus, pembayaran online, multi-cabang\n\n## Metrik sukses\n- 60% pelanggan akhir pekan mengambil nomor via web dalam 1 bulan\n- Waktu tunggu antrean di kursi pangkas turun menjadi < 15 menit",
    spec: "# SPEC\n\n## Stack\n- Next.js App Router + TypeScript + Tailwind CSS\n- Supabase (Postgres Database + Realtime channel)\n- Fonnte API untuk integrasi WhatsApp notifikasi\n\n## Model data\n| Tabel | Kolom penting |\n|---|---|\n| queues | id (uuid), date (date), number (int), name (text), phone (text), status (waiting/called/done/skipped), created_at (timestamp) |\n| settings | avg_minutes_per_cut (int), open_hour (text), close_hour (text), pin_hash (text) |\n\n## Halaman & Route\n- `/` Form ambil nomor antrean publik\n- `/status/[id]` Layar posisi antrean & estimasi waktu tunggu realtime\n- `/kapster` Panel kontrol kapster (auth via PIN)\n\n## Logika Estimasi\n`estimasi_menit = posisi_antrean * avg_minutes_per_cut`",
    tasks: "# TASKS\n\n### T-001 Setup proyek dan konfigurasi Supabase\n- [ ] Inisialisasi Next.js 14 App Router, konfigurasi Tailwind CSS, buat tabel `queues` dan `settings` di Supabase beserta migrasi skema.\n\n### T-002 Halaman ambil nomor antrean publik\n- [ ] Buat form input nama dan nomor WhatsApp, simpan record ke Supabase, redirect otomatis ke `/status/[id]`.\n\n### T-003 Halaman status antrean realtime\n- [ ] Implementasikan listener Realtime Supabase, tampilkan nomor saat ini, posisi user, dan estimasi waktu tunggu.\n\n### T-004 Panel kontrol kapster\n- [ ] Buat otentikasi PIN sederhana, tampilan daftar antrean aktif, dan tombol Panggil, Selesai, serta Lewati.\n\n### T-005 Integrasi webhook WhatsApp notifikasi\n- [ ] Kirim pesan notifikasi otomatis via Fonnte API ketika antrean user tersisa 2 nomor.",
    rules: "# CLAUDE.md\n\n- Kerjakan tepat satu task dari TASKS.md per sesi, lalu berhenti dan laporkan.\n- Terapkan Row Level Security (RLS) di Supabase; panel kapster hanya boleh diakses melalui Route Handler ber-PIN.\n- Simpan semua token Fonnte dan Supabase Service Key di `.env`, jangan bocorkan ke client bundle.\n- Jalankan `npm run lint` dan `npm run build` sebelum menyatakan task selesai.",
  },
};
