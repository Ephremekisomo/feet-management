const db = require('./db/connection');

db.all('SELECT * FROM maintenance', [], (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Maintenance records:', rows.length);
    console.log('Records:', rows);
  }
  process.exit(0);
});
