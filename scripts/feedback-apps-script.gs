var SPREADSHEET_ID = '1c84WeSC-WqXcZRgTB-31Ab-N2-DAULeV8Cj3FFybCNs';
var SHEET_NAME = 'Comentários';

function doGet() {
  return jsonResponse_({
    ok: true,
    service: 'SPU Feedback',
    material: 'M212'
  });
}

function doPost(event) {
  var lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);

    var data = event && event.parameter ? event.parameter : {};
    var material = clean_(data.material, 30);

    if (material !== 'M212') {
      return jsonResponse_({ ok: false, error: 'Material não autorizado.' });
    }

    var comment = clean_(data.comment, 2000);
    var author = clean_(data.author, 120);

    if (!comment || !author) {
      return jsonResponse_({ ok: false, error: 'Nome e comentário são obrigatórios.' });
    }

    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) {
      throw new Error('A aba "' + SHEET_NAME + '" não foi encontrada.');
    }

    var row = [
      clean_(data.id, 100) || Utilities.getUuid(),
      new Date(),
      material,
      clean_(data.page, 500),
      clean_(data.pageTitle, 300),
      clean_(data.type, 50),
      comment,
      author,
      clean_(data.selector, 500),
      clean_(data.excerpt, 500),
      number_(data.x),
      number_(data.y),
      'Pendente',
      ''
    ];

    sheet.appendRow(row);

    var rowNumber = sheet.getLastRow();
    sheet.getRange(rowNumber, 2).setNumberFormat('dd/mm/yyyy hh:mm');
    sheet.getRange(rowNumber, 11, 1, 2).setNumberFormat('0.00');
    sheet.getRange(rowNumber, 13).setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInList(['Pendente', 'Em análise', 'Resolvido'], true)
        .setAllowInvalid(false)
        .build()
    );

    return jsonResponse_({ ok: true, id: row[0] });
  } catch (error) {
    return jsonResponse_({ ok: false, error: String(error && error.message ? error.message : error) });
  } finally {
    try {
      lock.releaseLock();
    } catch (ignored) {}
  }
}

function clean_(value, maxLength) {
  var text = value == null ? '' : String(value).trim().slice(0, maxLength);
  if (/^[=+\-@]/.test(text)) text = "'" + text;
  return text;
}

function number_(value) {
  var number = Number(value);
  return isFinite(number) ? number : '';
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
