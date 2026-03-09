const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./fleet.db');

// Add scheduled_date and status columns to maintenance table
db.run('ALTER TABLE maintenance ADD COLUMN scheduled_date TEXT', (err) => {
  if (err && !err.message.includes('duplicate')) {
    console.error('Error adding scheduled_date:', err.message);
  } else {
    console.log('✅ Added scheduled_date column');
  }
});

db.run('ALTER TABLE maintenance ADD COLUMN status TEXT DEFAULT "planned"', (err) => {
  if (err && !err.message.includes('duplicate')) {
    console.error('Error adding status:', err.message);
  } else {
    console.log('✅ Added status column');
  }
  
  // Close database after both operations
  setTimeout(() => {
    db.close();
    console.log('✅ Maintenance table updated successfully');
  }, 100);
});
