const API_URL = 'http://localhost';

// 1. Registrasi Pasien
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nama = document.getElementById('nama').value;
    const alamat = document.getElementById('alamat').value;
    const alertBox = document.getElementById('registerAlert');
    const btn = e.target.querySelector('button');

    try {
        btn.disabled = true;
        btn.textContent = 'Memproses...';
        
        const response = await fetch(`${API_URL}:3001/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nama, alamat })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert(alertBox, 'success', `Berhasil! ID Pasien Anda: <strong>${data.id_pasien}</strong>`);
            // Auto-fill ID to other forms
            document.getElementById('id_pasien').value = data.id_pasien;
            document.getElementById('search_id').value = data.id_pasien;
            e.target.reset();
        } else {
            showAlert(alertBox, 'error', data.error || 'Gagal mendaftar');
        }
    } catch (err) {
        showAlert(alertBox, 'error', 'Sistem Registrasi tidak dapat dihubungi. Pastikan Docker menyala.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Daftar Pasien';
    }
});

// 2. Resep Farmasi
document.getElementById('resepForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id_pasien = document.getElementById('id_pasien').value;
    const kode_obat = document.getElementById('kode_obat').value;
    const jumlah = parseInt(document.getElementById('jumlah').value);
    const alertBox = document.getElementById('resepAlert');
    const btn = e.target.querySelector('button');

    try {
        btn.disabled = true;
        btn.textContent = 'Mengirim Resep...';
        
        const response = await fetch(`${API_URL}:3002/resep`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_pasien, kode_obat, jumlah })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert(alertBox, 'success', 'Resep berhasil dikirim ke Farmasi (Via RabbitMQ & XML)');
        } else {
            showAlert(alertBox, 'error', data.error || 'Gagal mengirim resep');
        }
    } catch (err) {
        showAlert(alertBox, 'error', 'Sistem Rekam Medis tidak dapat dihubungi.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Kirim Resep';
    }
});

// 3. Cek Tagihan
document.getElementById('btnSearch').addEventListener('click', async () => {
    const id_pasien = document.getElementById('search_id').value;
    if (!id_pasien) return alert('Masukkan ID Pasien terlebih dahulu!');
    
    const resultBox = document.getElementById('billingResult');
    const btn = document.getElementById('btnSearch');
    
    try {
        btn.disabled = true;
        btn.textContent = 'Mencari...';
        
        const response = await fetch(`${API_URL}:3004/tagihan/${id_pasien}`);
        const data = await response.json();
        
        if (response.ok && data.detail_tagihan.length > 0) {
            document.getElementById('bill_id').textContent = id_pasien;
            
            const tbody = document.getElementById('billBody');
            tbody.innerHTML = '';
            
            let total = 0;
            data.detail_tagihan.forEach(item => {
                const amount = parseFloat(item.total_tagihan);
                total += amount;
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.keterangan}</td>
                    <td>Rp ${amount.toLocaleString('id-ID')}</td>
                `;
                tbody.appendChild(tr);
            });
            
            document.getElementById('billTotal').textContent = `Rp ${total.toLocaleString('id-ID')}`;
            resultBox.classList.remove('hidden');
        } else {
            alert('Tagihan tidak ditemukan atau belum ada data untuk ID ini.');
            resultBox.classList.add('hidden');
        }
    } catch (err) {
        alert('Sistem Billing tidak dapat dihubungi.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Cek Tagihan';
    }
});

// Helper Function
function showAlert(element, type, message) {
    element.className = `alert ${type}`;
    element.innerHTML = message;
    element.classList.remove('hidden');
    
    setTimeout(() => {
        element.classList.add('hidden');
    }, 8000);
}
