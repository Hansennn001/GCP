# Panduan mentor: melengkapi akses service account aplikasi

## Tujuan dan status terakhir

Panduan ini hanya untuk menyiapkan IAM aplikasi Sales Insight Dashboard.
Tidak ada langkah deployment, perubahan data, atau perubahan schema tabel.

Project: `id-fpoc-0608-data-posindo`

Service account (SA) aplikasi:

```text
sales-insight-runtime@id-fpoc-0608-data-posindo.iam.gserviceaccount.com
```

Hasil pemeriksaan terakhir pada 3 Oktober 2026:

| Akses | Status | Tindakan |
|---|---|---|
| BigQuery Job User pada project | Sudah diberikan | Pertahankan; tidak perlu membuat custom role untuk query job |
| Akses baca/tulis tiga tabel aplikasi | Binding SA belum ditemukan pada project, dataset, atau tabel | Tambahkan melalui langkah 2–3 |
| Secret Manager Secret Accessor pada project | Sudah diberikan | Batasi ke secret aplikasi melalui langkah 4–5 |

Job User memberi izin menjalankan job. Akses membaca dan mengubah isi tabel
memerlukan permission data yang terpisah.

SA dan secret `sales-insight-jwt` sudah ada. Tidak perlu membuat ulang,
membaca nilai secret, membuat key JSON, atau memberikan Owner/Editor kepada SA.

## 1. Buka Cloud Shell dengan akun mentor/admin

1. Buka https://console.cloud.google.com/welcome?project=id-fpoc-0608-data-posindo.
2. Gunakan akun Google yang berwenang mengelola IAM project ini.
3. Klik tombol **Activate Cloud Shell** di bagian atas console.
4. Jalankan pemeriksaan berikut:

```bash
gcloud auth list --filter=status:ACTIVE --format='value(account)'
gcloud projects describe id-fpoc-0608-data-posindo --format='value(projectId)'
gcloud iam service-accounts describe \
  sales-insight-runtime@id-fpoc-0608-data-posindo.iam.gserviceaccount.com \
  --project=id-fpoc-0608-data-posindo --format='value(email)'
```

Semua perintah di bawah menyebut project secara eksplisit. Tidak perlu
mengubah default project. Panduan ini mandiri dan tidak memerlukan checkout repo.

Izin administrator yang digunakan: `iam.roles.create` untuk membuat custom
role, `bigquery.tables.getIamPolicy` dan `bigquery.tables.setIamPolicy` pada
tabel target, serta izin baca/ubah IAM secret dan project untuk merapikan
binding Secret Accessor. Izin administrasi ini digunakan akun mentor,
**bukan diberikan kepada runtime SA**. Jika perintah gagal, berhenti dan
selesaikan error sebelum melanjutkan.

## 2. Buat custom role untuk data tabel

Periksa dahulu apakah role sudah ada:

```bash
gcloud iam roles describe salesInsightTableData \
  --project=id-fpoc-0608-data-posindo
```

- Jika `NOT_FOUND`, buat role dengan perintah di bawah.
- Jika sudah ada, pastikan role milik aplikasi ini, tidak dinonaktifkan, dan
  permission-nya persis tiga permission berikut. Jika sesuai, lewati pembuatan.
- Jika `PERMISSION_DENIED` atau role ternyata milik workload lain, berhenti.
  Jangan mengubah atau menimpa role tersebut.

```bash
gcloud iam roles create salesInsightTableData \
  --project=id-fpoc-0608-data-posindo \
  --title='Sales Insight Table Data' \
  --description='Read metadata/data and perform DML only on explicitly bound application tables.' \
  --permissions=bigquery.tables.get,bigquery.tables.getData,bigquery.tables.updateData \
  --stage=GA
```

Role ini mengizinkan baca metadata/data dan insert, update, delete **baris**.
Role ini tidak memberi izin menghapus tabel atau mengubah schema.
Tidak perlu menambahkan BigQuery Admin atau BigQuery Data Editor.

## 3. Berikan role hanya pada tiga tabel aplikasi

Jalankan tiga perintah berikut satu per satu. Pastikan masing-masing berhasil:

```bash
bq add-iam-policy-binding \
  --member=serviceAccount:sales-insight-runtime@id-fpoc-0608-data-posindo.iam.gserviceaccount.com \
  --role=projects/id-fpoc-0608-data-posindo/roles/salesInsightTableData \
  id-fpoc-0608-data-posindo:sales_dashboard.users
```

```bash
bq add-iam-policy-binding \
  --member=serviceAccount:sales-insight-runtime@id-fpoc-0608-data-posindo.iam.gserviceaccount.com \
  --role=projects/id-fpoc-0608-data-posindo/roles/salesInsightTableData \
  id-fpoc-0608-data-posindo:sales_dashboard.sales
```

