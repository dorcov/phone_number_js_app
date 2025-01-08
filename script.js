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

function cleanSourceNumber(numberStr) {
  if (!numberStr) return null;
  let cleaned = String(numberStr).replace(/\D/g, '');
  if (!cleaned) return null;

  if (cleaned.length >= 8) {
    for (const [operator, prefixes] of Object.entries(OPERATOR_PREFIXES)) {
      for (const prefix of prefixes) {
        if (cleaned.startsWith(prefix)) {
          return cleaned.slice(0, 8);
        }
      }
    }
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.slice(1);
    }
    return cleaned.slice(0,8).padStart(8, '0');
  }
  return cleaned.padStart(8, '0');
}

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

function generateNumberVariation(baseNumber, digitsToVary, operator) {
  if (!baseNumber || baseNumber.length !== 8) return null;
  const prefix = baseNumber.slice(0,2);
  
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

  let positions = [];
  while (positions.length < digitsToVary) {
    const rnd = Math.floor(Math.random() * newDigits.length);
    if (!positions.includes(rnd)) positions.push(rnd);
  }

  for (const pos of positions) {
    newDigits[pos] = String(Math.floor(Math.random() * 10));
  }
  const newNumber = prefix + newDigits.join('');

  if (newNumber.length !== 8) return null;

  let finalValid = false;
  for (const p of OPERATOR_PREFIXES[operator] || []) {
    if (newNumber.startsWith(p)) {
      finalValid = true;
      break;
    }
  }

  if (document.getElementById('validateSequential').checked && isSequentialNumber(newNumber)) {
    return null;
  }
  
  if (document.getElementById('validateRepeating').checked && hasRepeatingDigits(newNumber)) {
    return null;
  }

  return finalValid ? newNumber : null;
}

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

// Add new validation functions
function isSequentialNumber(number) {
  const digits = number.slice(2).split(''); // Skip operator prefix
  let ascending = true;
  let descending = true;
  
  for(let i = 1; i < digits.length; i++) {
    if(parseInt(digits[i]) !== parseInt(digits[i-1]) + 1) ascending = false;
    if(parseInt(digits[i]) !== parseInt(digits[i-1]) - 1) descending = false;
  }
  
  return ascending || descending;
}

function hasRepeatingDigits(number) {
  const digits = number.slice(2).split(''); // Skip operator prefix
  let repeatCount = 1;
  let lastDigit = digits[0];
  
  for (let i = 1; i < digits.length; i++) {
    if (digits[i] === lastDigit) {
      repeatCount++;
      if (repeatCount >= 3) {
        return true; // Found 3 or more repeating digits
      }
    } else {
      repeatCount = 1;
      lastDigit = digits[i];
    }
  }
  
  return false; // No sequence of 3 or more repeating digits found
}

/************************************************
 * 3) Main Logic
 ***********************************************/
