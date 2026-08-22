// ============================================================
// KONFIGURASI
// ============================================================
// Nama tab sheet Daftar Hadir
var SHEET_NAME = "Table1";

// Nama HEADER (baris pertama sheet) yang dicari otomatis.
// Tidak lagi bergantung pada posisi/urutan kolom.
// Sesuaikan teks ini persis dengan header di sheet Anda (tidak case-sensitive).
var HEADER_NAMA     = "Nama";
var HEADER_INSTANSI = "Instansi";
var HEADER_STATUS   = "Status Kehadiran";
var HEADER_WAKTU    = "Waktu Check-In";
var HEADER_ID       = "ID";

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'test') {
    return jsonOutput({
      status: "OK",
      message: "Backend aktif dan siap menerima check-in.",
      timestamp: new Date().toISOString()
    });
  }

  // Buka SCRIPT_URL + "?action=debug" di browser untuk cek pemetaan kolom
  if (e && e.parameter && e.parameter.action === 'debug') {
    return jsonOutput(debugSheetInfo());
  }

  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Check-In System - AMSI Riau')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}

function doPost(e) {
  var result;
  try {
    var payload = JSON.parse(e.postData.contents);
    result = processCheckIn(payload.qrText);
  } catch (err) {
    result = {
      status: "ERROR",
      message: "Gagal memproses permintaan: " + err.message
    };
  }
  return jsonOutput(result);
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Ambil sheet + data + hasil pemetaan kolom berdasarkan nama header
function getSheetAndColumns() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();

  if (data.length === 0) {
    throw new Error("Sheet '" + sheet.getName() + "' kosong.");
  }

  var headers = data[0].map(function (h) {
    return h.toString().trim().toLowerCase();
  });

  function findCol(name) {
    var idx = headers.indexOf(name.toString().trim().toLowerCase());
    if (idx === -1) {
      throw new Error(
        "Kolom header '" + name + "' tidak ditemukan. Header yang terbaca: [" + headers.join(", ") + "]"
      );
    }
    return idx;
  }

  return {
    sheet: sheet,
    data: data,
    col: {
      nama: findCol(HEADER_NAMA),
      instansi: findCol(HEADER_INSTANSI),
      status: findCol(HEADER_STATUS),
      waktu: findCol(HEADER_WAKTU),
      id: findCol(HEADER_ID)
    }
  };
}

// Endpoint bantu untuk memastikan pemetaan kolom & data sudah benar
function debugSheetInfo() {
  try {
    var ctx = getSheetAndColumns();
    return {
      status: "OK",
      sheetName: ctx.sheet.getName(),
      headers: ctx.data[0],
      columnMapping: ctx.col,
      totalDataRows: ctx.data.length - 1,
      sampleRow: ctx.data.length > 1 ? ctx.data[1] : null
    };
  } catch (err) {
    return { status: "ERROR", message: err.message };
  }
}

function processCheckIn(rawQrText) {
  var ctx = getSheetAndColumns();
  var sheet = ctx.sheet;
  var data = ctx.data;
  var col = ctx.col;

  var extractedId = extractIdFromQr(rawQrText);

  for (var i = 1; i < data.length; i++) {
    var rowId = normalizeId(data[i][col.id]);

    if (rowId !== "" && rowId === extractedId) {
      var nama = data[i][col.nama];
      var instansi = data[i][col.instansi];
      var status = (data[i][col.status] || "").toString().trim().toLowerCase();

      if (status === "hadir") {
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

        sheet.getRange(i + 1, col.status + 1).setValue("Hadir");
        sheet.getRange(i + 1, col.waktu + 1).setValue(formattedDate);

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
    message: "ID Tiket Tidak Ditemukan! (ID discan: '" + extractedId + "')"
  };
}

function normalizeId(val) {
  if (val === null || val === undefined || val === "") return "";
  return val.toString().trim();
}

function extractIdFromQr(text) {
  var str = text.toString().replace(/\r\n/g, "\n").trim();
  if (str.indexOf("ID:") !== -1) {
    var lines = str.split("\n");
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].indexOf("ID:") !== -1) {
        return normalizeId(lines[i].replace("ID:", ""));
      }
    }
  }
  return normalizeId(str);
}
