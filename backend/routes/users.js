const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const bcrypt = require('bcrypt');

// GET all users
router.get('/', (req, res) => {
  db.all('SELECT * FROM users', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ users: rows });
  });
});

// GET user by id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: row });
  });
});

// POST create user
router.post('/', async (req, res) => {
  const { username, password, role, email, sendEmail } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [username, hashedPassword, role], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      const newUserId = this.lastID;
      // optionally send credentials by email if requested and email provided
      if (sendEmail && email) {
        try {
          const smtpHost = process.env.SMTP_HOST;
          const smtpPort = process.env.SMTP_PORT;
          const smtpUser = process.env.SMTP_USER;
          const smtpPass = process.env.SMTP_PASS;
          const fromEmail = process.env.FROM_EMAIL || smtpUser;
          if (smtpHost && smtpPort && smtpUser && smtpPass) {
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransport({
              host: smtpHost,
              port: Number(smtpPort),
              secure: Number(smtpPort) === 465,
              auth: { user: smtpUser, pass: smtpPass }
            });
            const mailOptions = {
              from: fromEmail,
              to: email,
              subject: 'Your driver account credentials',
              text: `Your driver account has been created.\nUsername: ${username}\nPassword: ${password}\nPlease log in and change your password.`
            };
            transporter.sendMail(mailOptions, (mailErr, info) => {
              if (mailErr) console.error('Error sending user credentials email:', mailErr);
              else console.log('Credentials email sent:', info && info.response);
            });
          } else {
            console.warn('SMTP not configured; skipping sending credentials email');
          }
        } catch (e) {
          console.error('Email send error:', e);
        }
      }
      res.json({ id: newUserId });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error hashing password' });
  }
});

// PUT update user
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { username, password, role } = req.body;
  try {
    // Support partial updates: fetch existing user and merge
    db.get('SELECT * FROM users WHERE id = ?', [id], async (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (!row) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      const newUsername = (typeof username !== 'undefined') ? username : row.username;
      const newRole = (typeof role !== 'undefined') ? role : row.role;
      let newPasswordHash = row.password_hash;
      if (password) {
        try {
          newPasswordHash = await bcrypt.hash(password, 10);
        } catch (e) {
          res.status(500).json({ error: 'Error hashing password' });
          return;
        }
      }
      db.run('UPDATE users SET username = ?, password_hash = ?, role = ? WHERE id = ?',
        [newUsername, newPasswordHash, newRole, id], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ changes: this.changes });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error hashing password' });
  }
});

// DELETE user
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

// POST login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const isValid = await bcrypt.compare(password, row.password_hash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    // Return user without password
    const { password_hash, ...user } = row;
    res.json({ user });
  });
});

module.exports = router;