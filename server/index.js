const express = require('express');
const cors = require('cors');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

let db;

// Initialize Database
async function initDb() {
  const dbPath = path.resolve(__dirname, 'database.sqlite');
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Create table if not exists
  await db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      passcode TEXT NOT NULL,
      date_key TEXT NOT NULL,
      content TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(passcode, date_key)
    )
  `);
  
  console.log(`Database loaded: ${dbPath}`);
}

// Routes

// 1. Validate Passcode Login
app.post('/api/login', (req, res) => {
  const { passcode } = req.body;
  if (!passcode || passcode.trim().length < 4) {
    return res.status(400).json({ error: 'O código de acesso deve ter pelo menos 4 caracteres.' });
  }
  
  // Passcode acts as key. We accept any passcode, which dynamically partitions their notes database.
  return res.json({ success: true, message: 'Autenticado com sucesso.' });
});

// 2. Get all notes for a passcode
app.get('/api/notes', async (req, res) => {
  const { passcode } = req.query;
  if (!passcode) {
    return res.status(400).json({ error: 'Código de acesso ausente.' });
  }

  try {
    const rows = await db.all('SELECT date_key, content FROM notes WHERE passcode = ?', [passcode.trim()]);
    // Format response as a key-value object: { "2026-05-24": "Anotação aqui..." }
    const notesMap = {};
    rows.forEach(row => {
      notesMap[row.date_key] = row.content;
    });
    
    return res.json(notesMap);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar anotações.' });
  }
});

// 3. Save / Update a note
app.post('/api/notes', async (req, res) => {
  const { passcode, date_key, content } = req.body;

  if (!passcode || !date_key) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
  }

  try {
    const cleanContent = content ? content.trim() : '';

    if (cleanContent === '') {
      // If content is empty, delete the row
      await db.run('DELETE FROM notes WHERE passcode = ? AND date_key = ?', [passcode.trim(), date_key]);
      return res.json({ success: true, message: 'Anotação removida.' });
    } else {
      // Upsert
      await db.run(`
        INSERT INTO notes (passcode, date_key, content, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(passcode, date_key) DO UPDATE SET
          content = excluded.content,
          updated_at = CURRENT_TIMESTAMP
      `, [passcode.trim(), date_key, cleanContent]);
      
      return res.json({ success: true, message: 'Anotação salva.' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao salvar anotação.' });
  }
});

// Start Server after DB init
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend API running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize SQLite database', err);
});