```bash
bq add-iam-policy-binding \
  --member=serviceAccount:sales-insight-runtime@id-fpoc-0608-data-posindo.iam.gserviceaccount.com \
  --role=projects/id-fpoc-0608-data-posindo/roles/salesInsightTableData \
  id-fpoc-0608-data-posindo:sales_dashboard.audit_logs
```

Jangan bind role ini di level project atau dataset. Perintah tersebut menambah
binding pada tabel target dan mempertahankan binding milik pihak lain.

## 4. Tambahkan Secret Accessor langsung pada secret aplikasi

Secret Accessor yang sekarang sudah berfungsi, tetapi diberikan pada project
sehingga cakupannya meliputi secret lain. Penerimanya tetap SA yang sama;
yang diubah adalah cakupan resource.

Tambahkan binding khusus secret **sebelum** menghapus binding project:

```bash
gcloud secrets add-iam-policy-binding sales-insight-jwt \
  --project=id-fpoc-0608-data-posindo \
  --member=serviceAccount:sales-insight-runtime@id-fpoc-0608-data-posindo.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor \
  --condition=None
```

Verifikasi binding tersebut dan versi secret tanpa membaca nilainya:

```bash
gcloud secrets get-iam-policy sales-insight-jwt \
  --project=id-fpoc-0608-data-posindo
gcloud secrets versions list sales-insight-jwt \
  --project=id-fpoc-0608-data-posindo
```

Pastikan role `roles/secretmanager.secretAccessor` memuat SA aplikasi dan
versi `1` berstatus `ENABLED`. Jika belum, jangan lanjut ke langkah 5.

## 5. Hapus hanya binding Secret Accessor SA aplikasi di project

Setelah langkah 4 terverifikasi, jalankan:

```bash
gcloud projects remove-iam-policy-binding id-fpoc-0608-data-posindo \
  --member=serviceAccount:sales-insight-runtime@id-fpoc-0608-data-posindo.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor \
  --condition=None
```

Ini hanya menghapus binding tanpa kondisi untuk pasangan SA/role tersebut di
project. Jangan hapus BigQuery Job User, binding secret yang baru ditambahkan,
atau binding akun lain. Jangan menggunakan `set-iam-policy` untuk mengganti
seluruh policy project. Jika hasil pemeriksaan menunjukkan binding dengan
kondisi berbeda, evaluasi dahulu; jangan menghapus binding lain secara massal.

## 6. Verifikasi hasil akhir

```bash
gcloud iam roles describe salesInsightTableData \
  --project=id-fpoc-0608-data-posindo

bq get-iam-policy id-fpoc-0608-data-posindo:sales_dashboard.users
bq get-iam-policy id-fpoc-0608-data-posindo:sales_dashboard.sales
bq get-iam-policy id-fpoc-0608-data-posindo:sales_dashboard.audit_logs

gcloud projects get-iam-policy id-fpoc-0608-data-posindo \
  --flatten='bindings[].members' \
  --filter='bindings.members:serviceAccount:sales-insight-runtime@id-fpoc-0608-data-posindo.iam.gserviceaccount.com' \
  --format='table(bindings.role,bindings.members)'

gcloud secrets get-iam-policy sales-insight-jwt \
  --project=id-fpoc-0608-data-posindo
```

Hasil yang diharapkan:

- Ketiga tabel memiliki binding `salesInsightTableData` untuk SA aplikasi.
- Role custom hanya memuat tiga permission pada langkah 2.
- BigQuery Job User tetap ada pada project untuk SA aplikasi.
- Secret Accessor ada pada secret `sales-insight-jwt` untuk SA aplikasi.
- Secret Accessor milik SA tersebut tidak lagi ada di policy project.
- Tidak ada perubahan data, schema, dataset ACL, atau IAM workload lain.

Jika ada akses tambahan yang diwariskan dari folder/organisasi, pemeriksaan
policy project saja tidak membuktikan bahwa akses itu telah hilang. Evaluasi
terpisah sebelum menyimpulkan seluruh akses secret sudah terbatas.

## 7. Konfirmasi selesai kepada developer

Kirim konfirmasi bahwa binding sudah diterapkan, beserta output pemeriksaan
role/binding yang relevan. Jangan kirim token, password, key JSON, atau nilai secret.
Developer akan mengecek ulang sebelum melanjutkan Phase 19. Panduan ini tidak
menjalankan deployment Cloud Run atau mengubah pilihan akses privat.

## Referensi resmi

- [BigQuery IAM dan binding per tabel](https://docs.cloud.google.com/bigquery/docs/control-access-to-resources-iam)
- [Permission BigQuery](https://docs.cloud.google.com/bigquery/docs/access-control)
- [Cakupan akses Secret Manager](https://docs.cloud.google.com/secret-manager/docs/access-control)
- [Menghapus binding project secara spesifik](https://docs.cloud.google.com/sdk/gcloud/reference/projects/remove-iam-policy-binding)
