const apiKey = 'YOUR_API_KEY';
const spreadsheetId = 'YOUR_SPREADSHEET_ID';
const inventoryRange = 'Inventory';
const borrowLogsRange = 'BorrowLogs';

// Load Data on Page Load
window.onload = () => {
  loadInventory();
  loadBorrowLogs();
};

// =======================
// Inventory CRUD
// =======================
async function loadInventory() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${inventoryRange}?key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  renderTable(data.values, 'inventory');
  renderAddForm(data.values[0], 'Tool', handleAddInventory);
}

function renderTable(rows, type) {
  const [headerRow, ...dataRows] = rows;
  const headerElement = document.getElementById(`${type}Header`);
  const bodyElement = document.getElementById(`${type}Body`);

  headerElement.innerHTML = '';
  bodyElement.innerHTML = '';

  headerRow.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col;
    headerElement.appendChild(th);
  });

  dataRows.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    headerRow.forEach((_, colIndex) => {
      const td = document.createElement('td');
      td.textContent = row[colIndex] || '';
      tr.appendChild(td);
    });
    bodyElement.appendChild(tr);
  });
}

function renderAddForm(headers, defaultLabel, onSubmit) {
  const formDiv = document.getElementById(`add${defaultLabel}Form`);
  formDiv.innerHTML = '';

  headers.forEach(header => {
    const input = document.createElement('input');
    input.placeholder = header;
    input.name = header;
    formDiv.appendChild(input);
  });

  const button = document.createElement('button');
  button.textContent = 'Add';
  button.onclick = () => {
    const inputs = formDiv.querySelectorAll('input');
    const newRow = Array.from(inputs).map(i => i.value);
    onSubmit(newRow);
  };
  formDiv.appendChild(button);
}

async function handleAddInventory(newRow) {
  await appendRowToSheet(inventoryRange, newRow);
  loadInventory();
}

// =======================
// Borrow Logs CRUD
// =======================
async function loadBorrowLogs() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${borrowLogsRange}?key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  renderTable(data.values, 'borrowLogs');
  renderAddForm(data.values[0], 'Borrow', handleAddBorrowLog);
}

async function handleAddBorrowLog(newRow) {
  await appendRowToSheet(borrowLogsRange, newRow);
  loadBorrowLogs();
}

// =======================
// Helper: Append to Sheet
// =======================
async function appendRowToSheet(sheetName, row) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}:append?valueInputOption=USER_ENTERED&key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({ values: [row] }),
    headers: {
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) {
    alert('Error writing to sheet');
  }
}
