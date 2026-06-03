const express = require('express');
const mysql = require('mysql2/promise');
const amqplib = require('amqplib');

const app = express();
app.use(express.json());

const dbConfig = {
    host: 'mysql_eai',
    user: 'root',
    password: 'rootpassword',
    database: 'db_billing'
};

let channel, connection;
async function connectRabbitMQ() {
    try {
        const amqpServer = "amqp://admin:admin123@rabbitmq_eai:5672";
        connection = await amqplib.connect(amqpServer);
        channel = await connection.createChannel();
        
        // 1. EIP Subscriber (Pub-Sub): Mendengarkan Pendaftaran Pasien Baru
        await channel.assertExchange('eai_pubsub', 'fanout', { durable: true });
        const q_pubsub = await channel.assertQueue('q_billing_pasien_baru', { exclusive: false });
        await channel.bindQueue(q_pubsub.queue, 'eai_pubsub', '');
        
        channel.consume(q_pubsub.queue, async (msg) => {
            if (msg.content) {
                const data = JSON.parse(msg.content.toString());
                const db = await mysql.createConnection(dbConfig);
                await db.execute('INSERT INTO tagihan (id_pasien, total_tagihan, keterangan) VALUES (?, ?, ?)', [data.id_pasien, 50000, 'Biaya Administrasi Pendaftaran']);
                await db.end();
                console.log(`Berhasil mencatat biaya administrasi Rp50.000 untuk Pasien: ${data.id_pasien}`);
                channel.ack(msg);
            }
        });

        // 2. Dengarkan rute tagihan obat dari Gateway (Farmasi)
        await channel.assertQueue('q_billing_in', { durable: true });
        channel.consume('q_billing_in', async (msg) => {
            if (msg.content) {
                const data = JSON.parse(msg.content.toString());
                const db = await mysql.createConnection(dbConfig);
                await db.execute('INSERT INTO tagihan (id_pasien, total_tagihan, keterangan) VALUES (?, ?, ?)', [data.id_pasien, data.total_tagihan, data.keterangan]);
                await db.end();
                console.log(`Berhasil mencatat tagihan obat Rp${data.total_tagihan} untuk Pasien: ${data.id_pasien}`);
                channel.ack(msg);
            }
        });

        console.log("Sistem Billing sukses terhubung ke RabbitMQ");
    } catch (err) {
        console.error("Gagal koneksi RabbitMQ...", err);
        setTimeout(connectRabbitMQ, 5000);
    }
}
connectRabbitMQ();

// Endpoint (API) Untuk Klien melihat tagihannya
app.get('/tagihan/:id_pasien', async (req, res) => {
    try {
        const db = await mysql.createConnection(dbConfig);
        const [rows] = await db.execute('SELECT * FROM tagihan WHERE id_pasien = ?', [req.params.id_pasien]);
        await db.end();
        res.json({ id_pasien: req.params.id_pasien, detail_tagihan: rows });
    } catch (e) {
        res.status(500).json({error: "Terjadi kesalahan server"});
    }
});

app.get('/', (req, res) => res.json({ service: 'billing', status: 'ready' }));

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => console.log('Billing running on port ' + PORT));
