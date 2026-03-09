const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const db = new sqlite3.Database('./fleet.db');

// Create maintenance user
const username = 'maintenancier';
const password = 'maintenance123';
const role = 'maintenance';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    db.close();
    return;
  }

  db.run(
    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
    [username, hash, role],
    function(err) {
      if (err) {
        console.error('Error creating user:', err.message);
      } else {
        console.log('✅ Maintenance user created successfully!');
        console.log('Username:', username);
        console.log('Password:', password);
        console.log('Role:', role);
      }
      db.close();
    }
  );
});
