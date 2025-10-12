# Solusi Masalah Registrasi - Duplicate Key Error

## Masalah
Saat user baru mencoba registrasi di Netlify, muncul error:
```
error: duplicate key value violates unique constraint "workspaces_pkey"
Key (id)=(1) already exists.
```

## Penyebab
Seeder membuat data dengan ID eksplisit (id: 1, 2, 3, dll), tetapi PostgreSQL sequence tidak di-update setelah seeding. Akibatnya, saat user baru registrasi, sequence masih mulai dari 1 lagi, menyebabkan konflik dengan data yang sudah ada.

## Solusi yang Diterapkan

### 1. Update Seeder (server/seeder.ts)
Ditambahkan fungsi `fixSequences()` yang akan dipanggil otomatis setelah seeding:

```typescript
async function fixSequences() {
  // Fix sequences untuk semua tabel dengan auto-increment
  const sequences = [
    { table: 'roles', column: 'id' },
    { table: 'permissions', column: 'id' },
    { table: 'workspaces', column: 'id' },
    // ... dll
  ];

  for (const { table, column } of sequences) {
    await db.execute(`
      SELECT setval(
        pg_get_serial_sequence('${table}', '${column}'),
        COALESCE((SELECT MAX(${column}) FROM ${table}), 1),
        true
      );
    `);
  }
}
```

### 2. API Endpoint untuk Fix Sequences
Ditambahkan endpoint `/api/admin/fix-sequences` yang dapat dipanggil oleh root atau admin:

```http
POST /api/admin/fix-sequences
Authorization: Bearer <token>
```

Response:
```json
{
  "message": "Database sequences fixed successfully",
  "results": [
    { "table": "workspaces", "status": "fixed" },
    { "table": "users", "status": "fixed" },
    ...
  ]
}
```

## Cara Menggunakan

### Di Development (Replit)
Jika menjalankan seeder:
```bash
tsx server/seeder.ts --reset
```
Fungsi `fixSequences()` akan otomatis dipanggil.

### Di Production (Netlify)
Setelah deploy dan database sudah di-seed:

1. Login sebagai root/admin
2. Panggil API endpoint:
   ```bash
   curl -X POST https://your-app.netlify.app/.netlify/functions/api/admin/fix-sequences \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
3. Atau buat halaman admin sederhana untuk memanggil endpoint ini

### Alternatif: Jalankan SQL Manual
Jika tidak bisa mengakses API, jalankan SQL ini di Neon dashboard:

```sql
-- Fix workspaces sequence
SELECT setval('workspaces_id_seq', (SELECT COALESCE(max(id), 0) FROM workspaces));

-- Fix users sequence
SELECT setval('users_id_seq', (SELECT COALESCE(max(id), 0) FROM users));

-- Fix semua sequences lainnya...
-- (lihat file fix-sequences.sql untuk SQL lengkap)
```

## Pencegahan di Masa Depan

### Opsi 1: Jangan Gunakan ID Eksplisit di Seeder
Hapus `id:` dari data seeding:
```typescript
// ❌ Jangan:
{ id: 1, name: "Personal", ... }

// ✅ Lebih baik:
{ name: "Personal", ... }
```

### Opsi 2: Selalu Panggil fixSequences() Setelah Seeding
Sudah diterapkan di seeder yang baru.

## Catatan Penting
- Endpoint `/api/admin/fix-sequences` hanya bisa diakses oleh user dengan role `root` atau `admin`
- Sequences harus diperbaiki **setiap kali** data baru di-seed dengan ID eksplisit
- Error ini **tidak akan muncul lagi** selama sequences sudah diperbaiki setelah seeding
