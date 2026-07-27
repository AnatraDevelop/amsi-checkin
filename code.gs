// ============================================================
// KONFIGURASI — sesuaikan sekali di sini kalau struktur kolom berubah
// ============================================================
var SHEET_NAME   = "Table1";   // nama tab di spreadsheet DAFTAR HADIR
var COL_NAMA     = 1;          // B (0-based)
var COL_INSTANSI = 2;          // C
var COL_STATUS   = 5;          // F  -> Status Kehadiran
var COL_WAKTU    = 6;          // G  -> Waktu Check-In
var COL_ID       = 7;          // H  -> ID

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'test') {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "OK",
        message: "Backend aktif dan siap menerima check-in.",
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Check-In System - AMSI Riau')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}

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
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    // fallback jaga-jaga kalau nama tab beda
    sheet = ss.getSheets()[0];
  }

  var data = sheet.getDataRange().getValues();
  var extractedId = extractIdFromQr(rawQrText);

  for (var i = 1; i < data.length; i++) {
    var rowId = data[i][COL_ID] ? data[i][COL_ID].toString().trim() : "";

    if (rowId !== "" && rowId === extractedId) {
      var nama = data[i][COL_NAMA];
      var instansi = data[i][COL_INSTANSI];
      var status = data[i][COL_STATUS];

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
          ss.getSpreadsheetTimeZone(),
          "dd/MM/yyyy HH:mm:ss"
        );

        // +1 karena getRange 1-based, +1 lagi karena kolom index 0-based -> 1-based
        sheet.getRange(i + 1, COL_STATUS + 1).setValue("Hadir");
        sheet.getRange(i + 1, COL_WAKTU + 1).setValue(formattedDate);

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
    message: "ID Tiket Tidak Ditemukan! (ID discan: " + extractedId + ")"
  };
}

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
  return str;
}
