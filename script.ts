/************************************************
 * 1) Operator Prefixes
 ***********************************************/
const OPERATOR_PREFIXES = {
  'Orange': ['60','61','62','63','68','69'],
  'Moldcell': ['76','78','79'],
  'Unite': ['67'],
  'Moldtelecom': ['2']
};

/************************************************
 * 2) Utility / Helper Functions
 ***********************************************/

// Convert to string, remove non-digits, ensure 8 digits
function cleanSourceNumber(numberStr) {
  if (!numberStr) return null;
  let cleaned = String(numberStr).replace(/\D/g, '');
  if (!cleaned) return null;

  if (cleaned.length >= 8) {
    // Check valid prefix
    for (const [operator, prefixes] of Object.entries(OPERATOR_PREFIXES)) {
      for (const prefix of prefixes) {
        if (cleaned.startsWith(prefix)) {
          // Keep first 8 digits
          return cleaned.slice(0, 8);
        }
      }
    }
    // If no valid prefix, remove leading zero if present
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.slice(1);
    }
    return cleaned.slice(0,8).padStart(8, '0');
  }
  // Otherwise pad to 8
  return cleaned.padStart(8, '0');
}

// Format "Tip" (e.g. date -> "Apr/2023", or "Număr nou")
function formatTipDate(tip) {
  if (typeof tip === 'string' && tip === 'Număr nou') {
    return tip;
  }
  const date = new Date(tip);
  if (!isNaN(date.getTime())) {
    const monthShort = date.toLocaleString('en', { month: 'short' });
    const year = date.getFullYear();
    return `${monthShort}/${year}`;
  }
  return tip;
}

// Generate a variation by changing X random digits
function generateNumberVariation(baseNumber, digitsToVary, operator) {
  if (!baseNumber || baseNumber.length !== 8) return null;
  const prefix = baseNumber.slice(0,2);
  
  // Validate prefix belongs to the operator
  let validPrefix = false;
  for (const p of OPERATOR_PREFIXES[operator] || []) {
    if (prefix.startsWith(p)) {
      validPrefix = true;
      break;
    }
  }
  if (!validPrefix) return null;

  let remaining = baseNumber.slice(2);
  let newDigits = remaining.split('');

  // pick random positions
  let positions = [];
  while (positions.length < digitsToVary) {
    const rnd = Math.floor(Math.random() * newDigits.length);
    if (!positions.includes(rnd)) positions.push(rnd);
  }

  // change each chosen position to random digit
  for (const pos of positions) {
    newDigits[pos] = String(Math.floor(Math.random() * 10));
  }
  const newNumber = prefix + newDigits.join('');

  if (newNumber.length !== 8) return null;

  // ensure final prefix is valid
  let finalValid = false;
  for (const p of OPERATOR_PREFIXES[operator] || []) {
    if (newNumber.startsWith(p)) {
      finalValid = true;
      break;
    }
  }
  return finalValid ? newNumber : null;
}

// Read Excel from <input type="file"> using SheetJS
function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        resolve(jsonData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

/************************************************
 * 3) Main Logic: generate phone number variations
 ***********************************************/
async function generateNumbers() {
  const sourceFileEl = document.getElementById('sourceFile');
  const blacklistFileEl = document.getElementById('blacklistFile');
  const variationsEl = document.getElementById('variations');
  const digitsToVaryEl = document.getElementById('digitsToVary');
  const errorMsgEl = document.getElementById('errorMsg');

  // Clear error
  errorMsgEl.textContent = '';

  // Basic checks
  if (!sourceFileEl.files.length) {
    errorMsgEl.textContent = 'Please upload a source file.';
    return null;
  }
  const variations = parseInt(variationsEl.value, 10);
  const digitsToVary = parseInt(digitsToVaryEl.value, 10);
  if (isNaN(variations) || isNaN(digitsToVary) || digitsToVary < 1 || digitsToVary > 6) {
    errorMsgEl.textContent = 'Invalid number of digits to vary (must be 1-6).';
    return null;
  }

  let sourceData = [];
  let blacklistData = [];

  // Read Excel files
  try {
    sourceData = await readExcelFile(sourceFileEl.files[0]);
    if (blacklistFileEl.files.length) {
      blacklistData = await readExcelFile(blacklistFileEl.files[0]);
    }
  } catch (err) {
    errorMsgEl.textContent = 'Error reading Excel files: ' + err.message;
    return null;
  }

  // Build a Set of blacklisted phone numbers
  const blacklistSet = new Set();
  for (const row of blacklistData) {
    const cleaned = cleanSourceNumber(row.Phone);
    if (cleaned) blacklistSet.add(cleaned);
  }

  // Clean & filter source
  let validSource = [];
  for (const row of sourceData) {
    const phone = cleanSourceNumber(row.Phone);
    if (!phone) continue;

    // Must match at least one known prefix
    let match = false;
    for (const [op, prefixes] of Object.entries(OPERATOR_PREFIXES)) {
      for (const prefix of prefixes) {
        if (phone.startsWith(prefix)) {
          match = true;
          break;
        }
      }
      if (match) break;
    }
    if (!match) continue;
    if (blacklistSet.has(phone)) continue;

    // Format tip
    const tip = formatTipDate(row.Tip || '');
    const operator = row.Operator || '';
    // skip if operator is unknown
    if (!OPERATOR_PREFIXES[operator]) continue;
    
    validSource.push({
      Phone: phone,
      Operator: operator,
      Tip: tip
    });
  }

  // Generate new numbers
  const newNumbers = [];
  const usedNumbers = new Set(validSource.map(v => v.Phone));

  for (const row of validSource) {
    const baseNumber = row.Phone;
    const operator = row.Operator;
    let counter = 0;
    let attempts = 0;
    const maxAttempts = variations * 10;

    while (counter < variations && attempts < maxAttempts) {
      const gen = generateNumberVariation(baseNumber, digitsToVary, operator);
      attempts++;
      if (!gen) continue;
      if (!usedNumbers.has(gen) && !blacklistSet.has(gen)) {
        usedNumbers.add(gen);
        newNumbers.push({
          Phone: gen,
          Tip: 'Număr nou',
          Operator: operator
        });
        counter++;
      }
    }
  }

  // Combine and shuffle
  const finalData = [...validSource, ...newNumbers];
  for (let i = finalData.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [finalData[i], finalData[j]] = [finalData[j], finalData[i]];
  }
  return finalData;
}

/************************************************
 * 4) Build & Download the Resulting Excel
 ***********************************************/
function downloadExcel(jsonData) {
  const ws = XLSX.utils.json_to_sheet(jsonData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Generated Numbers');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'generated_numbers.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/************************************************
 * 5) Attach Event Listeners
 ***********************************************/
document.getElementById('generateBtn').addEventListener('click', async () => {
  const outputSection = document.getElementById('output-section');
  outputSection.classList.add('hidden');

  const result = await generateNumbers();
  if (!result) return;

  // Store result globally so we can download in next step
  window.generatedData = result;
  outputSection.classList.remove('hidden');
});

document.getElementById('downloadBtn').addEventListener('click', () => {
  if (window.generatedData && window.generatedData.length) {
    downloadExcel(window.generatedData);
  }
});
