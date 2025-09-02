function doGet(e) {
  const action = e.parameter.action;

  if (action === "getInventory") return getInventory();
  if (action === "getLogs") return getBorrowLogs();
  if (action === "addInventory") return addInventory(e);
  if (action === "updateInventory") return updateInventory(e);
  if (action === "deleteInventory") return deleteInventory(e);
  if (action === "borrowTool") return borrowTool(e);

  return ContentService.createTextOutput("Invalid Request");
}

function getInventory() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Inventory");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const items = data.slice(1).map(row => {
    let item = {};
    headers.forEach((h, i) => item[h] = row[i]);
    return item;
  });

  return ContentService.createTextOutput(JSON.stringify(items)).setMimeType(ContentService.MimeType.JSON);
}

function getBorrowLogs() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("BorrowLogs");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const logs = data.slice(1).map(row => {
    let item = {};
    headers.forEach((h, i) => item[h] = row[i]);
    return item;
  });

  return ContentService.createTextOutput(JSON.stringify(logs)).setMimeType(ContentService.MimeType.JSON);
}

function addInventory(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Inventory");
  const data = JSON.parse(e.parameter.data);
  const values = Object.values(data);
  sheet.appendRow(values);
  return ContentService.createTextOutput("Added");
}

function updateInventory(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Inventory");
  const data = JSON.parse(e.parameter.data);
  const id = data.ID;
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] == id) {
      const headers = rows[0];
      headers.forEach((h, j) => {
        if (data[h] !== undefined) {
          sheet.getRange(i + 1, j + 1).setValue(data[h]);
        }
      });
      break;
    }
  }
  return ContentService.createTextOutput("Updated");
}

function deleteInventory(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Inventory");
  const id = e.parameter.id;
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] == id) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return ContentService.createTextOutput("Deleted");
}

function borrowTool(e) {
  const logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("BorrowLogs");
  const invSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Inventory");

  const data = JSON.parse(e.parameter.data);

  // Update log sheet
  const values = Object.values(data);
  logSheet.appendRow(values);

  // Update inventory: reduce Available, increase CheckedOut
  const toolId = data.ToolID;
  const borrowedQty = parseInt(data.BorrowedQty);
  const invData = invSheet.getDataRange().getValues();

  for (let i = 1; i < invData.length; i++) {
    if (invData[i][0] == toolId) {
      const available = parseInt(invData[i][2]) - borrowedQty;
      const checkedOut = parseInt(invData[i][3]) + borrowedQty;
      invSheet.getRange(i + 1, 3).setValue(available);
      invSheet.getRange(i + 1, 4).setValue(checkedOut);
      break;
    }
  }

  return ContentService.createTextOutput("Borrowed");
}
