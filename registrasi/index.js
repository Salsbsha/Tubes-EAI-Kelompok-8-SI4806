const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const amqplib = require('amqplib');

const app = express();
app.use(cors());
app.use(express.json());

// Konfigurasi Database
const dbConfig = {
    host: 'mysql_eai', // Nama container database di docker-compose
    user: 'root',
    password: 'rootpassword',
    database: 'db_registrasi'
};

// Fungsi Koneksi RabbitMQ
let channel, connection;
async function connectRabbitMQ() {
    try {
        const amqpServer = "amqp://admin:admin123@rabbitmq_eai:5672";
        connection = await amqplib.connect(amqpServer);
        channel = await connection.createChannel();
        // bikin exchange fanout buat nge-broadcast pesan
        await channel.assertExchange('eai_pubsub', 'fanout', { durable: true });
        console.log("registrasi nyambung ke rabbitmq");
    } catch (err) {
        console.error("Gagal koneksi RabbitMQ, mencoba lagi dalam 5 detik...", err);
        setTimeout(connectRabbitMQ, 5000);
    }
}
connectRabbitMQ();

// Endpoint Pendaftaran Pasien Baru
app.post('/register', async (req, res) => {
    const { nama, alamat } = req.body;
    if (!nama) return res.status(400).json({ error: "Nama wajib diisi" });

    // Membuat ID otomatis (Contoh: PAS-1234)
    const id_pasien = "PAS-" + Math.floor(Math.random() * 10000);

    try {
        // 1. Simpan ke database MySQL Registrasi
        const db = await mysql.createConnection(dbConfig);
        await db.execute('INSERT INTO pasien (id, nama, alamat) VALUES (?, ?, ?)', [id_pasien, nama, alamat || '']);
        await db.end();

        // 2. sebar luaskan info pasien baru lewat rabbitmq
        const payload = { id_pasien, nama, alamat };
        channel.publish('eai_pubsub', '', Buffer.from(JSON.stringify(payload)));
        
        console.log(`pasien ${nama} berhasil daftar dan pesannya udah dikirim`);
        res.json({ message: "Pasien berhasil didaftarkan", id_pasien });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Terjadi kesalahan database" });
    }
});

app.get('/', (req, res) => res.json({ service: 'registrasi', status: 'ready' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('Registrasi running on port ' + PORT));
