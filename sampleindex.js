const apiKey = 'YOUR_API_KEY';
const spreadsheetId = 'YOUR_SPREADSHEET_ID';

const inventoryRange = 'Inventory';
const borrowLogsRange = 'BorrowLogs';

let inventoryData = [];
let borrowLogsData = [];

// Load Data on Page Load
window.onload = () => {
  loadInventory();
  loadBorrowLogs();

  document.getElementById('filterInventory').addEventListener('input', e => {
    renderTable(filterData(inventoryData, e.target.value), 'inventory');
  });
  document.getElementById('filterBorrow').addEventListener('input', e => {
    renderTable(filterData(borrowLogsData, e.target.value), 'borrowLogs');
  });
};

// Utility: Filter rows by search term (case insensitive, matches any cell)
function filterData(data, searchTerm) {
  if (!searchTerm) return data;
  searchTerm = searchTerm.toLowerCase();
  const header = data[0];
  const filtered = data.filter((row, i) => {
    if (i === 0) return true; // always keep header
    return row.some(cell => (cell || '').toString().toLowerCase().includes(searchTerm));
  });
  return filtered;
}

// =======================
// Inventory CRUD
// =======================
async function loadInventory() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${inventoryRange}?key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  inventoryData = data.values || [];
  renderTable(inventoryData, 'inventory');
  renderAddForm(inventoryData[0], 'Tool', handleAddInventory);
}

function renderTable(rows, type) {
  const [headerRow, ...dataRows] = rows;
  const headerElement = document.getElementById(`${type}Header`);
  const bodyElement = document.getElementById(`${type}Body`);

  headerElement.innerHTML = '';
  bodyElement.innerHTML = '';

  // Render headers + extra for actions
  headerRow.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col;
    headerElement.appendChild(th);
  });
  const thActions = document.createElement('th');
  thActions.textContent = 'Actions';
  headerElement.appendChild(thActions);

  // Render rows
  dataRows.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    headerRow.forEach((colName, colIndex) => {
      const td = document.createElement('td');

      if (type === 'borrowLogs' && ['DateBorrow', 'ExpectedDateReturn', 'DateReturn'].includes(colName)) {
        // Date picker input
        const input = document.createElement('input');
        input.type = 'date';
        input.value = row[colIndex] || '';
        input.addEventListener('change', () => handleCellUpdate(type, rowIndex + 1, colIndex, input.value));
        td.appendChild(input);
      } else {
        // Editable text cell
        const span = document.createElement('span');
        span.textContent = row[colIndex] || '';
        span.classList.add('editable-cell');
        span.addEventListener('click', () => makeCellEditable(span, type, rowIndex + 1, colIndex));
        td.appendChild(span);
      }

      tr.appendChild(td);
    });

    // Actions cell with Delete button
    const tdActions = document.createElement('td');
    const delBtn = document.createElement('span');
    delBtn.textContent = 'Delete';
    delBtn.classList.add('btn-delete');
    delBtn.addEventListener('click', () => handleDeleteRow(type, rowIndex + 1));
    tdActions.appendChild(delBtn);
    tr.appendChild(tdActions);

    bodyElement.appendChild(tr);
  });
}

// Inline editing text input
function makeCellEditable(span, sheetName, rowIndex, colIndex) {
  const oldVal = span.textContent;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = oldVal;
  input.style.width = '90%';

  input.onblur = () => {
    const newVal = input.value;
    span.textContent = newVal;
    span.style.display = '';
    input.remove();

    if (newVal !== oldVal) {
      handleCellUpdate(sheetName, rowIndex, colIndex, newVal);
    }
  };
  input.onkeydown = e => {
    if (e.key === 'Enter') {
      input.blur();
    }
    if (e.key === 'Escape') {
      input.value = oldVal;
      input.blur();
    }
  };

  span.style.display = 'none';
  span.parentNode.appendChild(input);
  input.focus();
}

// Update single cell in Google Sheets
async function handleCellUpdate(sheetName, rowIndex, colIndex, newValue) {
  // Row and column are 1-based for Sheets API ranges.
  // Columns are letters A-Z. Let's convert index to letter:
  const colLetter = columnToLetter(colIndex + 1);
  const range = `${sheetName}!${colLetter}${rowIndex + 1}`; // +1 because header is row 1

  const body = {
    range,
    values: [[newValue]],
  };

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED&key=${apiKey}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    alert('Failed to update cell');
  } else {
    if(sheetName === 'inventory') loadInventory();
    else loadBorrowLogs();
  }
}

// Convert number to Excel-style column letter (1 → A, 2 → B, 27 → AA)
function columnToLetter(column) {
  let temp, letter = '';
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}

// Delete entire row by overwriting range (Google Sheets API has no direct row delete via REST API)
// So we "clear" the row contents. Alternatively, we can get all rows, remove one and overwrite all.
// We'll do "clear" here for simplicity.

async function handleDeleteRow(sheetName, rowIndex) {
  if (!confirm('Are you sure you want to delete this row?')) return;

  // Clear row contents
  const colCount = sheetName === 'inventory' ? inventoryData[0].length : borrowLogsData[0].length;
  const startCol = 'A';
  const endCol = columnToLetter(colCount);
  const range = `${sheetName}!${startCol}${rowIndex + 1}:${endCol}${rowIndex + 1}`;

  // Clear values by setting empty strings
  const emptyRow = new Array(colCount).fill('');
  const body = {
    range,
    values: [emptyRow],
  };

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED&key=${apiKey}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) alert('Failed to delete row');
  else {
    if(sheetName === 'inventory') loadInventory();
    else loadBorrowLogs();
  }
}

// Add new row form rendering (same as before but now uses date inputs for borrow logs)
function renderAddForm(headers, defaultLabel, onSubmit) {
  const formDiv = document.getElementById(`add${defaultLabel}Form`);
  formDiv.innerHTML = '';

  headers.forEach(header => {
    const input = document.createElement('input');
    input.name = header;
    input.placeholder = header;

    // For BorrowLogs date columns use date input
    if (defaultLabel === 'Borrow' && ['DateBorrow', 'ExpectedDateReturn', 'DateReturn'].includes(header)) {
      input.type = 'date';
    } else if (header.match(/Qty|Available|CheckedOut|ForMaintenance|Broken|Lost|TotalQty/)) {
      input.type = 'number';
      input.min = 0;
    } else {
      input.type = 'text';
    }
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

// Add new inventory tool row
async function handleAddInventory(newRow) {
  await appendRowToSheet(inventoryRange, newRow);
  loadInventory();
}

// Add new borrow log row
async function handleAddBorrowLog(newRow) {
  await appendRowToSheet(borrowLogsRange, newRow);
  loadBorrowLogs();
}

// Append new row to sheet
async function appendRowToSheet(sheetName, row) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}:append?valueInputOption=USER_ENTERED&key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({ values: [row] }),
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) alert('Error writing to sheet');
}

async function loadBorrowLogs() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${borrowLogsRange}?key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  borrowLogsData = data.values || [];
  renderTable(borrowLogsData, 'borrowLogs');
  renderAddForm(borrowLogsData[0], 'Borrow', handleAddBorrowLog);
}
