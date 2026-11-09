import db from '../config/database.js';

// Unicode for Indian Rupee is \u20B9 (₹)
const RUPEE = '\u20B9';

console.log('Fixing currency symbols in database...');

// 1. Fix companies table
const fixCompanies = db.prepare(`
  UPDATE companies 
  SET currency_symbol = ? 
  WHERE currency_code = 'INR' OR currency_symbol = '?' OR currency_symbol IS NULL OR currency_symbol = ''
`);
const cResult = fixCompanies.run(RUPEE);
console.log(`Updated ${cResult.changes} companies with rupee symbol.`);

// 2. Fix expenses table
const fixExpenses = db.prepare(`
  UPDATE expenses 
  SET currency_symbol = ? 
  WHERE currency_symbol = '?' OR currency_symbol IS NULL OR currency_symbol = ''
`);
const eResult = fixExpenses.run(RUPEE);
console.log(`Updated ${eResult.changes} expenses with rupee symbol.`);

// 3. Fix company_settings table
db.prepare(`
  UPDATE company_settings
  SET currency_symbol = ?
  WHERE currency_code = 'INR' OR currency_symbol = '?'
`).run(RUPEE);

// Output verified results
const companies = db.prepare('SELECT id, name, currency_code, currency_symbol FROM companies').all();
console.log('Current companies:');
companies.forEach(c => console.log(` - [${c.id}] ${c.name}: ${c.currency_code} (${c.currency_symbol})`));

const expenses = db.prepare('SELECT id, category, amount, currency_symbol FROM expenses').all();
console.log('Current expenses:');
expenses.forEach(e => console.log(` - [${e.id}] ${e.category}: ${e.currency_symbol} ${e.amount}`));
