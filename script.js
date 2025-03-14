/************************************************
 * 1) Operator Prefixes
 ***********************************************/
const OPERATOR_PREFIXES = {
  'Orange': ['60','61','62','66','68','69'],
  'Moldcell': ['76','78','79'],
  'Unite': ['66','67'],
  'Moldtelecom': ['2'],
  'Transnistria': ['210', '215', '216', '219', '552', '533', '555', '557'],
  'TransnistriaIDC': ['774', '777', '778', '779']
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

// Add new constant for Transnistria prefixes after MOLDTELECOM_REGIONAL_PREFIXES
const TRANSNISTRIA_PREFIXES = {
  '210': 'Grigoriopol',
  '215': 'Dubăsari',
  '216': 'Camenca',
  '219': 'Dnestrovsc',
  '552': 'Bender',
  '533': 'Tiraspol',
  '555': 'Râbnița',
  '557': 'Slobozia'
};

const ALL_OPERATORS = ['Orange', 'Moldcell', 'Unite', 'Moldtelecom', 'Transnistria', 'TransnistriaIDC'];

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
      // Check if the digit after prefix is 0
      const digitAfterPrefix = cleaned.charAt(prefix.length);
      if (digitAfterPrefix === '0') {
        return null;
      }
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

  // Special handling for specific operators
  if (operator === 'Moldtelecom') {
    return generateMoldtelecomNumber(baseNumber, digitsToVary);
  } else if (operator === 'Transnistria') {
    return generateTransnistriaNumber(baseNumber, digitsToVary);
  } else if (operator === 'TransnistriaIDC') {
    return generateTransnistriaIDCNumber(baseNumber, digitsToVary);
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
  let newNumber;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    newNumber = regionalPrefix;
    // First digit after prefix should not be 0
    newNumber += Math.floor(Math.random() * 9 + 1).toString(); // 1-9
    
    // Generate rest of the random digits
    for (let i = 1; i < remainingLength; i++) {
      newNumber += Math.floor(Math.random() * 10).toString();
    }
    attempts++;
  } while (
    (document.getElementById('validateSequential')?.checked && isSequentialNumber(newNumber) ||
    document.getElementById('validateRepeating')?.checked && hasRepeatingDigits(newNumber)) &&
    attempts < maxAttempts
  );

  return attempts < maxAttempts ? newNumber : null;
}

