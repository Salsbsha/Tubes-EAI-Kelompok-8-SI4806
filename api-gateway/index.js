const express = require('express');
const amqplib = require('amqplib');
const xml2js = require('xml2js');

const app = express();
app.use(express.json());

let channel, connection;
async function connectRabbitMQ() {
    try {
        const amqpServer = "amqp://admin:admin123@rabbitmq_eai:5672";
        connection = await amqplib.connect(amqpServer);
        channel = await connection.createChannel();
        
        // Deklarasi Antrean
        await channel.assertQueue('q_gateway_in', { durable: true });
        await channel.assertQueue('q_farmasi_in', { durable: true });
        await channel.assertQueue('q_billing_in', { durable: true });

        console.log("API Gateway (Router & Translator) terhubung ke RabbitMQ");

        // EIP: Message Router & Translator
        channel.consume('q_gateway_in', (msg) => {
            if (msg.content) {
                const data = JSON.parse(msg.content.toString());
                console.log("Gateway menerima pesan dengan tipe:", data.tipe_pesan);

                // Pola 1: Content-Based Router (Berdasarkan Tipe Pesan)
                if (data.tipe_pesan === 'KIRIM_RESEP') {
                    // Pola 2: Message Translator (JSON -> XML)
                    const builder = new xml2js.Builder({ rootName: 'ResepFarmasi' });
                    const xmlPayload = builder.buildObject({
                        PasienID: data.id_pasien,
                        KodeObat: data.kode_obat,
                        Qty: data.jumlah
                    });

                    console.log("-> Meneruskan ke Farmasi dalam format XML");
                    // Rute ke antrean Farmasi
                    channel.sendToQueue('q_farmasi_in', Buffer.from(xmlPayload), { persistent: true });
                    
                } else if (data.tipe_pesan === 'UPDATE_TAGIHAN') {
                    console.log("-> Meneruskan ke Billing dalam format JSON");
                    // Rute ke antrean Billing (tetap JSON)
                    channel.sendToQueue('q_billing_in', Buffer.from(JSON.stringify(data)), { persistent: true });
                }
                
                channel.ack(msg);
            }
        });

    } catch (err) {
        console.error("Gagal koneksi RabbitMQ, mencoba lagi...", err);
        setTimeout(connectRabbitMQ, 5000);
    }
}
connectRabbitMQ();

app.get('/', (req, res) => res.json({ service: 'api-gateway', status: 'ready' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('API Gateway running on port ' + PORT));
