# Panduan mentor: memberikan izin setup kepada akun developer

> Historical IAM preparation guide. Phase 19 is now complete using the runtime
> roles granted by the mentor at project scope. This guide was not executed as
> a complete setup workflow. Current deployment and IAM scope are documented in
> [CLOUD_RUN_DEPLOYMENT.md](CLOUD_RUN_DEPLOYMENT.md).

## Alur yang diminta

Mentor menggunakan akunnya sendiri untuk memberikan izin setup kepada:

```text
alhan.husen@point-star.com
```

Developer tetap login memakai akun tersebut. Developer tidak login ke akun
mentor/admin dan tidak membutuhkan password mentor. Setelah izin diberikan,
developer memasang binding runtime kepada service account aplikasi:

```text
sales-insight-runtime@id-fpoc-0608-data-posindo.iam.gserviceaccount.com
```

**Dua penerima berbeda:** akun developer mendapat izin mengatur IAM resource
aplikasi; SA mendapat izin membaca/mengubah data dan membaca JWT secret saat
container berjalan.

Project semua langkah: `id-fpoc-0608-data-posindo`.
Panduan ini hanya menyiapkan IAM. Tidak menjalankan deployment atau mengubah data/schema.

## Status pemeriksaan terakhir, 3 Oktober 2026

- SA sudah mendapat `roles/bigquery.jobUser` di project. Pertahankan.
- SA sudah mendapat `roles/secretmanager.secretAccessor` di project. Sudah
  berfungsi, tetapi cakupannya akan dibatasi ke secret aplikasi.
- Binding akses data SA belum ditemukan di project, dataset, atau tiga tabel.
- SA, secret `sales-insight-jwt`, dan tiga tabel aplikasi sudah ada.

## Bagian A — dilakukan mentor dengan akun mentor sendiri

### 1. Buka project dan Cloud Shell

Buka https://console.cloud.google.com/welcome?project=id-fpoc-0608-data-posindo
menggunakan akun mentor yang berwenang, lalu klik **Activate Cloud Shell**.

Semua perintah menyebut project secara eksplisit dan tidak memerlukan checkout
repo. Jalankan setiap perintah satu per satu; berhenti jika gagal.

### 2. Periksa nama role sebelum membuatnya

```bash
gcloud iam roles describe salesInsightTableData --project=id-fpoc-0608-data-posindo
gcloud iam roles describe salesInsightTableIamSetup --project=id-fpoc-0608-data-posindo
gcloud iam roles describe salesInsightSecretIamSetup --project=id-fpoc-0608-data-posindo
```

Untuk setiap role: jika `NOT_FOUND`, buat dengan perintah pada langkah 3.
Jika sudah ada, periksa bahwa milik aplikasi ini, aktif, dan permission-nya
persis sesuai definisi berikut, lalu lewati pembuatan role tersebut.
`PERMISSION_DENIED` bukan bukti bahwa role tidak ada. Jangan menimpa role
milik workload lain.

### 3. Buat definisi role runtime dan dua role setup

Role runtime berikut nanti diberikan developer kepada **SA pada tiga tabel**:

```bash
gcloud iam roles create salesInsightTableData \
  --project=id-fpoc-0608-data-posindo \
  --title='Sales Insight Table Data' \
  --description='Read metadata/data and perform DML only on explicitly bound application tables.' \
  --permissions=bigquery.tables.get,bigquery.tables.getData,bigquery.tables.updateData \
  --stage=GA
```

Dua role berikut diberikan kepada **akun developer**, untuk mengatur binding:

```bash
gcloud iam roles create salesInsightTableIamSetup \
  --project=id-fpoc-0608-data-posindo \
  --title='Sales Insight Table IAM Setup' \
  --description='Temporary IAM setup on explicitly bound application tables.' \
  --permissions=bigquery.tables.getIamPolicy,bigquery.tables.setIamPolicy \
  --stage=GA
```