async function generateNumbers() {
  const sourceFileEl = document.getElementById('sourceFile');
  const blacklistFileEl = document.getElementById('blacklistFile');
  const variationsEl = document.getElementById('variations');
  const digitsToVaryEl = document.getElementById('digitsToVary');
  const errorMsgEl = document.getElementById('errorMsg');
  const processedCount = document.getElementById('processedCount');
  const generatedCount = document.getElementById('generatedCount');
  const rejectedCount = document.getElementById('rejectedCount');
  const fallbackOperatorEl = document.getElementById('fallbackOperator');

  // Clear error and show summary
  errorMsgEl.textContent = '';
  document.getElementById('summary-section').classList.remove('hidden');

  // Initialize counters
  let processed = 0;
  let generated = 0;
  let rejected = 0;

  // Initialize operator counters
  const operatorCounts = {
    Orange: { original: 0, generated: 0 },
    Moldcell: { original: 0, generated: 0 },
    Unite: { original: 0, generated: 0 },
    Moldtelecom: { original: 0, generated: 0 }
  };

  // Basic checks
  if (!sourceFileEl.files.length) {
    errorMsgEl.textContent = 'Vă rugăm să încărcați un fișier sursă.';
    return null;
  }
  const variations = parseInt(variationsEl.value, 10);
  const digitsToVary = parseInt(digitsToVaryEl.value, 10);
  if (isNaN(variations) || isNaN(digitsToVary) || digitsToVary < 1 || digitsToVary > 6) {
    errorMsgEl.textContent = 'Număr invalid de cifre de variat (trebuie să fie între 1-6).';
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
    errorMsgEl.textContent = 'Eroare la citirea fișierelor Excel: ' + err.message;
    return null;
  }

  // Build blacklist Set
  const blacklistSet = new Set();
  for (const row of blacklistData) {
    const cleaned = cleanSourceNumber(row.Phone);
    if (cleaned) blacklistSet.add(cleaned);
  }

  const generatedNumbers = [];

  // Filter by selected operators
  const selectedOperators = Array.from(document.getElementById('operatorFilter').selectedOptions)
    .map(option => option.value);
  
  sourceData = sourceData.filter(row => 
    selectedOperators.length === 0 || selectedOperators.includes(row.Operator)
  );

  for (const row of sourceData) {
    processed++;
    const baseNumber = cleanSourceNumber(row.Phone);
    if (!baseNumber) continue;

    const operatorName = row.Operator || fallbackOperatorEl.value;

    // Add original number and update operator count
    generatedNumbers.push({
      Phone: baseNumber,
      Operator: operatorName,
      Tip: 'Original'
    });
    operatorCounts[operatorName].original++;

    // Generate variations
    for (let i = 0; i < variations; i++) {
      const newNumber = generateNumberVariation(baseNumber, digitsToVary, operatorName);
      if (newNumber && !blacklistSet.has(newNumber)) {
        generatedNumbers.push({
          Phone: newNumber,
          Operator: operatorName,
          Tip: 'Generat'
        });
        generated++;
        operatorCounts[operatorName].generated++;
      } else {
        rejected++;
      }
    }

    // Update all counters
    processedCount.textContent = processed;
    generatedCount.textContent = generated;
    rejectedCount.textContent = rejected;

    // Update operator-specific counts
    document.getElementById('orangeOriginalCount').textContent = operatorCounts.Orange.original;
    document.getElementById('orangeGeneratedCount').textContent = operatorCounts.Orange.generated;
    document.getElementById('moldcellOriginalCount').textContent = operatorCounts.Moldcell.original;
    document.getElementById('moldcellGeneratedCount').textContent = operatorCounts.Moldcell.generated;
    document.getElementById('uniteOriginalCount').textContent = operatorCounts.Unite.original;
    document.getElementById('uniteGeneratedCount').textContent = operatorCounts.Unite.generated;
    document.getElementById('moldtelecomOriginalCount').textContent = operatorCounts.Moldtelecom.original;
    document.getElementById('moldtelecomGeneratedCount').textContent = operatorCounts.Moldtelecom.generated;
  }

  return generatedNumbers;
}

/************************************************
 * 4) Excel Download Function
 ***********************************************/
function downloadExcel(jsonData) {
  const worksheet = XLSX.utils.json_to_sheet(jsonData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'NumereGenerate');
  XLSX.writeFile(workbook, 'NumereGenerate.xlsx');
}

/************************************************
 * 5) Event Listeners
 ***********************************************/
document.getElementById('generateBtn').addEventListener('click', async () => {
  const generatedNumbers = await generateNumbers();
  if (generatedNumbers) {
    downloadExcel(generatedNumbers);
  }
});

// Add template button event listeners
document.getElementById('sourceTemplateBtn').addEventListener('click', () => {
  generateSourceTemplate();
});

document.getElementById('blacklistTemplateBtn').addEventListener('click', () => {
  generateBlacklistTemplate();
});

/************************************************
 * 6) Template Generation Functions
 ***********************************************/
function generateSourceTemplate() {
  const template = [
    {
      Phone: '60123456',
      Operator: 'Orange',
      Tip: 'Original'
    },
    {
      Phone: '76123456',
      Operator: 'Moldcell',
      Tip: 'Original'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, 'template_sursa.xlsx');
}

function generateBlacklistTemplate() {
  const template = [
    {
      Phone: '60123456'
    },
    {
      Phone: '76123456'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, 'template_blacklist.xlsx');
}
