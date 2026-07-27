function doGet(e) {
  // Endpoint diagnostik: buka SCRIPT_URL + "?action=test" langsung di
  // browser manapun untuk memastikan deployment ini hidup dan sudah versi
  // terbaru (tanpa perlu kamera / halaman scanner sama sekali).
  if (e && e.parameter && e.parameter.action === 'test') {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "OK",
        message: "Backend aktif dan siap menerima check-in.",
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Fallback: tetap bisa dibuka langsung, tapi kamera kemungkinan tidak
  // akan berfungsi di sini karena Apps Script merender halaman di dalam
  // iframe internal yang tidak diberi izin "camera" oleh Google.
  // Gunakan index.html versi hosting eksternal (GitHub Pages) untuk scanner.
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Check-In System - AMSI Riau')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}

// ============================================================
// ENDPOINT API BACKEND (dipanggil via fetch() dari HTML yang
// di-hosting terpisah, misalnya GitHub Pages / Firebase Hosting)
// ============================================================
function doPost(e) {
  var result;
  try {
    var payload = JSON.parse(e.postData.contents);
    var rawQrText = payload.qrText;
    result = processCheckIn(rawQrText);
  } catch (err) {
    result = {
      status: "ERROR",
      message: "Gagal memproses permintaan: " + err.message
    };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function processCheckIn(rawQrText) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Form_Responses");
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]; // Ambil sheet pertama jika nama beda
  }
  
  var data = sheet.getDataRange().getValues();
  var extractedId = extractIdFromQr(rawQrText);
  
  // Mencari ID di Kolom F (Index 5)
  for (var i = 1; i < data.length; i++) {
    var rowId = data[i][5].toString().trim(); // Kolom F = Index 5
    
    if (rowId === extractedId) {
      var nama = data[i][1];     // Kolom B = Index 1
      var instansi = data[i][2]; // Kolom C = Index 2
      var status = data[i][7];   // Kolom H = Index 7
      
      if (status === "Hadir") {
        return {
          status: "ALREADY_CHECKED_IN",
          nama: nama,
          instansi: instansi,
          message: "Peserta SUDAH Melakukan Registrasi Sebelumnya!"
        };
      } else {
        var now = new Date();
        var formattedDate = Utilities.formatDate(
          now, 
          SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), 
          "dd/MM/yyyy HH:mm:ss"
        );
        
        // Update Status Kehadiran (Kolom H / Index 8) & Timestamp (Kolom I / Index 9)
        sheet.getRange(i + 1, 8).setValue("Hadir");
        sheet.getRange(i + 1, 9).setValue(formattedDate);
        
        return {
          status: "SUCCESS",
          nama: nama,
          instansi: instansi,
          message: "Registrasi Berhasil!"
        };
      }
    }
  }
  
  return {
    status: "NOT_FOUND",
    message: "ID Tiket Tidak Ditemukan!"
  };
}

// Fungsi pembantu mengekstrak ID dari QR Code multi-baris
function extractIdFromQr(text) {
  var str = text.toString().trim();
  if (str.indexOf("ID:") !== -1) {
    var lines = str.split("\n");
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].indexOf("ID:") !== -1) {
        return lines[i].replace("ID:", "").trim();
      }
    }
  }
  return str; // Jika QR hanya berisi ID langsung
}
