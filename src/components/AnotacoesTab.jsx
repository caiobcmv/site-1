import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Save, FileText, Sparkles, ChevronLeft, ChevronRight, Lock, Unlock, Eye, EyeOff, ShieldAlert, LogOut, Loader2 } from 'lucide-react';

const DAILY_PROMPTS = [
  "O que você observou de diferente na névoa hoje?",
  "Registre qualquer ruído ou som mecânico incomum ouvido nas últimas 24 horas.",
  "Descreva o estado dos seus mantimentos e suprimentos de segurança.",
  "Houve algum sinal ou marcação nova nas redondezas? Desenhe ou descreva em detalhes.",
  "Qual é o plano de contingência caso a energia da base falhe esta noite?",
  "Escreva um resumo do que você aprendeu nas aulas hoje e como aplicar na prática.",
  "Registre seus pensamentos. O isolamento pode afetar a percepção; documentar ajuda a manter o foco."
];

// Configure API URL (can be overridden in production build)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function AnotacoesTab() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [noteContent, setNoteContent] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  
  // Auth & Cloud States
  const [passcode, setPasscode] = useState('');
  const [passcodeInput, setPasscodeInput] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [authError, setAuthError] = useState('');
  const [allNotes, setAllNotes] = useState({}); // { "YYYY-MM-DD": "content" }
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const timerRef = useRef(null);

  // Helper to format date as YYYY-MM-DD (local timezone safe)
  const getLocalDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const selectedKey = getLocalDateKey(selectedDate);

  // 1. Check local session for passcode on mount
  useEffect(() => {
    const savedPasscode = localStorage.getItem('notes_passcode');
    if (savedPasscode) {
      setPasscode(savedPasscode);
      setIsAuthorized(true);
    }
  }, []);

  // 2. Fetch all notes from cloud once passcode is authenticated
  useEffect(() => {
    if (isAuthorized && passcode) {
      loadCloudNotes();
    }
  }, [isAuthorized, passcode]);

  // 3. Handle active note content updates on selectedKey change
  useEffect(() => {
    if (isAuthorized) {
      const activeNote = allNotes[selectedKey] || '';
      setNoteContent(activeNote);
      setSaveStatus('saved');
    }
  }, [selectedKey, allNotes, isAuthorized]);

  const loadCloudNotes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/notes?passcode=${encodeURIComponent(passcode)}`);
      if (response.ok) {
        const data = await response.json();
        setAllNotes(data);
      } else {
        console.error('Falha ao sincronizar as anotações do servidor.');
      }
    } catch (err) {
      console.error('Erro de conexão ao buscar notas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Authenticate user passcode input
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (passcodeInput.trim().length < 4) {
      setAuthError('O código deve conter pelo menos 4 caracteres.');
      return;
    }

    setAuthError('');
    setIsAuthenticating(true);

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcodeInput.trim() })
      });

      if (response.ok) {
        const cleanCode = passcodeInput.trim();
        localStorage.setItem('notes_passcode', cleanCode);
        setPasscode(cleanCode);
        setIsAuthorized(true);
      } else {
        const errData = await response.json();
        setAuthError(errData.error || 'Código incorreto ou inválido.');
      }
    } catch (err) {
      setAuthError('Sem conexão com o servidor. Verifique se o backend está rodando.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Logout/Lock notes diary
  const handleLogout = () => {
    localStorage.removeItem('notes_passcode');
    setPasscode('');
    setPasscodeInput('');
    setIsAuthorized(false);
    setAllNotes({});
  };

  // Autosave notes to the cloud database
  const handleNoteChange = (e) => {
    const val = e.target.value;
    setNoteContent(val);
    setSaveStatus('saving');

    // Debounce save (wait 800ms after last stroke)
    if (timerRef.current) clearTimeout(timerRef.current);
    
    timerRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`${API_URL}/api/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            passcode,
            date_key: selectedKey,
            content: val
          })
        });

        if (response.ok) {
          // Update local mapping in memory
          setAllNotes(prev => {
            const next = { ...prev };
            if (val.trim() === '') {
              delete next[selectedKey];
            } else {
              next[selectedKey] = val;
            }
            return next;
          });
          setSaveStatus('saved');
        } else {
          setSaveStatus('error');
        }
      } catch (err) {
        console.error('Falha de conexão ao salvar na nuvem:', err);
        setSaveStatus('error');
      }
    }, 800);
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Generate calendar days
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const calendarDays = [];

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarDays.push({
      dayNum: prevMonthTotalDays - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, prevMonthTotalDays - i)
    });
  }

  for (let i = 1; i <= totalDays; i++) {
    calendarDays.push({
      dayNum: i,
      isCurrentMonth: true,
      date: new Date(year, month, i)
    });
  }

  const remainingCells = 42 - calendarDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarDays.push({
      dayNum: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i)
    });
  }

  const navigateMonth = (direction) => {
    setCurrentDate(new Date(year, month + direction, 1));
  };

  const getMonthName = (monthIdx) => {
    const names = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return names[monthIdx];
  };

  const getDayOfWeekName = (date) => {
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return days[date.getDay()];
  };

  const formatLongDate = (date) => {
    return `${date.getDate()} de ${getMonthName(date.getMonth())} de ${date.getFullYear()}`;
  };

  const getPromptForDay = (date) => {
    const day = date.getDate();
    return DAILY_PROMPTS[day % DAILY_PROMPTS.length];
  };

  // Days with saved notes
  const daysWithNotes = Object.keys(allNotes);

  const wordCount = noteContent.trim() ? noteContent.trim().split(/\s+/).length : 0;
  const charCount = noteContent.length;

  // --- RENDER PASSCODE LOCKSCREEN ---
  if (!isAuthorized) {
    return (
      <div 
        className="scale-up" 
        style={{ 
          maxWidth: '420px', 
          margin: '4rem auto', 
          padding: '2.5rem 2rem', 
          background: 'var(--bg-card)', 
          border: '1px solid var(--border-medium)', 
          borderRadius: '12px',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        <div className="sidebar-logo-icon" style={{ margin: '0 auto 1.5rem', width: '54px', height: '54px' }}>
          <Lock size={22} style={{ color: '#000' }} />
        </div>
        
        <h3 className="haunted-flicker" style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Diário Bloqueado
        </h3>
        
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '2rem' }}>
          Insira seu código secreto para descriptografar e carregar suas anotações salvadas na nuvem. Se for seu primeiro acesso, digite qualquer código para criar sua partição.
        </p>

        <form onSubmit={handleAuthSubmit}>
          <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <input
              type={showPasscode ? 'text' : 'password'}
              placeholder="Digite seu código secreto..."
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value)}
              style={{
                width: '100%',
                background: '#000',
                border: '1px solid var(--border-medium)',
                borderRadius: '6px',
                padding: '0.8rem 2.8rem 0.8rem 1rem',
                color: '#fff',
                fontSize: '0.95rem',
                outline: 'none',
                fontFamily: 'monospace',
                letterSpacing: '0.15em'
              }}
              disabled={isAuthenticating}
            />
            <button
              type="button"
              onClick={() => setShowPasscode(!showPasscode)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {showPasscode ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {authError && (
            <div style={{ display: 'flex', gap: '8px', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.75rem', color: '#fff', textAlign: 'left', lineHeight: '1.4' }}>
              <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{authError}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn-start"
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            disabled={isAuthenticating}
          >
            {isAuthenticating ? (
              <>
                <Loader2 size={16} className="spin" style={{ animation: 'spinSlow 1.5s linear infinite' }} />
                Descriptografando...
              </>
            ) : (
              <>
                <Unlock size={16} />
                Acessar Notas
              </>
            )}
          </button>
        </form>
      </div>
    );
  }

  // --- RENDER MAIN DIARY VIEW ---
  return (
    <div className="notes-container scale-up">
      {/* Calendar Selector Sidebar */}
      <div className="notes-sidebar-card">
        <div className="calendar-header">
          <span className="calendar-month-title">
            {getMonthName(month)} <span>{year}</span>
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="calendar-nav-btn" onClick={() => navigateMonth(-1)}>
              <ChevronLeft size={16} />
            </button>
            <button className="calendar-nav-btn" onClick={() => navigateMonth(1)}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="calendar-grid">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
            <div key={idx} className="calendar-day-label">{day}</div>
          ))}

          {calendarDays.map((cell, idx) => {
            const cellKey = getLocalDateKey(cell.date);
            const isSelected = selectedKey === cellKey;
            const hasNote = daysWithNotes.includes(cellKey);
            const isToday = getLocalDateKey(new Date()) === cellKey;

            return (
              <button
                key={idx}
                className={`calendar-cell ${cell.isCurrentMonth ? 'current-month' : ''} ${isSelected ? 'selected' : ''} ${hasNote ? 'has-note' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => setSelectedDate(cell.date)}
              >
                {cell.dayNum}
              </button>
            );
          })}
        </div>

        {/* History / Recent Notes List */}
        <div className="notes-history-header">Dias com Anotação</div>
        <div className="notes-history-list">
          {isLoading ? (
            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
              <Loader2 size={20} className="spin" style={{ animation: 'spinSlow 1.5s linear infinite' }} />
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>Sincronizando...</span>
            </div>
          ) : daysWithNotes.length === 0 ? (
            <div style={{ padding: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Nenhuma anotação salva nesta partição.
            </div>
          ) : (
            [...daysWithNotes].sort().reverse().map(dateStr => {
              const [y, m, d] = dateStr.split('-');
              const dateObj = new Date(y, m - 1, d);
              const preview = allNotes[dateStr] || '';
              const isActive = selectedKey === dateStr;

              return (
                <button
                  key={dateStr}
                  className={`history-item ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedDate(dateObj)}
                >
                  <span className="history-item-date">{d}/{m}</span>
                  <span className="history-item-preview">{preview || 'Sem conteúdo'}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Notebook Editor Panel */}
      <div className="editor-card">
        <div className="editor-header">
          <div className="editor-date-info">
            <h3>{getDayOfWeekName(selectedDate)}</h3>
            <p>{formatLongDate(selectedDate)}</p>
          </div>
          <div className="editor-actions">
            <div className={`save-indicator ${saveStatus === 'saved' ? 'saved' : ''}`} style={{ marginRight: '8px' }}>
              <Save size={14} />
              <span>
                {saveStatus === 'saved' && 'Sincronizado na Nuvem'}
                {saveStatus === 'saving' && 'Salvando na Nuvem...'}
                {saveStatus === 'error' && 'Erro ao Salvar!'}
              </span>
            </div>
            
            <button 
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-light)',
                borderRadius: '4px',
                padding: '0.3rem 0.6rem',
                cursor: 'pointer',
                background: 'none'
              }}
              className="btn-ctrl-mini"
              title="Sair e Bloquear Diário"
            >
              <LogOut size={12} />
              <span>Bloquear</span>
            </button>
          </div>
        </div>

        <div style={{ padding: '1rem 2rem 0' }}>
          <div className="daily-prompt-box">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: 'var(--color-primary)', marginBottom: '4px', textTransform: 'uppercase', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
              <Sparkles size={12} /> Sugestão de Diário
            </span>
            <p>{getPromptForDay(selectedDate)}</p>
          </div>
        </div>

        <div className="editor-textarea-wrapper" style={{ position: 'relative' }}>
          {isLoading ? (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(9,9,11,0.7)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
              <Loader2 size={32} className="spin" style={{ animation: 'spinSlow 1.5s linear infinite', color: '#fff' }} />
            </div>
          ) : null}
          <textarea
            className="editor-textarea"
            placeholder="Comece a digitar sua anotação diária aqui... (Seu progresso será salvo automaticamente na nuvem)"
            value={noteContent}
            onChange={handleNoteChange}
            disabled={isLoading}
          />
        </div>

        <div className="editor-footer">
          <div>
            <span style={{ marginRight: '16px' }}>Palavras: {wordCount}</span>
            <span>Caracteres: {charCount}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={14} />
            <span>key_{selectedKey}.notes</span>
          </div>
        </div>
      </div>
    </div>
  );
}
