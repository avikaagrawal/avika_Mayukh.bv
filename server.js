const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files (index.html, assets)
app.use(express.static(__dirname));

// Initialize SQLite database
const dbPath = path.join(__dirname, 'mayukh.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at', dbPath);
  }
});

// Create users table if it doesn't exist
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    (err) => {
      if (err) {
        console.error('Error creating users table:', err.message);
      } else {
        console.log('Users table is ready.');
      }
    }
  );
});

// Helper: basic validation
function validateAuthPayload(body) {
  const { email, password, role } = body;
  if (!email || !password || !role) {
    return 'Email, password and role are required.';
  }
  return null;
}

// Signup endpoint
app.post('/api/auth/signup', (req, res) => {
  const error = validateAuthPayload(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error });
  }

  const { email, password, role } = req.body;

  const stmt = db.prepare(
    'INSERT INTO users (email, password, role) VALUES (?, ?, ?)'
  );
  stmt.run([email, password, role], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res
          .status(409)
          .json({ success: false, message: 'User with this email already exists.' });
      }
      console.error('Error inserting user:', err.message);
      return res
        .status(500)
        .json({ success: false, message: 'Internal server error.' });
    }

    return res.json({
      success: true,
      message: 'Signup successful.',
      user: { id: this.lastID, email, role }
    });
  });
  stmt.finalize();
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  const error = validateAuthPayload(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error });
  }

  const { email, password, role } = req.body;

  db.get(
    'SELECT id, email, role, password FROM users WHERE email = ?',
    [email],
    (err, row) => {
      if (err) {
        console.error('Error querying user:', err.message);
        return res
          .status(500)
          .json({ success: false, message: 'Internal server error.' });
      }

      if (!row) {
        return res
          .status(401)
          .json({ success: false, message: 'Invalid email or password.' });
      }

      // Plain-text password comparison for demo purposes only
      if (row.password !== password) {
        return res
          .status(401)
          .json({ success: false, message: 'Invalid email or password.' });
      }

      if (row.role !== role) {
        return res
          .status(401)
          .json({ success: false, message: 'Invalid role selected.' });
      }

      return res.json({
        success: true,
        message: 'Login successful.',
        user: { id: row.id, email: row.email, role: row.role }
      });
    }
  );
});

// Fallback to index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});


