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

### Menghapus Semua ID Eksplisit dari Seeder

Seeder telah diperbaiki untuk **TIDAK menggunakan ID eksplisit** sama sekali. Sebagai gantinya, seeder sekarang menggunakan **dynamic lookup** untuk mendapatkan ID yang di-generate otomatis oleh PostgreSQL.

#### Sebelum (❌ SALAH):
```typescript
await db.insert(roles).values([
  { id: 1, name: "root", description: "..." },
  { id: 2, name: "admin", description: "..." },
]);

await db.insert(users).values([
  { id: 1, email: "root@...", roleId: 1 },  // Hardcoded
]);
```

#### Sesudah (✅ BENAR):
```typescript
await db.insert(roles).values([
  { name: "root", description: "..." },  // No ID!
  { name: "admin", description: "..." },
]);

// Get dynamically generated IDs
const allRoles = await db.select().from(roles);
const rootRole = allRoles.find(r => r.name === 'root');

await db.insert(users).values([
  { email: "root@...", roleId: rootRole.id },  // Dynamic!
]);
```

## File yang Diperbaiki

### `server/enhanced-seeder.ts` (File Utama yang Digunakan)
- ✅ Semua ID eksplisit dihapus dari: roles, subscription packages, users, workspaces
- ✅ Menggunakan dynamic lookup dengan `.find()` untuk mendapatkan ID
- ✅ Ada validasi untuk memastikan data dependency tersedia
- ✅ PostgreSQL sequence akan update otomatis tanpa manual intervention

## Cara Kerja Solusi

1. **Data di-insert tanpa ID eksplisit** → PostgreSQL auto-increment bekerja normal
2. **Sequence terupdate otomatis** → Tidak ada konflik ID
3. **Relasi menggunakan dynamic lookup** → ID didapat dari query, bukan hardcoded
4. **User baru registrasi** → Mendapat ID dari sequence yang sudah benar

## Mengapa Ini Lebih Baik?

### ❌ Pendekatan Lama (dengan ID eksplisit + fix sequences)
- Kompleks: Perlu endpoint khusus / SQL manual
- Rawan error: Harus ingat fix sequences setiap seed
- Maintenance burden: Harus maintain 2 sistem (seeder + sequence fixer)

### ✅ Pendekatan Baru (tanpa ID eksplisit)
- Simple: Biarkan PostgreSQL handle auto-increment
- Zero maintenance: Tidak perlu fix sequences
- No endpoints needed: Sequence selalu benar
- Best practice: Ikuti design pattern yang recommended

## Testing
Untuk memverifikasi bahwa masalah sudah fixed:

1. Reset database dan seed ulang:
   ```bash
   npm run db:seed -- --reset
   ```

2. Coba register user baru via aplikasi

3. Tidak ada lagi error "duplicate key value violates unique constraint"!

## Pencegahan di Masa Depan

**JANGAN PERNAH** gunakan ID eksplisit di seeder:

```typescript
// ❌ JANGAN:
{ id: 1, name: "example" }

// ✅ LAKUKAN:
{ name: "example" }
```

Jika perlu reference ID dari tabel lain:

```typescript
// ✅ Gunakan dynamic lookup:
const parent = (await db.select().from(parents)).find(p => p.name === 'example');
await db.insert(children).values({ parentId: parent.id });
```
