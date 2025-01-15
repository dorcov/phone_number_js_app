/************************************************
 * 1) Operator Prefixes
 ***********************************************/
const OPERATOR_PREFIXES = {
  'Orange': ['60','61','62','66','68','69'],
  'Moldcell': ['76','78','79'],
  'Unite': ['66','67'],
  'Moldtelecom': ['2']
};

const MOLDTELECOM_REGIONAL_PREFIXES = {
  '22': 'Chișinău',
  '230': 'Soroca',
  '231': 'Bălți',
  '235': 'Orhei',
  '236': 'Ungheni',
  '237': 'Strășeni',
  '241': 'Cimișlia',
  '242': 'Ștefan Vodă',
  '243': 'Căușeni',
  '244': 'Călărași',
  '246': 'Edineț',
  '247': 'Briceni',
  '248': 'Criuleni',
  '249': 'Glodeni',
  '250': 'Florești',
  '251': 'Dondușeni',
  '252': 'Drochia',
  '254': 'Rezina',
  '256': 'Râșcani',
  '258': 'Telenești',
  '259': 'Fălești',
  '262': 'Sângerei',
  '263': 'Leova',
  '264': 'Nisporeni',
  '265': 'Anenii Noi',
  '268': 'Ialoveni',
  '269': 'Hâncești',
  '271': 'Ocnița',
  '272': 'Șoldănești',
  '273': 'Cantemir',
  '291': 'Ceadâr-Lunga',
  '293': 'Vulcănești',
  '294': 'Taraclia',
  '297': 'Basarabeasca',
  '298': 'Comrat',
  '299': 'Cahul'
};

const ALL_OPERATORS = ['Orange', 'Moldcell', 'Unite', 'Moldtelecom'];

/************************************************
 * 2) Utility / Helper Functions
 ***********************************************/