// Add new function for Transnistria number generation (similar to generateMoldtelecomNumber)
function generateTransnistriaNumber(baseNumber, digitsToVary) {
  // Get the regional prefix from the base number
  let regionalPrefix = '';
  for (const prefix of Object.keys(TRANSNISTRIA_PREFIXES)) {
    if (baseNumber.startsWith(prefix)) {
      regionalPrefix = prefix;
      break;
    }
  }

  if (!regionalPrefix) {
    // If no valid prefix found, use a random one
    const prefixes = Object.keys(TRANSNISTRIA_PREFIXES);
    regionalPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  }

  // Calculate remaining digits needed to reach 8 digits
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

// Add new function for TransnistriaIDC mobile numbers
function generateTransnistriaIDCNumber(baseNumber, digitsToVary) {
  let prefix;
  
  // Check if the number starts with a valid prefix
  const validPrefixes = OPERATOR_PREFIXES.TransnistriaIDC;
  const currentPrefix = baseNumber.slice(0, 3);
  
  if (validPrefixes.includes(currentPrefix)) {
    prefix = currentPrefix;
  } else {
    // Use a random valid prefix
    prefix = validPrefixes[Math.floor(Math.random() * validPrefixes.length)];
  }

  // Generate 5 random digits after the prefix
  let newNumber = prefix;
  for (let i = 0; i < 5; i++) {
    newNumber += Math.floor(Math.random() * 10).toString();
  }

  // Apply validation rules
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
    if (!file) {
      reject(new Error('Nu a fost furnizat niciun fișier'));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (evt) => {
      try {
        if (!evt.target?.result) {
          throw new Error('Nu s-au putut citi datele din fișier');
        }

        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (!workbook?.SheetNames?.length) {
          throw new Error('Fișierul Excel nu conține foi de lucru');
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        if (!worksheet) {
          throw new Error('Nu s-a putut accesa foaia de lucru');
        }

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        if (!Array.isArray(jsonData)) {
          throw new Error('Nu s-au putut extrage datele din foaia de lucru');
        }

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
        reject(new Error(`Eroare la procesarea fișierului Excel: ${err.message}`));
      }
    };
    
    reader.onerror = (error) => {
      reject(new Error(`Eroare la citirea fișierului: ${error?.target?.error?.message || 'Eroare necunoscută'}`));
    };

    try {
      reader.readAsArrayBuffer(file);
    } catch (err) {
      reject(new Error(`Eroare la inițierea citirii fișierului: ${err.message}`));
    }
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
    Moldtelecom: 0,
    Transnistria: 0, // Add Transnistria
    TransnistriaIDC: 0 // Add TransnistriaIDC
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
    Moldtelecom: { original: 0, generated: 0 },
    Transnistria: { original: 0, generated: 0 }, // Add Transnistria
    TransnistriaIDC: { original: 0, generated: 0 } // Add TransnistriaIDC
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
      const validPrefix = Object.keys(MOLDTELECOM_REGIONAL_PREFIXES)[0];
      baseNumber = generateRandomSeedNumber(validPrefix);
    } else {
      const validPrefix = OPERATOR_PREFIXES[op][0];
      baseNumber = generateRandomSeedNumber(validPrefix);
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
          const validPrefixes = Object.keys(MOLDTELECOM_REGIONAL_PREFIXES);
          const randomPrefix = validPrefixes[Math.floor(Math.random() * validPrefixes.length)];
          baseNumber = generateRandomSeedNumber(randomPrefix);
        } else {
          const validPrefixes = OPERATOR_PREFIXES[op];
          const randomPrefix = validPrefixes[Math.floor(Math.random() * validPrefixes.length)];
          baseNumber = generateRandomSeedNumber(randomPrefix);
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

  shuffleArray(generatedNumbers);
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
  
  // Batch processing to prevent UI freezing
  const batchSize = 100;
  let currentBatch = 0;

  while (successfulVariations < variations && attempts < maxAttempts) {
    attempts++;
    currentBatch++;

    // Add a small delay every batchSize attempts to prevent UI freeze
    if (currentBatch >= batchSize) {
      await new Promise(resolve => setTimeout(resolve, 0));
      currentBatch = 0;
    }

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
function splitIntoSets(numbers, setCount) {
  if (setCount <= 1) return [numbers];
  
  // Group numbers by operator
  const operatorGroups = {};
  numbers.forEach(number => {
    if (!operatorGroups[number.Operator]) {
      operatorGroups[number.Operator] = [];
    }
    operatorGroups[number.Operator].push(number);
  });
  
  // Initialize sets
  const sets = Array.from({ length: setCount }, () => []);
  
  // Distribute numbers from each operator evenly across sets
  Object.entries(operatorGroups).forEach(([operator, operatorNumbers]) => {
    // Shuffle operator numbers to randomize distribution
    shuffleArray(operatorNumbers);
    
    // Distribute numbers from this operator across sets
    operatorNumbers.forEach((number, index) => {
      sets[index % setCount].push(number);
    });
  });
  
  // Shuffle each set internally to mix operators
  sets.forEach(set => shuffleArray(set));
  
  return sets;
}

// Add this helper function to verify set distribution (for debugging)
function logSetDistribution(sets) {
  sets.forEach((set, index) => {
    console.log(`Set ${index + 1}:`);
    const operatorCounts = {};
    set.forEach(number => {
      operatorCounts[number.Operator] = (operatorCounts[number.Operator] || 0) + 1;
    });
    console.log('Distribution:', operatorCounts);
    console.log('Total:', set.length);
    console.log('---');
  });
}

// Add new functions for handling proportions
function applyProportions(numbers) {
  // Get proportions from inputs
  const proportions = {
    Orange: parseInt(document.getElementById('orangeProp').value) || 0,
    Moldcell: parseInt(document.getElementById('moldcellProp').value) || 0,
    Unite: parseInt(document.getElementById('uniteProp').value) || 0,
    Moldtelecom: parseInt(document.getElementById('moldtelecomProp').value) || 0,
    Transnistria: parseInt(document.getElementById('transnistria').value) || 0,
    TransnistriaIDC: parseInt(document.getElementById('transnistriaidcProp').value) || 0
  };

  // Verify proportions sum to 100%
  const totalProportion = Object.values(proportions).reduce((sum, val) => sum + val, 0);
  if (totalProportion !== 100) {
    throw new Error(`Suma proporțiilor trebuie să fie 100%. Actual: ${totalProportion}%`);
  }

  // Group numbers by operator
  const grouped = numbers.reduce((acc, num) => {
    if (!acc[num.Operator]) {
      acc[num.Operator] = [];
    }
    acc[num.Operator].push(num);
    return acc;
  }, {});

  // Sort numbers within each operator group to prioritize source numbers
  Object.keys(grouped).forEach(operator => {
    grouped[operator].sort((a, b) => {
      // Prioritize 'Original' over 'Original (Auto)' over 'Generat'
      const getPriority = (tip) => {
        if (tip === 'Original') return 0;
        if (tip === 'Original (Auto)') return 1;
        if (tip === 'Original (Auto-Seed)') return 2;
        if (tip === 'Original (Nou)') return 3;
        return 4; // Pentru 'Generat'
      };
      return getPriority(a.Tip) - getPriority(b.Tip);
    });
  });

  // Calculate available numbers per operator and total
  const available = {};
  let totalAvailable = 0;
  Object.entries(grouped).forEach(([operator, nums]) => {
    available[operator] = nums.length;
    totalAvailable += nums.length;
  });

  // Calculate how many numbers we can actually use to maintain proportions
  const maxPossibleTotal = Math.floor(
    Math.min(...Object.entries(proportions)
      .filter(([_, prop]) => prop > 0)
      .map(([op, prop]) => (available[op] || 0) * 100 / prop)
    )
  );

  // Calculate target numbers for each operator
  const result = [];
  Object.entries(proportions).forEach(([operator, percentage]) => {
    if (percentage === 0) return;

    const targetCount = Math.round((percentage * maxPossibleTotal) / 100);
    const operatorNumbers = grouped[operator] || [];
    
    if (operatorNumbers.length >= targetCount) {
      // Take first N numbers (which are already sorted by priority)
      result.push(...operatorNumbers.slice(0, targetCount));
    } else {
      result.push(...operatorNumbers);
    }
  });

  // Update summary
  updateProportionSummary(grouped, proportions, result);

  return result;
}

function updateProportionSummary(grouped, proportions, filtered) {
  const summary = document.getElementById('proportionSummary');
  const filteredGroups = filtered.reduce((acc, num) => {
    if (!acc[num.Operator]) acc[num.Operator] = 0;
    acc[num.Operator]++;
    return acc;
  }, {});

  let html = '<strong>Sumar:</strong><br>';
  let totalOriginal = 0;
  let totalFiltered = 0;

  // Calculate totals
  Object.values(filteredGroups).forEach(count => totalFiltered += count);
  Object.values(grouped).forEach(nums => totalOriginal += nums.length);

  // Generate comparison summary
  Object.entries(proportions)
    .sort((a, b) => b[1] - a[1]) // Sort by target percentage descending
    .forEach(([operator, targetPercentage]) => {
      const available = grouped[operator]?.length || 0;
      const filtered = filteredGroups[operator] || 0;
      const actualPercentage = totalFiltered > 0 ? (filtered / totalFiltered * 100).toFixed(1) : 0;
      
      if (targetPercentage > 0 || filtered > 0) {
        const difference = (actualPercentage - targetPercentage).toFixed(1);
        const status = Math.abs(difference) < 1 ? '✅' : 
                      difference > 0 ? '⚠️ High' : '⚠️ Low';
        
        html += `${operator}: ${filtered}/${available} — ` +
               `Target ${targetPercentage}% vs Actual ${actualPercentage}% ` +
               `(${difference > 0 ? '+' : ''}${difference}%) ${status}<br>`;
      }
    });

  html += `<br><strong>Total: ${totalFiltered}/${totalOriginal}</strong>`;
  summary.innerHTML = html;
}

// Add validation for proportion inputs
document.addEventListener('DOMContentLoaded', () => {
  // ...existing initialization code...

  let updating = false;
  const proportionInputs = document.querySelectorAll('.proportion-item input');
  
  proportionInputs.forEach(input => {
    input.addEventListener('change', () => {
      if (updating) return;
      updating = true;

      // Ensure value is between 0 and 100
      input.value = Math.max(0, Math.min(100, parseInt(input.value) || 0));
      
      // Calculate total
      const total = Array.from(proportionInputs)
        .reduce((sum, inp) => sum + (parseInt(inp.value) || 0), 0);
      
      if (total !== 100) {
        document.getElementById('errorMsg').textContent = 
          `Atenție: Suma proporțiilor trebuie să fie 100%. Actual: ${total}%`;
      } else {
        document.getElementById('errorMsg').textContent = '';
      }

      // Update summary if we have generated numbers
      if (window.lastGeneratedNumbers) {
        try {
          applyProportions(window.lastGeneratedNumbers);
        } catch (error) {
          document.getElementById('errorMsg').textContent = error.message;
        }
      }
      
      updating = false;
    });
  });
});

// Modify downloadExcel function to use proportions
function downloadExcel(jsonData) {
  const applyProportionsCheckbox = document.getElementById('applyProportions');
  // Apply proportions only if checkbox is checked
  let dataToExport = applyProportionsCheckbox.checked ? applyProportions(jsonData) : jsonData;
  
  // Shuffle the final data before export
  dataToExport = shuffleArray([...dataToExport]);
  
  const setCount = parseInt(document.getElementById('splitSets').value);
  
  if (setCount <= 1) {
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'NumereGenerate');
    XLSX.writeFile(workbook, 'NumereGenerate.xlsx');
  } else {
    const sets = splitIntoSets(dataToExport, setCount);
    logSetDistribution(sets);
    
    const zip = new JSZip();
    
    sets.forEach((set, index) => {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(set);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'NumereGenerate');
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      zip.file(`NumereGenerate_Set${index + 1}.xlsx`, excelBuffer);
    });
    
    zip.generateAsync({ type: "blob" })
      .then(content => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'NumereGenerate_Seturi.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
  }
}

/************************************************
 * 5) Event Listeners - CORRECTED VERSION
 ***********************************************/

// Remove any duplicate event listeners by only defining them once
function initializeEventListeners() {
  // Remove existing listeners first
  document.querySelectorAll('.select-all-btn').forEach(button => {
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
  });

  // Add select-all button listeners
  document.querySelectorAll('.select-all-btn').forEach(button => {
    button.addEventListener('click', function() {
      const operatorGroup = this.closest('.operator-group');
      const operator = operatorGroup.getAttribute('data-operator');
      // Use correct attribute selector that matches the HTML
      const checkboxes = operatorGroup.querySelectorAll(`input[name="${operator}Prefix"]`);
      const allChecked = Array.from(checkboxes).every(cb => cb.checked);
      
      checkboxes.forEach(checkbox => {
        checkbox.checked = !allChecked;
      });
    });
  });

  // Add operator checkbox listeners with proper handling for TransnistriaIDC
  document.querySelectorAll('.operator-group > label > input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const operatorGroup = this.closest('.operator-group');
      const operator = operatorGroup.getAttribute('data-operator');
      // Use correct attribute selector that matches the HTML
      const prefixCheckboxes = operatorGroup.querySelectorAll(`input[name="${operator}Prefix"]`);
      prefixCheckboxes.forEach(prefixCheckbox => {
        prefixCheckbox.checked = this.checked;
      });
    });
  });
}

// Call the initialization function when the page loads
document.addEventListener('DOMContentLoaded', initializeEventListeners);

// Add event listeners for proportion inputs
document.addEventListener('DOMContentLoaded', () => {
  // ...existing initialization code...
  
  // Add listeners for proportion inputs
  document.querySelectorAll('.proportion-item input').forEach(input => {
    input.addEventListener('change', () => {
      // Ensure value is between 0 and 100
      input.value = Math.max(0, Math.min(100, parseInt(input.value) || 0));
      
      // Update summary if we have generated numbers
      const downloadBtn = document.getElementById('downloadBtn');
      if (downloadBtn.onclick) {
        // This will trigger proportion calculation and summary update
        applyProportions(window.lastGeneratedNumbers);
      }
    });
  });
});

// Add listener for proportion checkbox
document.addEventListener('DOMContentLoaded', () => {
  // ...existing initialization code...
  
  const applyProportionsCheckbox = document.getElementById('applyProportions');
  const proportionControls = document.querySelector('.proportion-controls');
  
  applyProportionsCheckbox.addEventListener('change', () => {
    proportionControls.style.opacity = applyProportionsCheckbox.checked ? '1' : '0.5';
    proportionControls.style.pointerEvents = applyProportionsCheckbox.checked ? 'auto' : 'none';
    
    if (window.lastGeneratedNumbers) {
      try {
        if (applyProportionsCheckbox.checked) {
          applyProportions(window.lastGeneratedNumbers);
        } else {
          document.getElementById('proportionSummary').innerHTML = '';
        }
      } catch (error) {
        document.getElementById('errorMsg').textContent = error.message;
      }
    }
  });
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

// Add this helper function at the start of the file after the constants
function generateRandomSeedNumber(prefix) {
  const neededDigits = 8 - prefix.length;
  let result = prefix;
  
  // Generate random digits, avoiding sequential and repeating patterns
  while (result.length < 8) {
    const lastDigit = result[result.length - 1];
    let newDigit;
    
    do {
      newDigit = Math.floor(Math.random() * 10).toString();
      // Avoid sequential and repeating digits
    } while (
      (lastDigit && Math.abs(parseInt(newDigit) - parseInt(lastDigit)) === 1) || // Avoid sequential
      (result.endsWith(newDigit + newDigit)) // Avoid repeating
    );
    
    result += newDigit;
  }
  
  return result;
}

// Fix the infinite loop in shuffleArray function
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) { // Changed i++ to i--
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Also modify the seed generation in the main generateNumbers function
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
    Moldtelecom: { original: 0, generated: 0 },
    Transnistria: { original: 0, generated: 0 }, // Add Transnistria
    TransnistriaIDC: { original: 0, generated: 0 } // Add TransnistriaIDC
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
      const validPrefix = Object.keys(MOLDTELECOM_REGIONAL_PREFIXES)[0];
      baseNumber = generateRandomSeedNumber(validPrefix);
    } else {
      const validPrefix = OPERATOR_PREFIXES[op][0];
      baseNumber = generateRandomSeedNumber(validPrefix);
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
          const validPrefixes = Object.keys(MOLDTELECOM_REGIONAL_PREFIXES);
          const randomPrefix = validPrefixes[Math.floor(Math.random() * validPrefixes.length)];
          baseNumber = generateRandomSeedNumber(randomPrefix);
        } else {
          const validPrefixes = OPERATOR_PREFIXES[op];
          const randomPrefix = validPrefixes[Math.floor(Math.random() * validPrefixes.length)];
          baseNumber = generateRandomSeedNumber(randomPrefix);
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

  shuffleArray(generatedNumbers);
  return generatedNumbers;
}

// Add new function for fresh number generation
async function generateFreshNumbers() {
  const errorMsgEl = document.getElementById('errorMsg');
  const variationsEl = document.getElementById('variations');
  const digitsToVaryEl = document.getElementById('digitsToVary');
  const blacklistFileEl = document.getElementById('blacklistFile');
  
  const variations = parseInt(variationsEl.value, 10);
  const digitsToVary = parseInt(digitsToVaryEl.value, 10);
  
  const counters = { processed: 0, generated: 0, rejected: 0 };
  const operatorCounts = {
    Orange: { original: 0, generated: 0 },
    Moldcell: { original: 0, generated: 0 },
    Unite: { original: 0, generated: 0 },
    Moldtelecom: { original: 0, generated: 0 },
    Transnistria: { original: 0, generated: 0 }, // Add Transnistria
    TransnistriaIDC: { original: 0, generated: 0 } // Add TransnistriaIDC
  };

  // Get selected operators and their prefixes
  const selectedOperatorsAndPrefixes = ALL_OPERATORS
    .filter(op => document.getElementById(`generate${op}`).checked)
    .map(op => ({
      operator: op,
      prefixes: Array.from(document.querySelectorAll(`input[name="${op.toLowerCase().replace('idc', '_idc')}Prefix"]:checked`))
                    .map(checkbox => checkbox.value)
    }))
    .filter(op => op.prefixes.length > 0);

  // Validate selection
  if (selectedOperatorsAndPrefixes.length === 0) {
    errorMsgEl.textContent = 'Selectați cel puțin un operator și prefix';
    return null;
  }

  const generatedNumbers = [];
  const generatedNumbersSet = new Set();
  const blacklistSet = new Set();

  // Build blacklist Set
  if (blacklistFileEl.files.length) {
    try {
      const blacklistData = await readExcelFile(blacklistFileEl.files[0]);
      for (const row of blacklistData) {
        const cleaned = cleanSourceNumber(row.Phone);
        if (cleaned) blacklistSet.add(cleaned);
      }
    } catch (err) {
      errorMsgEl.textContent = 'Eroare la citirea fișierului blacklist: ' + err.message;
      return null;
    }
  }

  // Generate one seed number for each selected prefix
  for (const { operator, prefixes } of selectedOperatorsAndPrefixes) {
    // Process each prefix for this operator
    for (const prefix of prefixes) {
      let baseNumber;
      let attempts = 0;
      const maxAttempts = 50; // Increase max attempts to find valid number

      // Keep trying until we get a valid seed number that's not in blacklist
      do {
        baseNumber = generateRandomSeedNumber(prefix);
        attempts++;
      } while (
        (generatedNumbersSet.has(baseNumber) || blacklistSet.has(baseNumber)) && 
        attempts < maxAttempts
      );

      // Only proceed if we found a valid number
      if (!generatedNumbersSet.has(baseNumber) && !blacklistSet.has(baseNumber)) {
        generatedNumbersSet.add(baseNumber);
        generatedNumbers.push({
          Phone: baseNumber,
          Operator: operator,
          Tip: 'Original (Nou)'
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
    }
  }

  // Update UI counters
  document.getElementById('processedCount').textContent = counters.processed;
  document.getElementById('generatedCount').textContent = counters.generated;
  document.getElementById('rejectedCount').textContent = counters.rejected;

  // Show the summary section for fresh mode
  document.getElementById('summary-section').classList.remove('hidden');

  // Update operator-specific counts
  for (const op of ALL_OPERATORS) {
    document.getElementById(`${op.toLowerCase()}OriginalCount`).textContent = 
      operatorCounts[op].original;
    document.getElementById(`${op.toLowerCase()}GeneratedCount`).textContent = 
      operatorCounts[op].generated;
  }

  shuffleArray(generatedNumbers);
  return generatedNumbers;
}

/************************************************
 * 5) Event Listeners
 ***********************************************/
document.getElementById('generateBtn').addEventListener('click', async () => {
  try {
    const button = document.getElementById('generateBtn');
    const originalText = button.textContent;
    button.textContent = 'Generare în curs...';
    button.disabled = true;

    const generatedNumbers = await generateNumbers();
    
    if (generatedNumbers) {
      // Store numbers globally for proportion calculations
      window.lastGeneratedNumbers = generatedNumbers;
      
      document.getElementById('output-section').classList.remove('hidden');
      
      // Only calculate proportions if checkbox is checked
      const applyProportionsCheckbox = document.getElementById('applyProportions');
      if (applyProportionsCheckbox.checked) {
        applyProportions(generatedNumbers);
      } else {
        document.getElementById('proportionSummary').innerHTML = '';
      }
      
      const downloadBtn = document.getElementById('downloadBtn');
      const newBtn = downloadBtn.cloneNode(true);
      downloadBtn.parentNode.replaceChild(newBtn, downloadBtn);
      
      newBtn.addEventListener('click', () => {
        try {
          downloadExcel(window.lastGeneratedNumbers);
        } catch (error) {
          document.getElementById('errorMsg').textContent = 'Eroare la descărcare: ' + error.message;
        }
      });
    }
  } catch (error) {
    document.getElementById('errorMsg').textContent = 'Eroare: ' + error.message;
  } finally {
    const button = document.getElementById('generateBtn');
    button.textContent = 'Generează';
    button.disabled = false;
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

// Update the radio button event listener
document.querySelectorAll('input[name="generationMode"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    const sourceElements = document.querySelectorAll('.source-only');
    const freshOptions = document.getElementById('freshGenerationOptions');
    
    // Reset stats when switching modes
    resetStats();
    
    if (e.target.value === 'fresh') {
      sourceElements.forEach(el => el.classList.add('hidden'));
      freshOptions.classList.remove('hidden');
      document.getElementById('missingOperators').classList.add('hidden');
    } else {
      sourceElements.forEach(el => el.classList.remove('hidden'));
      freshOptions.classList.add('hidden');
    }
  });
});

// Add to Event Listeners section
document.querySelectorAll('.select-all-btn').forEach(button => {
  button.addEventListener('click', (e) => {
    const operator = button.getAttribute('data-prefix');
    const checkboxes = document.querySelectorAll(`input[name="${operator}Prefix"]`);
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !allChecked);
  });
});

// Add checkbox link between operator and its prefixes
document.querySelectorAll('.operator-group > label > input[type="checkbox"]').forEach(operatorCheckbox => {
  operatorCheckbox.addEventListener('change', (e) => {
    const operator = e.target.id.replace('generate', '').toLowerCase();
    const prefixCheckboxes = document.querySelectorAll(`input[name="${operator}Prefix"]`);
    prefixCheckboxes.forEach(checkbox => {
      checkbox.checked = e.target.checked;
    });
  });
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

// Add new function to reset stats
function resetStats() {
  // Reset all counter spans
  document.querySelectorAll('#operatorStats span').forEach(span => {
    span.textContent = '0';
  });
  
  // Reset summary counters
  document.getElementById('processedCount').textContent = '0';
  document.getElementById('generatedCount').textContent = '0';
  document.getElementById('rejectedCount').textContent = '0';
  
  // Hide the output section
  document.getElementById('output-section').classList.add('hidden');
  
  // Clear any error messages
  document.getElementById('errorMsg').textContent = '';
}

// Update the radio button event listener to reset stats
document.querySelectorAll('input[name="generationMode"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    const sourceElements = document.querySelectorAll('.source-only');
    const freshOptions = document.getElementById('freshGenerationOptions');
    
    // Reset stats when switching modes
    resetStats();
    
    if (e.target.value === 'fresh') {
      sourceElements.forEach(el => el.classList.add('hidden'));
      freshOptions.classList.remove('hidden');
      document.getElementById('missingOperators').classList.add('hidden');
    } else {
      sourceElements.forEach(el => el.classList.remove('hidden'));
      freshOptions.classList.add('hidden');
    }
  });
});

// ...rest of existing code...

// Adăugăm la sfârșitul fișierului:

// Funcție pentru generarea numerelor plutitoare
function createFloatingNumbers() {
  const numbers = '0123456789';
  const container = document.body;
  
  setInterval(() => {
    const number = document.createElement('div');
    number.className = 'floating-number';
    number.style.left = Math.random() * 100 + 'vw';
    number.style.top = Math.random() * 100 + 'vh';
    number.style.fontSize = (Math.random() * 40 + 20) + 'px'; // Dimensiuni între 20px și 60px
    number.style.opacity = '0';
    number.textContent = numbers[Math.floor(Math.random() * numbers.length)];
    
    container.appendChild(number);
    
    // Curățăm elementele după ce animația s-a terminat
    setTimeout(() => {
      number.remove();
    }, 15000); // 15 secunde, la fel ca durata animației
  }, 500); // Creăm un nou număr la fiecare 500ms
}

// Inițializăm efectul când documentul este încărcat
document.addEventListener('DOMContentLoaded', () => {
  createFloatingNumbers();
});

// ...existing code...