```bash
gcloud iam roles create salesInsightSecretIamSetup \
  --project=id-fpoc-0608-data-posindo \
  --title='Sales Insight Secret IAM Setup' \
  --description='Temporary IAM setup on the explicitly bound application secret.' \
  --permissions=secretmanager.secrets.getIamPolicy,secretmanager.secrets.setIamPolicy \
  --stage=GA
```

Mentor membuat definisi role sehingga developer tidak perlu diberi izin
membuat/mengubah role seluruh project. Pembuatan definisi belum memberikan
akses kepada siapa pun; cakupannya ditentukan oleh binding berikut.

### 4. Berikan izin setup tabel kepada akun developer

Jalankan setiap perintah satu per satu:

```bash
bq add-iam-policy-binding \
  --member=user:alhan.husen@point-star.com \
  --role=projects/id-fpoc-0608-data-posindo/roles/salesInsightTableIamSetup \
  id-fpoc-0608-data-posindo:sales_dashboard.users
```

```bash
bq add-iam-policy-binding \
  --member=user:alhan.husen@point-star.com \
  --role=projects/id-fpoc-0608-data-posindo/roles/salesInsightTableIamSetup \
  id-fpoc-0608-data-posindo:sales_dashboard.sales
```

```bash
bq add-iam-policy-binding \
  --member=user:alhan.husen@point-star.com \
  --role=projects/id-fpoc-0608-data-posindo/roles/salesInsightTableIamSetup \
  id-fpoc-0608-data-posindo:sales_dashboard.audit_logs
```

### 5. Berikan izin setup secret kepada akun developer

```bash
gcloud secrets add-iam-policy-binding sales-insight-jwt \
  --project=id-fpoc-0608-data-posindo \
  --member=user:alhan.husen@point-star.com \
  --role=projects/id-fpoc-0608-data-posindo/roles/salesInsightSecretIamSetup \
  --condition=None
```

Izin setup dapat mengubah siapa yang mengakses resource tersebut, sehingga
bersifat administratif. Batasi ke tiga tabel dan satu secret ini, lalu cabut
setelah selesai. Jangan berikan dua role setup di level project/dataset.
Tidak perlu memberikan Owner, Editor, Project IAM Admin, BigQuery Admin,
atau Secret Manager Admin kepada developer untuk langkah ini.

### 6. Konfirmasi izin setup sudah diberikan

Mentor mengabari developer bahwa langkah 3–5 selesai. Developer akan mengecek
izin memakai akunnya sendiri sebelum melanjutkan Bagian B.

## Bagian B — dilakukan developer dengan akun developer sendiri

### 7. Login memakai akun sendiri

Di terminal lokal:

```bash
gcloud auth login alhan.husen@point-star.com
gcloud config set account alhan.husen@point-star.com
```

Tidak perlu login ulang jika akun tersebut sudah aktif dan autentikasinya valid.

### 8. Pasang role data pada SA untuk tiga tabel

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

### 9. Pasang Secret Accessor pada secret aplikasi untuk SA

```bash
gcloud secrets add-iam-policy-binding sales-insight-jwt \
  --project=id-fpoc-0608-data-posindo \
  --member=serviceAccount:sales-insight-runtime@id-fpoc-0608-data-posindo.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor \
  --condition=None
```

### 10. Verifikasi binding, lalu beri konfirmasi kepada mentor

```bash
bq get-iam-policy id-fpoc-0608-data-posindo:sales_dashboard.users
bq get-iam-policy id-fpoc-0608-data-posindo:sales_dashboard.sales
bq get-iam-policy id-fpoc-0608-data-posindo:sales_dashboard.audit_logs
gcloud secrets get-iam-policy sales-insight-jwt --project=id-fpoc-0608-data-posindo
```

Pastikan SA memiliki `salesInsightTableData` di ketiga tabel dan
`roles/secretmanager.secretAccessor` pada secret. Jangan membaca/mengirim nilai
secret, token, atau key JSON. Ini memverifikasi konfigurasi binding; query runtime,
login, dan RBAC tetap perlu diuji saat deployment nanti.

