/************************************************
 * 1) Operator Prefixes
 ***********************************************/
const OPERATOR_PREFIXES = {
  'Orange': ['60','61','62','63','68','69'],
  'Moldcell': ['76','78','79'],
  'Unite': ['67'],
  'Moldtelecom': ['2']
};

const ALL_OPERATORS = ['Orange', 'Moldcell', 'Unite', 'Moldtelecom'];

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
        
        // Reset previous stats
        document.querySelectorAll('#operatorStats span').forEach(span => span.textContent = '0');
        document.getElementById('generatedCount').textContent = '0';
        document.getElementById('rejectedCount').textContent = '0';
        
        // Update UI with new data
        updateSourceStats(jsonData);
        const missingOps = detectMissingOperators(jsonData);
        showMissingOperatorsUI(missingOps);
        
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

function getRandomOperator() {
  const r = Math.random() * 100;
  if (r < 35) return 'Moldcell';
  if (r < 46) return 'Moldtelecom';
  if (r < 92) return 'Orange';
  return 'Unite';
}

// Add new function to detect missing operators
function detectMissingOperators(sourceData) {
  const presentOperators = new Set(sourceData.map(row => row.Operator));
  return ALL_OPERATORS.filter(op => !presentOperators.has(op));
}

// Add new function to show missing operators UI
function showMissingOperatorsUI(missingOps) {
  const container = document.getElementById('missingOperatorsList');
  container.innerHTML = '';
  
  if (missingOps.length === 0) {
    document.getElementById('missingOperators').classList.add('hidden');
    return;
  }

  missingOps.forEach(op => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `include${op}`;
    checkbox.value = op;
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(`Include ${op}`));
    container.appendChild(label);
  });
  
  document.getElementById('missingOperators').classList.remove('hidden');
}

// Add after detectMissingOperators function
function updateSourceStats(sourceData) {
  const operatorStats = {
    Orange: 0,
    Moldcell: 0,
    Unite: 0,
    Moldtelecom: 0
  };

  sourceData.forEach(row => {
    if (operatorStats.hasOwnProperty(row.Operator)) {
      operatorStats[row.Operator]++;
    }
  });

  // Update UI stats
  document.getElementById('orangeOriginalCount').textContent = operatorStats.Orange;
  document.getElementById('moldcellOriginalCount').textContent = operatorStats.Moldcell;
  document.getElementById('uniteOriginalCount').textContent = operatorStats.Unite;
  document.getElementById('moldtelecomOriginalCount').textContent = operatorStats.Moldtelecom;
  
  // Show summary section
  document.getElementById('summary-section').classList.remove('hidden');
  document.getElementById('processedCount').textContent = sourceData.length;
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

  // Process source data first
  for (const row of sourceData) {
    processed++;
    const baseNumber = cleanSourceNumber(row.Phone);
    if (!baseNumber) continue;

    const operatorName = row.Operator || getRandomOperator();

    generatedNumbers.push({
      Phone: baseNumber,
      Operator: operatorName,
      Tip: 'Original'
    });
    operatorCounts[operatorName].original++;

    await generateVariationsForOperator(
      baseNumber, 
      operatorName, 
      variations, 
      digitsToVary, 
      blacklistSet, 
      generatedNumbers, 
      operatorCounts
    );
  }

  // Then process missing operators
  const missingOps = detectMissingOperators(sourceData);
  const selectedMissingOps = missingOps.filter(op => 
    document.getElementById(`include${op}`)?.checked
  );

  for (const op of selectedMissingOps) {
    const prefix = OPERATOR_PREFIXES[op][0];
    const baseNumber = prefix + '000000'.slice(prefix.length);
    
    processed++;
    generatedNumbers.push({
      Phone: baseNumber,
      Operator: op,
      Tip: 'Original (Auto)'
    });
    operatorCounts[op].original++;

    await generateVariationsForOperator(
      baseNumber, 
      op, 
      variations, 
      digitsToVary, 
      blacklistSet, 
      generatedNumbers, 
      operatorCounts
    );
  }

  // Update final counters
  processedCount.textContent = processed;
  generatedCount.textContent = generated;
  rejectedCount.textContent = rejected;

  // Update operator-specific counts
  for (const op of ALL_OPERATORS) {
    document.getElementById(`${op.toLowerCase()}OriginalCount`).textContent = 
      operatorCounts[op].original;
    document.getElementById(`${op.toLowerCase()}GeneratedCount`).textContent = 
      operatorCounts[op].generated;
  }

  return generatedNumbers;
}

// Add this new helper function
async function generateVariationsForOperator(
  baseNumber, 
  operator, 
  variations, 
  digitsToVary, 
  blacklistSet, 
  generatedNumbers, 
  operatorCounts
) {
  let successfulVariations = 0;
  let maxAttempts = variations * 3;
  let attempts = 0;

  while (successfulVariations < variations && attempts < maxAttempts) {
    attempts++;
    const newNumber = generateNumberVariation(baseNumber, digitsToVary, operator);
    if (newNumber && !blacklistSet.has(newNumber)) {
      generatedNumbers.push({
        Phone: newNumber,
        Operator: operator,
        Tip: 'Generat'
      });
      operatorCounts[operator].generated++;
      successfulVariations++;
    }
  }
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

// Add source file change event listener
document.getElementById('sourceFile').addEventListener('change', async (event) => {
  if (event.target.files.length) {
    try {
      await readExcelFile(event.target.files[0]);
    } catch (err) {
      document.getElementById('errorMsg').textContent = 'Eroare la citirea fișierului: ' + err.message;
    }
  }
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
