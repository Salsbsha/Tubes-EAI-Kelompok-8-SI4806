-- Script inisialisasi Database EAI Rumah Sakit

CREATE DATABASE IF NOT EXISTS db_registrasi;
CREATE DATABASE IF NOT EXISTS db_rekammedis;
CREATE DATABASE IF NOT EXISTS db_farmasi;
CREATE DATABASE IF NOT EXISTS db_billing;

-- 1. Skema Registrasi
USE db_registrasi;
CREATE TABLE IF NOT EXISTS pasien (
    id VARCHAR(50) PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    alamat TEXT,
    tanggal_daftar TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Skema Rekam Medis
USE db_rekammedis;
CREATE TABLE IF NOT EXISTS rekam_medis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_pasien VARCHAR(50) NOT NULL,
    keluhan TEXT,
    status VARCHAR(50) DEFAULT 'Menunggu'
);

CREATE TABLE IF NOT EXISTS resep (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_pasien VARCHAR(50) NOT NULL,
    kode_obat VARCHAR(50) NOT NULL,
    jumlah INT NOT NULL
);

-- 3. Skema Farmasi
USE db_farmasi;
CREATE TABLE IF NOT EXISTS stok_obat (
    kode_obat VARCHAR(50) PRIMARY KEY,
    nama_obat VARCHAR(100) NOT NULL,
    stok INT DEFAULT 0,
    harga DECIMAL(10, 2) NOT NULL
);

-- Masukkan data dummy obat
INSERT IGNORE INTO stok_obat (kode_obat, nama_obat, stok, harga) VALUES
('OBT-001', 'Paracetamol 500mg', 100, 5000.00),
('OBT-002', 'Amoxicillin', 50, 15000.00),
('OBT-003', 'Mucera', 1500, 20000.00);

-- 4. Skema Billing
USE db_billing;
CREATE TABLE IF NOT EXISTS tagihan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_pasien VARCHAR(50) NOT NULL,
    total_tagihan DECIMAL(12, 2) DEFAULT 0,
    status_lunas BOOLEAN DEFAULT FALSE,
    keterangan TEXT
);
