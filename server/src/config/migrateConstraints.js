import db from './database.js';

console.log('🔄 Checking & migrating table unique constraints...');
db.exec('PRAGMA foreign_keys = OFF;');

try {
  // Check if departments has global unique on name
  const deptSql = db.prepare("SELECT sql FROM sqlite_master WHERE name='departments'").get()?.sql || '';
  if (deptSql.includes('name TEXT UNIQUE NOT NULL') || !deptSql.includes('UNIQUE(company_id, name)')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS departments_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER DEFAULT 1,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, name)
      );
      INSERT OR IGNORE INTO departments_new (id, company_id, name, code, description, created_at)
        SELECT id, COALESCE(company_id, 1), name, code, description, created_at FROM departments;
      DROP TABLE departments;
      ALTER TABLE departments_new RENAME TO departments;
    `);
    console.log('✅ Migrated departments table');
  }

  // Check if leave_types has global unique on code
  const ltSql = db.prepare("SELECT sql FROM sqlite_master WHERE name='leave_types'").get()?.sql || '';
  if (ltSql.includes('code TEXT UNIQUE NOT NULL') || !ltSql.includes('UNIQUE(company_id, code)')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS leave_types_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER DEFAULT 1,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        default_days_per_year INTEGER NOT NULL,
        is_paid INTEGER DEFAULT 1,
        color TEXT DEFAULT '#3b82f6',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, code)
      );
      INSERT OR IGNORE INTO leave_types_new (id, company_id, name, code, default_days_per_year, is_paid, color, created_at)
        SELECT id, COALESCE(company_id, 1), name, code, default_days_per_year, is_paid, color, created_at FROM leave_types;
      DROP TABLE leave_types;
      ALTER TABLE leave_types_new RENAME TO leave_types;
    `);
    console.log('✅ Migrated leave_types table');
  }

  // Check if payroll_batches has global unique on (month, year)
  const pbSql = db.prepare("SELECT sql FROM sqlite_master WHERE name='payroll_batches'").get()?.sql || '';
  if (!pbSql.includes('UNIQUE(company_id, month, year)')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS payroll_batches_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER DEFAULT 1,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        batch_name TEXT NOT NULL,
        status TEXT DEFAULT 'Draft',
        total_gross REAL DEFAULT 0,
        total_deductions REAL DEFAULT 0,
        total_net REAL DEFAULT 0,
        processed_by INTEGER,
        processed_at DATETIME,
        payment_date TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, month, year),
        FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
      );
      INSERT OR IGNORE INTO payroll_batches_new (id, company_id, month, year, batch_name, status, total_gross, total_deductions, total_net, processed_by, processed_at, payment_date, notes, created_at)
        SELECT id, COALESCE(company_id, 1), month, year, batch_name, status, total_gross, total_deductions, total_net, processed_by, processed_at, payment_date, notes, created_at FROM payroll_batches;
      DROP TABLE payroll_batches;
      ALTER TABLE payroll_batches_new RENAME TO payroll_batches;
    `);
    console.log('✅ Migrated payroll_batches table');
  }
} catch (err) {
  console.error('Migration error:', err.message);
} finally {
  db.exec('PRAGMA foreign_keys = ON;');
}
console.log('✅ Constraint check complete.');
