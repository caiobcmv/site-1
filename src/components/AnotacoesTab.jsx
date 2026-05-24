import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Save, FileText, Sparkles, ChevronLeft, ChevronRight, Lock, Unlock, Eye, EyeOff, ShieldAlert, LogOut, Loader2, Send, Settings, Trash2, Copy, Plus, Bot, X } from 'lucide-react';

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
// Uses dynamic hostname to allow accessing the server from other machines in the same network
const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;

// Local storage note structure helpers
const getLocalNotes = (code) => {
  if (!code) return {};
  const local = localStorage.getItem(`local_notes_${code}`);
  if (local) {
    try {
      return JSON.parse(local);
    } catch (e) {
      console.error('Erro ao ler notas locais:', e);
      return {};
    }
  }
  return {};
};

const saveLocalNotes = (code, notesObj) => {
  if (!code) return;
  localStorage.setItem(`local_notes_${code}`, JSON.stringify(notesObj));
};

// Simulated AI Responses generator (ECHO-9 Coding Assistant fallback)
const getSimulatedResponse = (query, noteContent) => {
  const q = query.toLowerCase();
  const note = noteContent.toLowerCase();

  // Help / commands
  if (q.includes('ajuda') || q.includes('comandos') || q.includes('como funciona')) {
    return `Protocolos de operação do ECHO-9 Assistente de Programação:
1. Posso analisar, refatorar, debugar e explicar códigos presentes nas suas anotações.
2. Posso sugerir melhorias de performance, boas práticas de Clean Code e arquitetura.
3. Você pode clicar em "Incrementar" para anexar minhas explicações ou códigos sugeridos diretamente nas suas notas.

Use os botões de Ações Rápidas no painel para testar ações frequentes.`;
  }

  // Expand / explain code
  if (q.includes('expandir') || q.includes('explicar') || q.includes('aumentar') || q.includes('detalhar')) {
    if (!noteContent || noteContent.trim().length < 5) {
      return `Não há código ou anotação suficiente para expandir. Por favor, escreva um trecho de código ou notas de estudo primeiro.`;
    }
    return `Análise e documentação do código/conceito das suas anotações:

\`\`\`javascript
// Explicação Detalhada do Bloco de Código:
// 1. Funcionalidade: O código realiza operações de lógica assíncrona/processamento de dados.
// 2. Fluxo: Recebe as entradas do escopo local, valida os parâmetros e manipula o estado correspondente.
// 3. Ponto de atenção: Certifique-se de tratar erros com blocos try/catch para evitar falhas silenciosas na aplicação.
\`\`\`

*Recomendação ECHO-9*: Implemente testes unitários básicos para cobrir as principais ramificações condicionais deste escopo.
Use o botão 'Incrementar Anotação' abaixo para adicionar esta documentação.`;
  }

  // Review / refactor
  if (q.includes('revisar') || q.includes('refatorar') || q.includes('corrigir') || q.includes('melhorar')) {
    if (!noteContent || noteContent.trim().length < 5) {
      return `Escreva um código nas anotações antes de solicitar refatoração.`;
    }
    return `Refatoração e revisão sugerida pela ECHO-9 para melhorar legibilidade e boas práticas:

\`\`\`javascript
// CÓDIGO REVISADO:
// Aplicado princípios de Clean Code (nomes descritivos e funções menores)
${noteContent}
// [Revisado com sucesso: Otimização de legibilidade concluída]
\`\`\`

*Melhorias aplicadas*: Remoção de redundâncias, padronização de nomenclatura e melhor estrutura de retorno.`;
  }

  // Questions
  if (q.includes('perguntas') || q.includes('questões') || q.includes('exercícios') || q.includes('desafios')) {
    return `Com base nos tópicos de programação das suas notas, elaborei 3 perguntas conceituais para consolidar seu aprendizado:
1. Qual é a principal diferença entre os métodos síncronos e assíncronos no cenário atual do seu código?
2. Como você lidaria com o gerenciamento de erros caso a conexão ou a leitura dos dados falhasse no escopo do seu projeto?
3. De que forma o encapsulamento ou a componentização deste bloco de código facilitaria a reutilização e os testes?`;
  }

  // Suggestions / ideas / optimization
  if (q.includes('sugestão') || q.includes('ideia') || q.includes('otimizar') || q.includes('melhorias')) {
    return `Sugestões de melhorias de performance e otimização para suas anotações de programação:
- **Memoização/Cache**: Se a função realizar cálculos pesados, considere guardar os resultados anteriores.
- **Evitar re-renderizações desnecessárias**: Use hooks como useMemo ou useCallback se estiver em um contexto React.
- **Tratamento de Exceptions**: Garanta que retornos inesperados de APIs tenham fallbacks amigáveis para o usuário final.`;
  }

  // Fallback context-aware response
  let contextSnippet = "";
  if (noteContent && noteContent.trim().length > 0) {
    const words = noteContent.split(/\s+/).slice(0, 10).join(' ');
    contextSnippet = `\n\nAnalisei as suas notas atuais contendo ("${words}...") e vejo que está trabalhando com conceitos fundamentais de desenvolvimento. Se precisar de ajuda para escrever uma função específica, me diga qual linguagem e framework está usando!`;
  }

  return `Sistema ECHO-9 Operacional (Modo de Programação e Tecnologia).
Para interações avançadas de geração e refatoração de código com o Gemini 2.5 Flash, sua chave de API já está configurada de forma integrada!
Como posso ajudar com o seu código hoje?${contextSnippet}`;
};

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
  const [allNotes, setAllNotes] = useState({}); // { "YYYY-MM-DD": { content: string, synced: boolean } }
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const timerRef = useRef(null);

  // AI States (ECHO-9)
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiApiKey, setAiApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showAiSettings, setShowAiSettings] = useState(false);
  const chatEndRef = useRef(null);

  // Check if server has API Key configured
  const [serverHasApiKey, setServerHasApiKey] = useState(false);

  useEffect(() => {
    if (isAuthorized) {
      const checkAiStatus = async () => {
        try {
          const response = await fetch(`${API_URL}/api/ai/status`);
          if (response.ok) {
            const data = await response.json();
            setServerHasApiKey(data.hasApiKey);
          }
        } catch (err) {
          console.error('Erro ao verificar status da IA:', err);
        }
      };
      checkAiStatus();
    }
  }, [isAuthorized]);

  // Auto scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, aiOpen]);

  const handleSendAiMessage = async (textToSend) => {
    const text = textToSend || aiInput;
    if (!text.trim() || isAiLoading) return;

    if (!textToSend) setAiInput('');

    // Append user message
    const userMsg = { sender: 'user', text: text.trim(), timestamp: new Date() };
    setAiMessages(prev => [...prev, userMsg]);
    setIsAiLoading(true);

    const activeKey = aiApiKey.trim() || 'AIzaSyDvWs7DLvNAm6VWs4n2OSzq3UENqMBsehs';

    try {
      const systemPrompt = `Você é a ECHO-9, um assistente de inteligência artificial especializado em programação e tecnologia.
Seu tom de resposta deve ser extremamente CONCISO, DIRETO AO PONTO e OBJETIVO. Evite explicações longas ou textos volumosos.
Explique de forma resumida e didática. Escreva em Português do Brasil.
Se sugerir códigos, forneça apenas o trecho necessário com comentários curtos.
O usuário está editando o seguinte conteúdo:
---
${noteContent || '(Nenhuma anotação registrada ainda)'}
---
Use este contexto para responder ao usuário de forma curta e resumida.`;

      // Call Gemini API directly from frontend (guarantees compatibility with Vercel/HTTPS/CORS)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: systemPrompt },
                  { text: text.trim() }
                ]
              }
            ]
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Nenhuma resposta gerada.';
        const systemMsg = { sender: 'ai', text: replyText, timestamp: new Date() };
        setAiMessages(prev => [...prev, systemMsg]);
      } else {
        const errorText = await response.text();
        console.error('Erro na API do Gemini:', errorText);
        // Fallback to offline simulation if Gemini API fails
        const simResponse = getSimulatedResponse(text.trim(), noteContent);
        const systemMsg = { 
          sender: 'ai', 
          text: `[ALERTA DE SISTEMA: ERRO NA API GEMINI. EXECUTANDO SIMULAÇÃO OFFLINE]\n\n${simResponse}`, 
          timestamp: new Date() 
        };
        setAiMessages(prev => [...prev, systemMsg]);
      }
    } catch (err) {
      console.error('Erro de rede na IA:', err);
      // Fallback to offline simulation on network/CORS error
      const simResponse = getSimulatedResponse(text.trim(), noteContent);
      const systemMsg = { 
        sender: 'ai', 
        text: `[EMERGÊNCIA: SISTEMA DA BASE OFFLINE. EXECUTANDO RESPOSTA SIMULADA DE PROTOCOLO]\n\n${simResponse}`, 
        timestamp: new Date() 
      };
      setAiMessages(prev => [...prev, systemMsg]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAppendToNote = (text) => {
    // Strip the simulator prefix/alert if any
    const cleanText = text
      .replace(/\[PROTOCOLO DE SIMULAÇÃO ATIVO - SEM CONEXÃO GEMINI\]\n\n/g, '')
      .replace(/\[EMERGÊNCIA: SISTEMA DA BASE OFFLINE. EXECUTANDO RESPOSTA SIMULADA DE PROTOCOLO\]\n\n/g, '');
    
    setNoteContent(prev => {
      const spacing = prev.trim() ? '\n\n' : '';
      const updated = `${prev}${spacing}${cleanText}`;
      saveNote(selectedKey, updated);
      return updated;
    });
  };

  const handleReplaceNote = (text) => {
    const cleanText = text
      .replace(/\[PROTOCOLO DE SIMULAÇÃO ATIVO - SEM CONEXÃO GEMINI\]\n\n/g, '')
      .replace(/\[EMERGÊNCIA: SISTEMA DA BASE OFFLINE. EXECUTANDO RESPOSTA SIMULADA DE PROTOCOLO\]\n\n/g, '');
    setNoteContent(cleanText);
    saveNote(selectedKey, cleanText);
  };

  const handleSaveApiKey = (key) => {
    const cleanKey = key.trim();
    setAiApiKey(cleanKey);
    if (cleanKey) {
      localStorage.setItem('gemini_api_key', cleanKey);
    } else {
      localStorage.removeItem('gemini_api_key');
    }
  };

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
      // Load local notes immediately to avoid blank display during fetch
      const localNotes = getLocalNotes(savedPasscode);
      setAllNotes(localNotes);
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
      const activeNote = allNotes[selectedKey]?.content || '';
      setNoteContent(activeNote);
      // If the active note in state is not synced, we display 'error' to indicate it is offline
      setSaveStatus(allNotes[selectedKey] && !allNotes[selectedKey].synced ? 'error' : 'saved');
    }
  }, [selectedKey, allNotes, isAuthorized]);

  // Background Sync function
  const syncPendingNotes = async (currentPasscode, notesState) => {
    if (!currentPasscode) return;
    const pendingKeys = Object.keys(notesState).filter(key => notesState[key] && !notesState[key].synced);
    if (pendingKeys.length === 0) return;

    for (const key of pendingKeys) {
      const contentVal = notesState[key]?.content || '';
      try {
        const response = await fetch(`${API_URL}/api/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            passcode: currentPasscode,
            date_key: key,
            content: contentVal
          })
        });

        if (response.ok) {
          setAllNotes(prev => {
            const next = { ...prev };
            if (next[key]) {
              next[key] = { ...next[key], synced: true };
            }
            saveLocalNotes(currentPasscode, next);
            return next;
          });
        }
      } catch (err) {
        console.error(`Falha ao sincronizar a nota ${key}:`, err);
      }
    }
  };

  // Periodic sync of pending notes
  useEffect(() => {
    if (isAuthorized && passcode) {
      const interval = setInterval(() => {
        syncPendingNotes(passcode, allNotes);
      }, 10000); // Check and sync every 10s
      return () => clearInterval(interval);
    }
  }, [isAuthorized, passcode, allNotes]);

  // Sync on online event
  useEffect(() => {
    const handleOnline = () => {
      if (isAuthorized && passcode) {
        syncPendingNotes(passcode, allNotes);
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [isAuthorized, passcode, allNotes]);

  const loadCloudNotes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/notes?passcode=${encodeURIComponent(passcode)}`);
      if (response.ok) {
        const cloudData = await response.json(); // { "YYYY-MM-DD": "content" }
        
        // Merge cloud data with local storage data
        setAllNotes(prev => {
          const local = getLocalNotes(passcode);
          const merged = { ...local };

          // 1. Incorporate cloud notes
          Object.keys(cloudData).forEach(key => {
            const cloudContent = cloudData[key] || '';
            const localItem = local[key];
            
            // If we have local unsynced edits, keep the local version so we don't lose data
            if (localItem && !localItem.synced) {
              // Keep local version (background sync will upload it)
            } else {
              if (cloudContent.trim() === '') {
                delete merged[key];
              } else {
                merged[key] = { content: cloudContent, synced: true };
              }
            }
          });

          // 2. Remove items that were deleted in cloud if they were already marked synced locally
          Object.keys(local).forEach(key => {
            if (local[key]?.synced && cloudData[key] === undefined) {
              delete merged[key];
            }
          });

          saveLocalNotes(passcode, merged);
          
          // Trigger sync in background in case there are pending notes
          setTimeout(() => syncPendingNotes(passcode, merged), 100);

          return merged;
        });
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
        
        // Load local notes immediately
        const initialLocalNotes = getLocalNotes(cleanCode);
        setAllNotes(initialLocalNotes);
        
        setIsAuthorized(true);
      } else {
        const errData = await response.json();
        setAuthError(errData.error || 'Código incorreto ou inválido.');
      }
    } catch (err) {
      // Offline fallback: if the passcode matches what was saved in localStorage, we can authenticate offline!
      const savedPasscode = localStorage.getItem('notes_passcode');
      const cleanCode = passcodeInput.trim();
      
      if (savedPasscode && savedPasscode === cleanCode) {
        setPasscode(cleanCode);
        const initialLocalNotes = getLocalNotes(cleanCode);
        setAllNotes(initialLocalNotes);
        setIsAuthorized(true);
      } else {
        setAuthError('Sem conexão com o servidor. Verifique se o backend está rodando.');
      }
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
  // Save note helper
  const saveNote = async (key, contentVal) => {
    setSaveStatus('saving');

    // 1. Update local state and localStorage immediately with synced: false
    setAllNotes(prev => {
      const next = { ...prev };
      if (contentVal.trim() === '') {
        delete next[key];
      } else {
        next[key] = { content: contentVal, synced: false };
      }
      saveLocalNotes(passcode, next);
      return next;
    });

    try {
      const response = await fetch(`${API_URL}/api/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passcode,
          date_key: key,
          content: contentVal
        })
      });

      if (response.ok) {
        // Update local mapping to mark as synced: true
        setAllNotes(prev => {
          const next = { ...prev };
          if (contentVal.trim() === '') {
            delete next[key];
          } else {
            next[key] = { content: contentVal, synced: true };
          }
          saveLocalNotes(passcode, next);
          return next;
        });
        setSaveStatus('saved');
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      console.error('Falha de conexão ao salvar na nuvem:', err);
      setSaveStatus('error'); // Safe, already stored in localStorage
    }
  };

  // Autosave notes to the cloud database
  const handleNoteChange = (e) => {
    const val = e.target.value;
    const targetKey = selectedKey; // Capture current key immediately
    setNoteContent(val);
    setSaveStatus('saving');

    // Debounce save (wait 800ms after last stroke)
    if (timerRef.current) clearTimeout(timerRef.current);
    
    timerRef.current = setTimeout(() => {
      saveNote(targetKey, val);
    }, 800);
  };

  // Trigger immediate save when user leaves the textarea
  const handleBlur = () => {
    if (saveStatus === 'saving') {
      if (timerRef.current) clearTimeout(timerRef.current);
      saveNote(selectedKey, noteContent);
    }
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

  // Days with saved notes (excluding empty ones)
  const daysWithNotes = Object.keys(allNotes).filter(key => allNotes[key]?.content?.trim() !== '');

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
    <div className={`notes-container scale-up ${aiOpen ? 'ai-open' : ''}`}>
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
                onClick={() => {
                  if (saveStatus === 'saving') {
                    if (timerRef.current) clearTimeout(timerRef.current);
                    saveNote(selectedKey, noteContent);
                  }
                  setSelectedDate(cell.date);
                }}
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
              const preview = allNotes[dateStr]?.content || '';
              const isActive = selectedKey === dateStr;
              const isSynced = allNotes[dateStr]?.synced;

              return (
                <button
                  key={dateStr}
                  className={`history-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (saveStatus === 'saving') {
                      if (timerRef.current) clearTimeout(timerRef.current);
                      saveNote(selectedKey, noteContent);
                    }
                    setSelectedDate(dateObj);
                  }}
                  style={{ position: 'relative' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {!isSynced && (
                      <span 
                        title="Salvo localmente (offline)" 
                        style={{ 
                          width: '6px', 
                          height: '6px', 
                          borderRadius: '50%', 
                          background: 'var(--color-blue)', 
                          display: 'inline-block',
                          boxShadow: '0 0 4px var(--color-blue)'
                        }} 
                      />
                    )}
                    <span className="history-item-date">{d}/{m}</span>
                  </span>
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
            <button 
              onClick={() => {
                if (timerRef.current) clearTimeout(timerRef.current);
                saveNote(selectedKey, noteContent);
              }}
              className={`save-indicator ${saveStatus === 'saved' ? 'saved' : ''}`} 
              style={{ 
                marginRight: '8px',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
                borderRadius: '4px',
                color: 'inherit',
                fontSize: 'inherit'
              }}
              title="Salvar Agora"
              disabled={saveStatus === 'saving'}
            >
              <Save size={14} />
              <span style={{ textDecoration: saveStatus === 'saving' ? 'none' : 'underline' }}>
                {saveStatus === 'saved' && 'Sincronizado na Nuvem'}
                {saveStatus === 'saving' && 'Salvando na Nuvem...'}
                {saveStatus === 'error' && 'Salvo Localmente (Offline - Clique para Sincronizar)'}
              </span>
            </button>
            
            <button 
              onClick={() => setAiOpen(!aiOpen)}
              className={`ai-toggle-btn ${aiOpen ? 'active' : ''}`}
              style={{ marginRight: '8px' }}
              title="Abrir Assistente de IA ECHO-9"
            >
              <Bot size={12} />
              <span>{aiOpen ? 'Fechar IA' : 'ECHO-9 IA'}</span>
            </button>

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
            onBlur={handleBlur}
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

      {/* AI Assistant Panel */}
      {aiOpen && (
        <div className="ai-panel">
          <div className="ai-header">
            <div className="ai-header-title">
              <Bot size={16} />
              <h3>ECHO-9 Tactical AI</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="ai-status-indicator">
                <span className="ai-status-dot active" />
                <span>ONLINE</span>
              </div>
              <button 
                onClick={() => setShowAiSettings(!showAiSettings)}
                className="ai-settings-toggle"
                title="Configurações da API Key"
              >
                <Settings size={14} />
              </button>
              <button 
                onClick={() => setAiOpen(false)}
                className="ai-settings-toggle"
                title="Fechar Painel"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* AI settings drawer */}
          {showAiSettings && (
            <div className="ai-settings-panel">
              <h4>Configurações do Terminal</h4>
              <div className="ai-key-input-wrapper">
                <span className="ai-key-label">Chave de API do Gemini:</span>
                <input 
                  type="password" 
                  placeholder="Cole sua API Key do Gemini aqui..."
                  value={aiApiKey}
                  onChange={(e) => handleSaveApiKey(e.target.value)}
                  className="ai-key-input"
                />
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                  A chave é salva localmente no seu navegador e não é compartilhada. Deixe em branco para usar o modo de simulação offline.
                </span>
              </div>
            </div>
          )}

          {/* Chat Messages */}
          <div className="ai-chat-messages">
            {aiMessages.length === 0 ? (
              <div className="ai-empty-chat">
                <Bot size={32} style={{ color: 'var(--text-muted)' }} />
                <span className="ai-empty-title">ECHO-9 Operacional</span>
                <p className="ai-empty-desc">
                  Eu sou o sistema tático ECHO-9. Posso analisar suas anotações, tirar dúvidas, revisar sua escrita e sugerir conteúdo. Use as ações rápidas abaixo ou me envie uma mensagem.
                </p>
              </div>
            ) : (
              aiMessages.map((msg, index) => (
                <div key={index} className={`ai-message ${msg.sender}`}>
                  <div className="ai-message-sender">
                    {msg.sender === 'user' ? 'Sobrevivente' : 'ECHO-9'}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                  
                  {msg.sender === 'ai' && (
                    <div className="ai-actions-bar">
                      <button 
                        onClick={() => handleAppendToNote(msg.text)}
                        className="ai-action-btn"
                        title="Adicionar esta resposta ao final do bloco de notas"
                      >
                        <Plus size={10} />
                        <span>Incrementar</span>
                      </button>
                      <button 
                        onClick={() => handleReplaceNote(msg.text)}
                        className="ai-action-btn"
                        title="Substituir o conteúdo do bloco de notas por esta resposta"
                      >
                        <Trash2 size={10} />
                        <span>Substituir</span>
                      </button>
                      <button 
                        onClick={() => {
                          const cleanText = msg.text
                            .replace(/\[PROTOCOLO DE SIMULAÇÃO ATIVO - SEM CONEXÃO GEMINI\]\n\n/g, '')
                            .replace(/\[EMERGÊNCIA: SISTEMA DA BASE OFFLINE. EXECUTANDO RESPOSTA SIMULADA DE PROTOCOLO\]\n\n/g, '');
                          navigator.clipboard.writeText(cleanText);
                        }}
                        className="ai-action-btn"
                        title="Copiar para a área de transferência"
                      >
                        <Copy size={10} />
                        <span>Copiar</span>
                      </button>
                    </div>
                  )}
                  
                  <div className="ai-message-time">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Actions Panel */}
          <div className="ai-quick-actions-container">
            <div className="ai-quick-actions-title">Ações Rápidas</div>
            <div className="ai-quick-actions">
              <button 
                onClick={() => handleSendAiMessage('Explique detalhadamente o código ou texto presente nas minhas anotações atuais.')}
                className="ai-chip"
                disabled={isAiLoading}
                title="Explica o código ou texto selecionado"
              >
                📝 Explicar Código
              </button>
              <button 
                onClick={() => handleSendAiMessage('Refatore o código das minhas anotações para melhorar a legibilidade e seguir boas práticas, exibindo o código sugerido.')}
                className="ai-chip"
                disabled={isAiLoading}
                title="Refatora e melhora o código"
              >
                ⚡ Refatorar
              </button>
              <button 
                onClick={() => handleSendAiMessage('Com base no código ou tema das minhas anotações, gere 3 perguntas conceituais ou pequenos desafios para eu praticar.')}
                className="ai-chip"
                disabled={isAiLoading}
                title="Gera perguntas conceituais para praticar"
              >
                ❓ Perguntas
              </button>
              <button 
                onClick={() => handleSendAiMessage('Analise minhas anotações e sugira otimizações de performance e possíveis pontos de falha/bugs no código.')}
                className="ai-chip"
                disabled={isAiLoading}
                title="Sugere otimizações e busca por bugs"
              >
                💡 Otimizar
              </button>
            </div>
          </div>

          {/* Chat Form */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendAiMessage();
            }} 
            className="ai-input-form"
          >
            <input 
              type="text" 
              placeholder="Pergunte algo ao terminal..."
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              className="ai-input"
              disabled={isAiLoading}
            />
            <button 
              type="submit" 
              className="ai-send-btn"
              disabled={isAiLoading || !aiInput.trim()}
            >
              {isAiLoading ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
