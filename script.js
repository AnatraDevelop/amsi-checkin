// --- 1. SETTING REAL-TIME CLOCK ---
function updateClock() {
    const now = new Date();
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    const dateOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    
    document.getElementById('time').innerText = now.toLocaleTimeString('id-ID', timeOptions).replace(/\./g, ':');
    document.getElementById('date').innerText = now.toLocaleDateString('id-ID', dateOptions);
}
setInterval(updateClock, 1000);
updateClock();

// --- 2. SETTING QR SCANNER ---
// MASUKKAN URL WEB APP GOOGLE APPS SCRIPT ANDA DI SINI
const APPS_SCRIPT_URL = "URL_WEB_APP_ANDA_DISINI"; 

let isScanning = true;
const html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: {width: 250, height: 250} }, false);

function onScanSuccess(decodedText, decodedResult) {
    if (!isScanning) return;
    isScanning = false; // Pause scanner agar tidak scan berulang kali

    html5QrcodeScanner.pause();
    
    // Tampilkan loading
    Swal.fire({
        title: 'Memproses Data...',
        text: 'Mohon tunggu sebentar',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    // Kirim ID ke Google Sheets
    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ id: decodedText })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "success") {
            // Pop-up Sukses
            Swal.fire({
                icon: 'success',
                title: 'Absensi Berhasil!',
                html: `<b>${data.nama}</b><br>${data.instansi}<br><small>Waktu: ${data.waktu}</small>`,
                confirmButtonText: 'Lanjut Scan'
            }).then(() => {
                isScanning = true;
                html5QrcodeScanner.resume();
            });
        } else {
            // Pop-up Gagal (ID tidak ditemukan)
            Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: 'ID tidak ditemukan dalam database!',
                confirmButtonText: 'Coba Lagi'
            }).then(() => {
                isScanning = true;
                html5QrcodeScanner.resume();
            });
        }
    })
    .catch(error => {
        Swal.fire('Error', 'Terjadi kesalahan jaringan', 'error');
        isScanning = true;
        html5QrcodeScanner.resume();
    });
}

function onScanFailure(error) {
    // Abaikan error saat proses mencari QR
}

html5QrcodeScanner.render(onScanSuccess, onScanFailure);