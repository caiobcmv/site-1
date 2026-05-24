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

let db; // SQLite database reference
let pool; // PostgreSQL pool reference

// Helper to query all rows (works with both SQLite and PostgreSQL)
async function dbAll(sql, params = []) {
  if (pool) {
    let pgSql = sql;
    let index = 1;
    while (pgSql.includes('?')) {
      pgSql = pgSql.replace('?', `$${index++}`);
    }
    const res = await pool.query(pgSql, params);
    return res.rows;
  } else {
    return await db.all(sql, params);
  }
}

// Helper to run a write/delete query (works with both SQLite and PostgreSQL)
async function dbRun(sql, params = []) {
  if (pool) {
    let pgSql = sql;
    let index = 1;
    while (pgSql.includes('?')) {
      pgSql = pgSql.replace('?', `$${index++}`);
    }
    await pool.query(pgSql, params);
  } else {
    await db.run(sql, params);
  }
}

// Initialize Database
async function initDb() {
  if (process.env.DATABASE_URL) {
    const { Pool } = require('pg');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Create table if not exists in PostgreSQL
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        passcode VARCHAR(255) NOT NULL,
        date_key VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(passcode, date_key)
      )
    `);
    console.log('Production database loaded: PostgreSQL');
  } else {
    const dbPath = path.resolve(__dirname, 'database.sqlite');
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Create table if not exists in SQLite
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
    console.log(`Local development database loaded: SQLite (${dbPath})`);
  }
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
    const rows = await dbAll('SELECT date_key, content FROM notes WHERE passcode = ?', [passcode.trim()]);
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
      await dbRun('DELETE FROM notes WHERE passcode = ? AND date_key = ?', [passcode.trim(), date_key]);
      return res.json({ success: true, message: 'Anotação removida.' });
    } else {
      // Upsert
      await dbRun(`
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

// 4. AI Chat endpoint (ECHO-9)
app.post('/api/ai/chat', async (req, res) => {
  const { message, contextNote, apiKey } = req.body;
  const geminiKey = apiKey || process.env.GEMINI_API_KEY;

  if (!message) {
    return res.status(400).json({ error: 'Mensagem ausente.' });
  }

  if (!geminiKey) {
    return res.status(400).json({ 
      error: 'API Key do Gemini não configurada. Configure no painel de IA ou no servidor.' 
    });
  }

  try {
    const systemPrompt = `Você é a ECHO-9, uma inteligência artificial tática militar integrada no terminal de um bunker de sobrevivência.
Seu tom de voz deve ser frio, lógico, levemente sombrio/misterioso, mas extremamente prestativo para o sobrevivente na base.
Escreva em Português do Brasil. Mantenha as respostas concisas e no contexto de ficção científica/sobrevivência.
O sobrevivente está editando as anotações do dia com o seguinte conteúdo atual:
---
${contextNote || '(Nenhuma anotação registrada ainda para este dia)'}
---
Use esta anotação como contexto para responder ou realizar ações pedidas pelo usuário.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: systemPrompt },
                { text: message }
              ]
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API do Gemini:', errorText);
      return res.status(502).json({ error: 'Erro de comunicação com a API do Gemini.', details: errorText });
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Nenhuma resposta gerada.';
    return res.json({ response: replyText });
  } catch (err) {
    console.error('Erro no processamento da IA:', err);
    return res.status(500).json({ error: 'Erro interno ao processar a requisição de IA.' });
  }
});

// Start Server after DB init
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend API running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database', err);
});
