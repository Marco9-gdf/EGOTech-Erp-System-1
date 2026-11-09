import db from '../config/database.js';

console.log('🔄 Updating database: setting Harsh as Egotech Owner and removing client company 5...');

// 1. Move Harsh user to Egotech (company 1) as Owner
const updateHarsh = db.prepare(`
  UPDATE users 
  SET company_id = 1, role = 'owner', name = 'Harsh Shrivastava (Platform Owner)'
  WHERE LOWER(email) = 'khiladiharsh786@gmail.com'
`).run();

console.log('Harsh user updated:', updateHarsh.changes);

// 2. Remove company 5 and all related data
db.prepare('DELETE FROM leave_types WHERE company_id = 5').run();
db.prepare('DELETE FROM shifts WHERE company_id = 5').run();
db.prepare('DELETE FROM departments WHERE company_id = 5').run();
db.prepare('DELETE FROM companies WHERE id = 5').run();

console.log('Remaining companies:');
console.log(db.prepare('SELECT id, name, code, plan, status FROM companies').all());

console.log('Owner accounts:');
console.log(db.prepare("SELECT id, email, role, company_id, name FROM users WHERE role = 'owner'").all());
