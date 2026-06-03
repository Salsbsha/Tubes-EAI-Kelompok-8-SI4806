# Tugas Besar EAI: Integrasi Sistem Rumah Sakit 

Repositori ini berisi implementasi Tugas Besar mata kuliah **Enterprise Application Integration (EAI)**. Proyek ini mendemonstrasikan integrasi sistem-sistem yang terpisah (Information Silos) di sebuah rumah sakit menjadi satu kesatuan arsitektur Microservices yang terpusat menggunakan Docker dan RabbitMQ.

## Anggota Kelompok 8
1. Anie Margiyanti(102022400182)
2. Surya Darmawan (102022400338)
3. Salsabila Shafina Arvi (102022430019)

---

## Arsitektur Sistem

Sistem ini terdiri dari **5 Microservices** dan didukung oleh infrastruktur Database (MySQL) dan Message Broker (RabbitMQ):

1. **Sistem Registrasi (Port 3001)**: Menerima pendaftaran pasien baru (JSON).
2. **Sistem Rekam Medis (Port 3002)**: Mencatat riwayat dan resep obat pasien (JSON).
3. **API Gateway / Router (Port 3000)**: Otak utama yang merutekan dan menerjemahkan pesan antar-sistem.
4. **Sistem Farmasi (Port 3003)**: Sistem *Legacy* rumah sakit yang mengurus stok obat (Menggunakan format **XML**).
5. **Sistem Billing (Port 3004)**: Menghitung akumulasi biaya pasien (JSON).

## Enterprise Integration Patterns (EIP) yang Diterapkan
1. **Publish-Subscribe Channel:** Saat pasien baru mendaftar di Registrasi, data pasien di-*broadcast* ke antrean RabbitMQ, dan secara paralel ditangkap oleh sistem Rekam Medis dan sistem Billing.
2. **Message Router:** API Gateway mengecek tipe pesan (misal: "KIRIM_RESEP"). Berdasarkan isinya, pesan dirutekan ke antrean yang tepat (Farmasi atau Billing).
3. **Message Translator:** Karena sistem Farmasi adalah sistem lama (*legacy*) yang hanya menerima data berformat XML, API Gateway secara otomatis menerjemahkan resep obat berformat JSON menjadi XML sebelum dikirim ke Farmasi.

---

## Cara Menjalankan Aplikasi (Instalasi)

Proyek ini telah menerapkan *Full Containerization*. 

## Skenario Pengujian (Testing)
Pengujian dapat dilakukan menggunakan aplikasi penguji API seperti **Postman**.

**1. Mendaftarkan Pasien**
* `POST http://localhost:3001/register`
* Body JSON: `{"nama": "Pasien A", "alamat": "Bandung"}`

**2. Memberikan Resep Obat**
* `POST http://localhost:3002/resep`
* Body JSON: `{"id_pasien": "PAS-XXXX", "kode_obat": "OBT-001", "jumlah": 2}`

**3. Mengecek Tagihan Akhir**
* `GET http://localhost:3004/tagihan/PAS-XXXX`
