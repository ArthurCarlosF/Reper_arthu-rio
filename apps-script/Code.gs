const SHEET_NAME = "songs";

function doGet(event) {
  const action = event.parameter.action || "list";
  const callback = event.parameter.callback;
  const payload = action === "list" ? { songs: listSongs() } : { ok: true };
  const body = callback ? `${callback}(${JSON.stringify(payload)});` : JSON.stringify(payload);

  return ContentService.createTextOutput(body).setMimeType(
    callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON
  );
}

function doPost(event) {
  const action = event.parameter.action;
  if (action !== "save") {
    return jsonResponse({ ok: false, error: "Unsupported action" });
  }

  const song = JSON.parse(event.parameter.song || "{}");
  saveSong(song);
  return jsonResponse({ ok: true, song });
}

function listSongs() {
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  return values
    .slice(1)
    .filter((row) => row[0])
    .map((row) => ({
      id: row[0],
      title: row[1],
      artist: row[2],
      key: row[3],
      bpm: row[4],
      notes: row[5],
      lyrics: row[6],
      instruments: JSON.parse(row[7] || "[]"),
      updatedAt: row[8],
    }));
}

function saveSong(song) {
  validateSong(song);
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  const existingIndex = values.findIndex((row) => row[0] === song.id);
  const row = [
    song.id,
    song.title,
    song.artist,
    song.key || "",
    song.bpm || "",
    song.notes || "",
    song.lyrics || "",
    JSON.stringify(song.instruments || []),
    new Date().toISOString(),
  ];

  if (existingIndex >= 1) {
    sheet.getRange(existingIndex + 1, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
  ensureHeader(sheet);
  return sheet;
}

function ensureHeader(sheet) {
  const header = [
    "id",
    "title",
    "artist",
    "key",
    "bpm",
    "notes",
    "lyrics",
    "instruments",
    "updatedAt",
  ];
  const currentHeader = sheet.getRange(1, 1, 1, header.length).getValues()[0];
  if (currentHeader.join("") !== header.join("")) {
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
  }
}

function validateSong(song) {
  if (!song.id || !song.title || !song.artist) {
    throw new Error("Song requires id, title and artist");
  }
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}
