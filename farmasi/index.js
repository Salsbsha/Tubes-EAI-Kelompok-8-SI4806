const express = require('express');
const mysql = require('mysql2/promise');
const amqplib = require('amqplib');
const xml2js = require('xml2js');

const app = express();
app.use(express.json());

const dbConfig = {
    host: 'mysql_eai',
    user: 'root',
    password: 'rootpassword',
    database: 'db_farmasi'
};

let channel, connection;
async function connectRabbitMQ() {
    try {
        const amqpServer = "amqp://admin:admin123@rabbitmq_eai:5672";
        connection = await amqplib.connect(amqpServer);
        channel = await connection.createChannel();
        
        await channel.assertQueue('q_farmasi_in', { durable: true });
        await channel.assertQueue('q_gateway_in', { durable: true }); // Untuk ngirim balik tagihan

        console.log("farmasi sukses konek rabbitmq");

        channel.consume('q_farmasi_in', async (msg) => {
            if (msg.content) {
                const xmlData = msg.content.toString();
                console.log("dapet data xml dari gateway:\n", xmlData);
                
                // Parse XML kembali ke Objek JS
                const parser = new xml2js.Parser({ explicitArray: false });
                parser.parseString(xmlData, async (err, result) => {
                    if (err) {
                        console.error("Gagal parse XML", err);
                        return channel.ack(msg);
                    }

                    const resep = result.ResepFarmasi;
                    const id_pasien = resep.PasienID;
                    const kode_obat = resep.KodeObat;
                    const jumlah = parseInt(resep.Qty);

                    try {
                        // Proses Database (Kurangi stok obat)
                        const db = await mysql.createConnection(dbConfig);
                        const [rows] = await db.execute('SELECT stok, harga FROM stok_obat WHERE kode_obat = ?', [kode_obat]);
                        
                        if (rows.length > 0) {
                            const harga_total = rows[0].harga * jumlah;
                            
                            // Eksekusi kurang stok
                            await db.execute('UPDATE stok_obat SET stok = stok - ? WHERE kode_obat = ?', [jumlah, kode_obat]);
                            console.log(`Berhasil! Stok ${kode_obat} dikurangi ${jumlah}. Harga obat = Rp${harga_total}`);

                            // kirim total harga obat ke gateway biar dimasukin ke tagihan
                            const payload = {
                                tipe_pesan: "UPDATE_TAGIHAN",
                                id_pasien: id_pasien,
                                total_tagihan: harga_total,
                                keterangan: `Pembelian obat ${kode_obat} x${jumlah}`
                            };
                            channel.sendToQueue('q_gateway_in', Buffer.from(JSON.stringify(payload)), { persistent: true });
                        } else {
                            console.log("Obat tidak ditemukan di database!");
                        }
                        await db.end();
                    } catch (dbErr) {
                        console.error("Error DB:", dbErr);
                    }
                    
                    channel.ack(msg);
                });
            }
        });
    } catch (err) {
        console.error("Gagal koneksi RabbitMQ...", err);
        setTimeout(connectRabbitMQ, 5000);
    }
}
connectRabbitMQ();

app.get('/', (req, res) => res.json({ service: 'farmasi', status: 'ready (Legacy XML Mode)' }));

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log('Farmasi running on port ' + PORT));
