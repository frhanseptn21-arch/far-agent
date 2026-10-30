# far-agent

Ruang kerja ngoding pakai AI: dari ide jadi PRD, chat multi-model, desain UI dengan AI, dan template codebase. Semua berjalan di browser. Sumber AI bisa dipilih di menu Kunci API: Gemini API (key dari Google AI Studio, boleh beberapa key sekaligus) atau OpenRouter.

## Isi folder

| Path | Fungsi |
|---|---|
| `dist/index.html` | Situs siap deploy (satu file) |
| `src/styles.css` | Tampilan |
| `src/shell.html` | Kerangka navigasi |
| `src/data.js` | Template, persona chat, preset desain, contoh rencana |
| `src/app.js` | Logika aplikasi (rencana, chat, desain, template, pengaturan) |
| `build.py` | Menggabungkan `src/` menjadi `dist/index.html` |

## Menjalankan di komputer

Buka `dist/index.html` langsung di browser, atau jalankan server lokal:

```bash
cd dist
python3 -m http.server 5173
# buka http://localhost:5173
```

Lalu buka menu **Kunci API**, pilih **Gemini API**, tempel key dari https://aistudio.google.com/apikey (bisa ditambah sampai 5 key), tekan Simpan, lalu Tes semua key. Kalau satu key kena batas kuota, far-agent otomatis pindah ke key berikutnya.

## Deploy gratis

- **Netlify**: buka https://app.netlify.com/drop lalu seret folder `dist`.
- **Vercel**: `npx vercel dist` lalu ikuti petunjuknya.
- **GitHub Pages**: unggah isi `dist/` ke repo, aktifkan Pages dari branch utama.
- **Cloudflare Pages**: hubungkan repo, build command kosong, output directory `dist`.

## Mengubah kode

Edit file di `src/`, lalu jalankan:

```bash
python3 build.py
```

Menambah template codebase cukup dengan menambah satu objek di array `TEMPLATES` pada `src/data.js`.

## Catatan keamanan

Versi ini menyimpan API key di browser pengguna masing-masing (localStorage) dan memanggil OpenRouter langsung dari browser. Itu aman untuk dipakai sendiri atau dibagikan ke orang yang memakai key mereka sendiri.

Kalau nanti kamu ingin menjual akses dengan key milikmu sendiri (seperti layanan berbayar), key tidak boleh ada di browser. Langkah berikutnya:

1. Pindahkan pemanggilan Gemini/OpenRouter ke server (mis. Next.js route handler atau Cloudflare Worker) dan simpan key di environment variable server.
2. Tambahkan login (Supabase Auth) dan simpan rencana, chat, desain di database, bukan localStorage.
3. Hitung pemakaian token per pengguna dan batasi sesuai paket.
4. Tambahkan pembayaran (Midtrans atau Xendit) untuk paket langganan atau isi saldo.
