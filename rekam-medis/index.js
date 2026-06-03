const express = require('express');
const mysql = require('mysql2/promise');
const amqplib = require('amqplib');

const app = express();
app.use(express.json());

const dbConfig = {
    host: 'mysql_eai',
    user: 'root',
    password: 'rootpassword',
    database: 'db_rekammedis'
};

let channel, connection;
async function connectRabbitMQ() {
    try {
        const amqpServer = "amqp://admin:admin123@rabbitmq_eai:5672";
        connection = await amqplib.connect(amqpServer);
        channel = await connection.createChannel();
        
        // 1. EIP Subscriber: Mendengarkan pasien baru dari Registrasi
        await channel.assertExchange('eai_pubsub', 'fanout', { durable: true });
        // Membuat antrean khusus untuk rekam medis
        const q = await channel.assertQueue('q_rm_pasien_baru', { exclusive: false });
        // Mengikat (bind) antrean ke Exchange eai_pubsub
        await channel.bindQueue(q.queue, 'eai_pubsub', '');
        
        channel.consume(q.queue, async (msg) => {
            if (msg.content) {
                const data = JSON.parse(msg.content.toString());
                console.log("Event Diterima: Pasien Baru mendaftar ->", data.nama);
                
                // Secara otomatis buat folder rekam medis kosong di database
                const db = await mysql.createConnection(dbConfig);
                await db.execute('INSERT INTO rekam_medis (id_pasien, keluhan, status) VALUES (?, ?, ?)', [data.id_pasien, '', 'Menunggu Pemeriksaan']);
                await db.end();
                
                channel.ack(msg); // Konfirmasi pesan sudah diproses
            }
        });
        
        // 2. Setup Antrean ke Gateway (Untuk pesan Resep)
        await channel.assertQueue('q_gateway_in', { durable: true });

        console.log("Sistem Rekam Medis sukses terhubung ke RabbitMQ");
    } catch (err) {
        console.error("Gagal koneksi RabbitMQ, mencoba lagi dalam 5 detik...", err);
        setTimeout(connectRabbitMQ, 5000);
    }
}
connectRabbitMQ();

// Endpoint Membuat Resep Obat
app.post('/resep', async (req, res) => {
    const { id_pasien, kode_obat, jumlah } = req.body;
    if (!id_pasien || !kode_obat || !jumlah) return res.status(400).json({ error: "Data tidak lengkap" });

    try {
        // 1. Simpan resep ke database MySQL Rekam Medis
        const db = await mysql.createConnection(dbConfig);
        await db.execute('INSERT INTO resep (id_pasien, kode_obat, jumlah) VALUES (?, ?, ?)', [id_pasien, kode_obat, jumlah]);
        await db.end();

        // 2. Kirim pesan ke API Gateway untuk diarahkan ke Farmasi
        const payload = { 
            tipe_pesan: "KIRIM_RESEP", 
            id_pasien, 
            kode_obat, 
            jumlah 
        };
        channel.sendToQueue('q_gateway_in', Buffer.from(JSON.stringify(payload)), { persistent: true });

        res.json({ message: "Resep berhasil dicatat dan sedang dikirim otomatis ke Farmasi" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Terjadi kesalahan server" });
    }
});

app.get('/', (req, res) => res.json({ service: 'rekam-medis', status: 'ready' }));

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log('Rekam Medis running on port ' + PORT));