function cleanSourceNumber(numberStr) {
  if (!numberStr) return null;
  let cleaned = String(numberStr).replace(/\D/g, '');
  if (!cleaned) return null;

  // Special handling for Moldtelecom numbers
  for (const prefix of Object.keys(MOLDTELECOM_REGIONAL_PREFIXES)) {
    if (cleaned.startsWith(prefix)) {
      return cleaned.slice(0, 8);
    }
  }

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

  // Special handling for Moldtelecom
  if (operator === 'Moldtelecom') {
    return generateMoldtelecomNumber(baseNumber, digitsToVary);
  }

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

// Add this new function for Moldtelecom number generation
function generateMoldtelecomNumber(baseNumber, digitsToVary) {
  // Get the regional prefix from the base number
  let regionalPrefix = '';
  for (const prefix of Object.keys(MOLDTELECOM_REGIONAL_PREFIXES)) {
    if (baseNumber.startsWith(prefix)) {
      regionalPrefix = prefix;
      break;
    }
  }

  if (!regionalPrefix) {
    // If no valid prefix found, use a random one
    const prefixes = Object.keys(MOLDTELECOM_REGIONAL_PREFIXES);
    regionalPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  }

  // Calculate remaining digits needed based on prefix length
  const remainingLength = 8 - regionalPrefix.length;
  let newNumber = regionalPrefix;

  // Generate random digits for the remaining positions
  for (let i = 0; i < remainingLength; i++) {
    newNumber += Math.floor(Math.random() * 10).toString();
  }

  // Validate the generated number
  if (document.getElementById('validateSequential')?.checked && isSequentialNumber(newNumber)) {
    return null;
  }
  
  if (document.getElementById('validateRepeating')?.checked && hasRepeatingDigits(newNumber)) {
    return null;
  }

  return newNumber;
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
  // Salvăm starea checkbox-urilor existente
  const existingStates = {};
  container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    existingStates[checkbox.id] = checkbox.checked;
  });
  
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
    // Restaurăm starea anterioară sau setăm implicit la true
    checkbox.checked = existingStates[`include${op}`] !== undefined ? 
      existingStates[`include${op}`] : true;
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
  const generationMode = document.querySelector('input[name="generationMode"]:checked').value;
  
  if (generationMode === 'fresh') {
    return generateFreshNumbers();
  }
  
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

  // Initialize counters object
  const counters = {
    processed: 0,
    generated: 0,
    rejected: 0
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
  const generatedNumbersSet = new Set(); // Add this line to track all generated numbers

  // Remove operator filter logic
  /*
  // const selectedOperators = Array.from(document.getElementById('operatorFilter').selectedOptions)
  //   .map(option => option.value);
  // sourceData = sourceData.filter(row => 
  //   selectedOperators.length === 0 || selectedOperators.includes(row.Operator)
  // );
  */

  // Process source data first
  for (const row of sourceData) {
    processed++;
    const baseNumber = cleanSourceNumber(row.Phone);
    if (!baseNumber) continue;

    const operatorName = row.Operator || getRandomOperator();

    if (!generatedNumbersSet.has(baseNumber)) { // Add this check
      generatedNumbersSet.add(baseNumber);
      generatedNumbers.push({
        Phone: baseNumber,
        Operator: operatorName,
        Tip: 'Original'
      });
      operatorCounts[operatorName].original++;
    }

    await generateVariationsForOperator(
      baseNumber, 
      operatorName, 
      variations, 
      digitsToVary, 
      blacklistSet, 
      generatedNumbers,
      generatedNumbersSet, // Add this parameter
      operatorCounts,
      counters // Adăugăm counters ca parametru
    );
  }

  // Then process missing operators
  const missingOps = detectMissingOperators(sourceData);
  const selectedMissingOps = missingOps.filter(op => 
    document.getElementById(`include${op}`)?.checked
  );

  for (const op of selectedMissingOps) {
    processed++;
    let baseNumber;
    
    if (op === 'Moldtelecom') {
      // Folosim un prefix regional valid pentru Moldtelecom
      const validPrefix = Object.keys(MOLDTELECOM_REGIONAL_PREFIXES)[0]; // Luăm primul prefix valid
      const neededZeros = 8 - validPrefix.length;
      baseNumber = validPrefix + '0'.repeat(neededZeros);
    } else {
      // Pentru alți operatori folosim prefixele existente
      const validPrefix = OPERATOR_PREFIXES[op][0];
      const neededZeros = 8 - validPrefix.length;
      baseNumber = validPrefix + '0'.repeat(neededZeros);
    }

    if (!generatedNumbersSet.has(baseNumber)) {
      generatedNumbersSet.add(baseNumber);
      generatedNumbers.push({
        Phone: baseNumber,
        Operator: op,
        Tip: 'Original (Auto)'
      });
      operatorCounts[op].original++;
    }

    await generateVariationsForOperator(
      baseNumber,
      op,
      variations,
      digitsToVary,
      blacklistSet,
      generatedNumbers,
      generatedNumbersSet,
      operatorCounts,
      counters
    );
  }

  // După ce am procesat 'sourceData':
  const operatorCurrentCounts = {};
  for (const op of ALL_OPERATORS) {
    operatorCurrentCounts[op] = operatorCounts[op].original; 
  }
  const maxCount = Math.max(...Object.values(operatorCurrentCounts));

  // Generăm semințe pentru operatorii sub 'maxCount'
  for (const op of ALL_OPERATORS) {
    const deficit = maxCount - operatorCurrentCounts[op];
    if (deficit > 0) {
      // Câte semințe: de ex. deficit / variations (ajustat)
      const seedsToGenerate = Math.ceil(deficit / variations);
      for (let i = 0; i < seedsToGenerate; i++) {
        let baseNumber;
        
        if (op === 'Moldtelecom') {
          // Pentru Moldtelecom, folosim prefixele regionale
          const validPrefixes = Object.keys(MOLDTELECOM_REGIONAL_PREFIXES);
          const randomPrefix = validPrefixes[Math.floor(Math.random() * validPrefixes.length)];
          const neededZeros = 8 - randomPrefix.length;
          baseNumber = randomPrefix + '0'.repeat(neededZeros);
        } else {
          // Pentru alți operatori
          const validPrefixes = OPERATOR_PREFIXES[op];
          const randomPrefix = validPrefixes[Math.floor(Math.random() * validPrefixes.length)];
          const neededZeros = 8 - randomPrefix.length;
          baseNumber = randomPrefix + '0'.repeat(neededZeros);
        }

        if (!generatedNumbersSet.has(baseNumber)) {
          generatedNumbersSet.add(baseNumber);
          generatedNumbers.push({
            Phone: baseNumber,
            Operator: op,
            Tip: 'Original (Auto-Seed)'
          });
          operatorCounts[op].original++;
          
          await generateVariationsForOperator(
            baseNumber,
            op,
            variations,
            digitsToVary,
            blacklistSet,
            generatedNumbers,
            generatedNumbersSet,
            operatorCounts,
            counters
          );
        }
      }
    }
  }

  // Update final counters
  processedCount.textContent = processed;
  generatedCount.textContent = counters.generated;
  rejectedCount.textContent = counters.rejected;

  // Update operator-specific counts
  for (const op of ALL_OPERATORS) {
    document.getElementById(`${op.toLowerCase()}OriginalCount`).textContent = 
      operatorCounts[op].original;
    document.getElementById(`${op.toLowerCase()}GeneratedCount`).textContent = 
      operatorCounts[op].generated;
  }

  return generatedNumbers;
}