## Bagian C — perapihan oleh mentor setelah Bagian B berhasil

### 11. Hapus binding Secret Accessor SA di level project

Developer tidak diberi `resourcemanager.projects.setIamPolicy`, karena izin
tersebut dapat mengubah akses seluruh project. Oleh sebab itu, mentor melakukan
satu perapihan project berikut setelah binding secret pada langkah 9–10 berhasil:

```bash
gcloud projects remove-iam-policy-binding id-fpoc-0608-data-posindo \
  --member=serviceAccount:sales-insight-runtime@id-fpoc-0608-data-posindo.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor \
  --condition=None
```

Hapus hanya binding tanpa kondisi pasangan SA/role tersebut. Pertahankan
BigQuery Job User dan binding secret. Jika policy telah berubah atau binding
memiliki kondisi berbeda, periksa dahulu; jangan menghapus binding lain.

### 12. Cabut dua role setup sementara dari akun developer

```bash
bq remove-iam-policy-binding \
  --member=user:alhan.husen@point-star.com \
  --role=projects/id-fpoc-0608-data-posindo/roles/salesInsightTableIamSetup \
  id-fpoc-0608-data-posindo:sales_dashboard.users
```

```bash
bq remove-iam-policy-binding \
  --member=user:alhan.husen@point-star.com \
  --role=projects/id-fpoc-0608-data-posindo/roles/salesInsightTableIamSetup \
  id-fpoc-0608-data-posindo:sales_dashboard.sales
```

```bash
bq remove-iam-policy-binding \
  --member=user:alhan.husen@point-star.com \
  --role=projects/id-fpoc-0608-data-posindo/roles/salesInsightTableIamSetup \
  id-fpoc-0608-data-posindo:sales_dashboard.audit_logs
```

```bash
gcloud secrets remove-iam-policy-binding sales-insight-jwt \
  --project=id-fpoc-0608-data-posindo \
  --member=user:alhan.husen@point-star.com \
  --role=projects/id-fpoc-0608-data-posindo/roles/salesInsightSecretIamSetup \
  --condition=None
```

Jangan cabut role runtime milik SA atau izin developer yang sudah ada sebelumnya.
Pencabutan ini hanya menghapus binding setup baru; tidak menghilangkan izin
serupa jika sudah diperoleh developer dari role lain.

### 13. Verifikasi hasil akhir

```bash
gcloud projects get-iam-policy id-fpoc-0608-data-posindo \
  --flatten='bindings[].members' \
  --filter='bindings.members:serviceAccount:sales-insight-runtime@id-fpoc-0608-data-posindo.iam.gserviceaccount.com' \
  --format='table(bindings.role,bindings.members)'
bq get-iam-policy id-fpoc-0608-data-posindo:sales_dashboard.users
bq get-iam-policy id-fpoc-0608-data-posindo:sales_dashboard.sales
bq get-iam-policy id-fpoc-0608-data-posindo:sales_dashboard.audit_logs
gcloud secrets get-iam-policy sales-insight-jwt --project=id-fpoc-0608-data-posindo
```

Hasil akhir: SA tetap memiliki Job User di project, akses data di tiga tabel,
dan akses secret pada `sales-insight-jwt`. Binding setup sementara developer
sudah dicabut, binding Secret Accessor SA di project sudah dihapus, dan tidak
ada IAM/data/schema workload lain yang diubah. Akses tambahan dari folder atau
organisasi perlu diperiksa terpisah jika ada.

**Berhenti di sini.** Developer melaporkan hasil pemeriksaan sebelum melanjutkan
Phase 19 sesuai permintaan pengguna. Pilihan Cloud Run tetap privat.

## Referensi resmi

- [Custom IAM roles](https://docs.cloud.google.com/iam/docs/creating-custom-roles)
- [IAM per tabel BigQuery](https://docs.cloud.google.com/bigquery/docs/control-access-to-resources-iam)
- [IAM Secret Manager](https://docs.cloud.google.com/secret-manager/docs/access-control)
