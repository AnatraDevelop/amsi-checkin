// ============================================================
// SYNC ID: Form Responses  ->  Table1
// ============================================================
// Menyalin kolom ID dari sheet "Form Responses" ke sheet "Table1"
// dengan mencocokkan berdasarkan EMAIL (bukan urutan baris),
// supaya aman walau urutan baris di kedua sheet berbeda.
//
// CARA PAKAI:
// 1. Sesuaikan nama sheet & nama header di bagian KONFIGURASI di bawah
//    kalau berbeda dengan punya Anda.
// 2. Jalankan fungsi syncIdColumn() sekali secara manual (Run > syncIdColumn)
//    untuk mengisi data yang sudah ada.
// 3. (Opsional) Pasang sebagai trigger "On form submit" di menu
//    Triggers (jam kecil di sidebar kiri Apps Script) supaya peserta
//    baru otomatis ke-sync setiap kali form diisi.
// ============================================================

var SOURCE_SHEET_NAME = "Form Responses";
var SOURCE_HEADER_EMAIL = "Email";
var SOURCE_HEADER_ID    = "ID";

var TARGET_SHEET_NAME = "Table1";
var TARGET_HEADER_EMAIL = "Email";
var TARGET_HEADER_ID    = "ID"; // <- pastikan header ini sudah ada di Table1 (ganti "Column 1" jadi "ID" dulu)

function syncIdColumn() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var sourceSheet = ss.getSheetByName(SOURCE_SHEET_NAME);
  var targetSheet = ss.getSheetByName(TARGET_SHEET_NAME);

  if (!sourceSheet) throw new Error("Sheet sumber '" + SOURCE_SHEET_NAME + "' tidak ditemukan.");
  if (!targetSheet) throw new Error("Sheet tujuan '" + TARGET_SHEET_NAME + "' tidak ditemukan.");

  var sourceData = sourceSheet.getDataRange().getValues();
  var targetData = targetSheet.getDataRange().getValues();

  var sourceHeaders = sourceData[0].map(function (h) { return h.toString().trim().toLowerCase(); });
  var targetHeaders = targetData[0].map(function (h) { return h.toString().trim().toLowerCase(); });

  var srcEmailCol = sourceHeaders.indexOf(SOURCE_HEADER_EMAIL.toLowerCase());
  var srcIdCol = sourceHeaders.indexOf(SOURCE_HEADER_ID.toLowerCase());
  var tgtEmailCol = targetHeaders.indexOf(TARGET_HEADER_EMAIL.toLowerCase());
  var tgtIdCol = targetHeaders.indexOf(TARGET_HEADER_ID.toLowerCase());

  if (srcEmailCol === -1) throw new Error("Header '" + SOURCE_HEADER_EMAIL + "' tidak ditemukan di " + SOURCE_SHEET_NAME);
  if (srcIdCol === -1) throw new Error("Header '" + SOURCE_HEADER_ID + "' tidak ditemukan di " + SOURCE_SHEET_NAME);
  if (tgtEmailCol === -1) throw new Error("Header '" + TARGET_HEADER_EMAIL + "' tidak ditemukan di " + TARGET_SHEET_NAME);
  if (tgtIdCol === -1) throw new Error("Header '" + TARGET_HEADER_ID + "' tidak ditemukan di " + TARGET_SHEET_NAME + " (ganti dulu header 'Column 1' jadi 'ID')");

  // Bangun peta email -> ID dari sheet sumber
  var emailToId = {};
  for (var i = 1; i < sourceData.length; i++) {
    var email = (sourceData[i][srcEmailCol] || "").toString().trim().toLowerCase();
    var id = (sourceData[i][srcIdCol] || "").toString().trim();
    if (email !== "" && id !== "") {
      emailToId[email] = id;
    }
  }

  var updated = 0;
  var notFound = [];

  for (var r = 1; r < targetData.length; r++) {
    var targetEmail = (targetData[r][tgtEmailCol] || "").toString().trim().toLowerCase();
    var existingId = (targetData[r][tgtIdCol] || "").toString().trim();

    if (existingId !== "") continue; // sudah ada, skip

    if (targetEmail !== "" && emailToId[targetEmail]) {
      targetSheet.getRange(r + 1, tgtIdCol + 1).setValue(emailToId[targetEmail]);
      updated++;
    } else {
      notFound.push("Baris " + (r + 1) + " (email: '" + targetEmail + "')");
    }
  }

  var msg = "Sinkronisasi selesai. " + updated + " baris di-update.";
  if (notFound.length > 0) {
    msg += " Tidak ditemukan pasangan ID untuk: " + notFound.join(", ");
  }
  Logger.log(msg);
  return msg;
}

// Trigger otomatis: panggil ini tiap ada submit form baru (pasang lewat menu Triggers)
function onFormSubmitSyncId(e) {
  syncIdColumn();
}