// Add this new helper function with counters as parameters
async function generateVariationsForOperator(
  baseNumber, 
  operator, 
  variations, 
  digitsToVary, 
  blacklistSet, 
  generatedNumbers,
  generatedNumbersSet, // Add this parameter
  operatorCounts,
  counters // Adăugăm parametrul counters
) {
  let successfulVariations = 0;
  let maxAttempts = variations * 3;
  let attempts = 0;

  while (successfulVariations < variations && attempts < maxAttempts) {
    attempts++;
    const newNumber = generateNumberVariation(baseNumber, digitsToVary, operator);
    // Add check for duplicates using generatedNumbersSet
    if (newNumber && !blacklistSet.has(newNumber) && !generatedNumbersSet.has(newNumber)) {
      generatedNumbersSet.add(newNumber); // Add to set before pushing
      generatedNumbers.push({
        Phone: newNumber,
        Operator: operator,
        Tip: 'Generat'
      });
      counters.generated++; // Folosim counters.generated în loc de generated
      operatorCounts[operator].generated++;
      successfulVariations++;
    } else {
      counters.rejected++; // Folosim counters.rejected în loc de rejected
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

// Add after the event listeners section:
document.querySelectorAll('input[name="generationMode"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    const sourceElements = document.querySelectorAll('.file-input-group');
    const freshOptions = document.getElementById('freshGenerationOptions');
    
    if (e.target.value === 'fresh') {
      sourceElements.forEach(el => el.classList.add('hidden'));
      freshOptions.classList.remove('hidden');
    } else {
      sourceElements.forEach(el => el.classList.remove('hidden'));
      freshOptions.classList.add('hidden');
    }
  });
});

// Add new function for fresh number generation
async function generateFreshNumbers() {
  const errorMsgEl = document.getElementById('errorMsg');
  const variationsEl = document.getElementById('variations');
  const digitsToVaryEl = document.getElementById('digitsToVary');
  
  const variations = parseInt(variationsEl.value, 10);
  const digitsToVary = parseInt(digitsToVaryEl.value, 10);
  
  const counters = { processed: 0, generated: 0, rejected: 0 };
  const operatorCounts = {
    Orange: { original: 0, generated: 0 },
    Moldcell: { original: 0, generated: 0 },
    Unite: { original: 0, generated: 0 },
    Moldtelecom: { original: 0, generated: 0 }
  };

  // Get requested counts
  const counts = {
    Orange: parseInt(document.getElementById('orangeCount').value) || 0,
    Moldcell: parseInt(document.getElementById('moldcellCount').value) || 0,
    Unite: parseInt(document.getElementById('uniteCount').value) || 0,
    Moldtelecom: parseInt(document.getElementById('moldtelecomCount').value) || 0
  };

  // Validate input
  if (Object.values(counts).reduce((a, b) => a + b, 0) === 0) {
    errorMsgEl.textContent = 'Introduceți cel puțin un număr mai mare ca 0';
    return null;
  }

  const generatedNumbers = [];
  const generatedNumbersSet = new Set();
  const blacklistSet = new Set();

  // Calculate seeds needed for each operator
  for (const [operator, count] of Object.entries(counts)) {
    if (count > 0) {
      // Calculate how many seed numbers we need based on variations
      const seedsNeeded = Math.ceil(count / (variations + 1)); // +1 includes the seed itself
      
      for (let i = 0; i < seedsNeeded; i++) {
        let baseNumber;
        let attempts = 0;
        const maxAttempts = 10; // Prevent infinite loops
        
        // Keep trying until we get a unique seed number
        do {
          if (operator === 'Moldtelecom') {
            const validPrefixes = Object.keys(MOLDTELECOM_REGIONAL_PREFIXES);
            const randomPrefix = validPrefixes[Math.floor(Math.random() * validPrefixes.length)];
            const neededZeros = 8 - randomPrefix.length;
            baseNumber = randomPrefix + '0'.repeat(neededZeros);
          } else {
            const validPrefixes = OPERATOR_PREFIXES[operator];
            const randomPrefix = validPrefixes[Math.floor(Math.random() * validPrefixes.length)];
            const neededZeros = 8 - randomPrefix.length;
            baseNumber = randomPrefix + '0'.repeat(neededZeros);
          }
          attempts++;
        } while (generatedNumbersSet.has(baseNumber) && attempts < maxAttempts);

        if (!generatedNumbersSet.has(baseNumber)) {
          // Add seed number
          generatedNumbersSet.add(baseNumber);
          generatedNumbers.push({
            Phone: baseNumber,
            Operator: operator,
            Tip: 'Original (Fresh)'
          });
          operatorCounts[operator].original++;
          counters.generated++;

          // Generate variations for this seed
          await generateVariationsForOperator(
            baseNumber,
            operator,
            variations,
            digitsToVary,
            blacklistSet,
            generatedNumbers,
            generatedNumbersSet,
            operatorCounts,
            counters
          );
        }

        // Check if we've generated enough numbers for this operator
        const currentOperatorCount = generatedNumbers.filter(n => n.Operator === operator).length;
        if (currentOperatorCount >= count) {
          break;
        }
      }
    }
  }

  // Update UI counters
  document.getElementById('processedCount').textContent = counters.processed;
  document.getElementById('generatedCount').textContent = counters.generated;
  document.getElementById('rejectedCount').textContent = counters.rejected;

  // Update operator-specific counts
  for (const op of ALL_OPERATORS) {
    document.getElementById(`${op.toLowerCase()}OriginalCount`).textContent = 
      operatorCounts[op].original;
    document.getElementById(`${op.toLowerCase()}GeneratedCount`).textContent = 
      operatorCounts[op].generated;
  }

  // Change the filtering logic to create a new array instead of reassigning
  let finalNumbers = generatedNumbers.slice(); // Create a copy of the original array

  // Remove extra numbers if we generated too many
  for (const operator of ALL_OPERATORS) {
    const targetCount = counts[operator];
    let operatorNumbers = finalNumbers.filter(n => n.Operator === operator);
    if (operatorNumbers.length > targetCount) {
      const numbersToRemove = operatorNumbers.length - targetCount;
      const indexesToRemove = new Set();
      while (indexesToRemove.size < numbersToRemove) {
        indexesToRemove.add(Math.floor(Math.random() * operatorNumbers.length));
      }
      
      finalNumbers = finalNumbers.filter((num, index) => 
        num.Operator !== operator || !indexesToRemove.has(index)
      );
    }
  }

  return finalNumbers;
}

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
