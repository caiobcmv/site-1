import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, Circle, Clock, BookOpen, AlertCircle } from 'lucide-react';

const MOCK_AULAS = [
  {
    id: 1,
    title: 'Aula 01: Primeiros Passos com React Native',
    duration: '17:51',
    seconds: 1071,
    description: 'Introdução ao desenvolvimento mobile híbrido com React Native, preparação do ambiente e conceitos fundamentais do framework.',
    videoUrl: 'https://www.youtube.com/embed/Y8tP1jbRYHY',
    tag: 'MÓDULO 1: INTRODUÇÃO'
  },
  {
    id: 2,
    title: 'Aula 02: Principais Componentes (Parte 1)',
    duration: '14:29',
    seconds: 869,
    description: 'Estudo dos componentes fundamentais do React Native para renderização de telas, botões e imagens no ecossistema mobile.',
    videoUrl: 'https://www.youtube.com/embed/_N6-kScr-Ig',
    tag: 'MÓDULO 2: COMPONENTES'
  },
  {
    id: 3,
    title: 'Aula 03: Principais Componentes (Parte 2)',
    duration: '15:16',
    seconds: 916,
    description: 'Continuação da análise de componentes estruturais, entradas de texto (TextInput) e elementos interativos do React Native.',
    videoUrl: 'https://www.youtube.com/embed/u_qccnftxXQ',
    tag: 'MÓDULO 2: COMPONENTES'
  },
  {
    id: 4,
    title: 'Aula 04: Principais Componentes (Parte 3)',
    duration: '19:00',
    seconds: 1140,
    description: 'Finalização do módulo de componentes nativos essenciais e como trabalhar com layouts dinâmicos baseados em Flexbox.',
    videoUrl: 'https://www.youtube.com/embed/8X63GfvxbE8',
    tag: 'MÓDULO 2: COMPONENTES'
  },
  {
    id: 5,
    title: 'Aula 05: Design do App OneBitHealth (Parte 1)',
    duration: '12:05',
    seconds: 725,
    description: 'Início da criação prática de um aplicativo de saúde, focando em estilização, estruturação de diretórios e boas práticas de design.',
    videoUrl: 'https://www.youtube.com/embed/JusFvRHWDyU',
    tag: 'MÓDULO 3: DESIGN PRÁTICO'
  },
  {
    id: 6,
    title: 'Aula 06: Design do App OneBitHealth (Parte 2)',
    duration: '15:19',
    seconds: 919,
    description: 'Ajustando detalhes visuais, fontes customizadas e layouts responsivos para múltiplos dispositivos no aplicativo de saúde.',
    videoUrl: 'https://www.youtube.com/embed/BCulqg8qUdU',
    tag: 'MÓDULO 3: DESIGN PRÁTICO'
  },
  {
    id: 7,
    title: 'Aula 07: Design do App OneBitHealth (Parte 3)',
    duration: '10:05',
    seconds: 605,
    description: 'Fechamento do layout do OneBitHealth com animações básicas e interações de toque interligadas.',
    videoUrl: 'https://www.youtube.com/embed/uLoMoPC6Ics',
    tag: 'MÓDULO 3: DESIGN PRÁTICO'
  },
  {
    id: 8,
    title: 'Aula 08: Conhecendo sobre APIs (Parte 1)',
    duration: '17:51',
    seconds: 1071,
    description: 'Entenda o conceito de APIs no desenvolvimento mobile e como consumir recursos externos no React Native.',
    videoUrl: 'https://www.youtube.com/embed/wl0h3fMaIWc',
    tag: 'MÓDULO 4: APIS & REDES'
  },
  {
    id: 9,
    title: 'Aula 09: Conhecendo sobre APIs (Parte 2)',
    duration: '14:38',
    seconds: 878,
    description: 'Métodos HTTP no React Native: como enviar, editar e excluir dados remotamente usando o cliente Axios.',
    videoUrl: 'https://www.youtube.com/embed/5dzD1ZqJhi4',
    tag: 'MÓDULO 4: APIS & REDES'
  },
  {
    id: 10,
    title: 'Aula 10: Conhecendo sobre APIs (Parte 3)',
    duration: '13:37',
    seconds: 817,
    description: 'Tratamento de erros assíncronos, feedbacks visuais de carregamento (ActivityIndicator) e otimização de rede.',
    videoUrl: 'https://www.youtube.com/embed/yW8lUxW6NDU',
    tag: 'MÓDULO 4: APIS & REDES'
  },
  {
    id: 11,
    title: 'Aula 11: Listas no React Native (Parte 1)',
    duration: '16:19',
    seconds: 979,
    description: 'Aprenda sobre listas eficientes no desenvolvimento mobile: introdução à ScrollView e ListView antigas.',
    videoUrl: 'https://www.youtube.com/embed/jU8witA1HgI',
    tag: 'MÓDULO 5: LISTAS AVANÇADAS'
  },
  {
    id: 12,
    title: 'Aula 12: Listas no React Native (Parte 2)',
    duration: '16:49',
    seconds: 1009,
    description: 'Estudo aprofundado do FlatList para renderização de dados volumosos em listas móveis de alto desempenho.',
    videoUrl: 'https://www.youtube.com/embed/-xdLAgm_yts',
    tag: 'MÓDULO 5: LISTAS AVANÇADAS'
  },
  {
    id: 13,
    title: 'Aula 13: Listas no React Native (Parte 3)',
    duration: '8:56',
    seconds: 536,
    description: 'Uso do SectionList para renderizar listas divididas em tópicos ou cabeçalhos ordenados de forma otimizada.',
    videoUrl: 'https://www.youtube.com/embed/LD5VD-4d9-o',
    tag: 'MÓDULO 5: LISTAS AVANÇADAS'
  },
  {
    id: 14,
    title: 'Aula 14: Trabalhando com Câmera (Parte 1)',
    duration: '14:16',
    seconds: 856,
    description: 'Como acessar recursos nativos do celular: solicitando permissões de câmera do dispositivo Expo.',
    videoUrl: 'https://www.youtube.com/embed/99diO-41iWU',
    tag: 'MÓDULO 6: RECURSOS NATIVOS'
  },
  {
    id: 15,
    title: 'Aula 15: Trabalhando com Câmera (Parte 2)',
    duration: '15:56',
    seconds: 956,
    description: 'Capturando imagens e lidando com a galeria de fotos local do usuário direto pelo aplicativo mobile.',
    videoUrl: 'https://www.youtube.com/embed/GpMBkYcGlyg',
    tag: 'MÓDULO 6: RECURSOS NATIVOS'
  },
  {
    id: 16,
    title: 'Aula 16: Trabalhando com Câmera (Parte 3)',
    duration: '13:42',
    seconds: 822,
    description: 'Ajustes finos no manuseio de câmera (flash, zoom e espelhamento) e finalização do módulo nativo.',
    videoUrl: 'https://www.youtube.com/embed/-OpdQI_eFEc',
    tag: 'MÓDULO 6: RECURSOS NATIVOS'
  },
  {
    id: 17,
    title: 'Aula 17: Navegação Mobile (Parte 1)',
    duration: '17:52',
    seconds: 1072,
    description: 'Primeiros passos em roteamento mobile: instalando e configurando o StackNavigator no React Native.',
    videoUrl: 'https://www.youtube.com/embed/O49tGxZBvNw',
    tag: 'MÓDULO 7: NAVEGAÇÃO'
  },
  {
    id: 18,
    title: 'Aula 18: Navegação Mobile (Parte 2)',
    duration: '17:39',
    seconds: 1059,
    description: 'Configuração do TabNavigator para criar painéis de navegação inferior confortáveis no celular.',
    videoUrl: 'https://www.youtube.com/embed/RGp5xdidde8',
    tag: 'MÓDULO 7: NAVEGAÇÃO'
  },
  {
    id: 19,
    title: 'Aula 19: Navegação Mobile (Parte 3)',
    duration: '12:40',
    seconds: 760,
    description: 'Explorando DrawerNavigator para criar menus hambúrguer laterais avançados em dispositivos móveis.',
    videoUrl: 'https://www.youtube.com/embed/ah25k0Ib7vw',
    tag: 'MÓDULO 7: NAVEGAÇÃO'
  },
  {
    id: 20,
    title: 'Aula 20: Projeto Final: OneBitCoin (Parte 1)',
    duration: '19:41',
    seconds: 1181,
    description: 'Iniciando o grande projeto de cotação de bitcoin: arquitetura, dependências e protótipo visual base.',
    videoUrl: 'https://www.youtube.com/embed/jRkYvGK5GVQ',
    tag: 'MÓDULO 8: PROJETO FINAL'
  },
  {
    id: 21,
    title: 'Aula 21: Projeto Final: OneBitCoin (Parte 2)',
    duration: '19:08',
    seconds: 1148,
    description: 'Integração do OneBitCoin com APIs de finanças em tempo real e estruturação do banco de dados local.',
    videoUrl: 'https://www.youtube.com/embed/_sVZPezr5gs',
    tag: 'MÓDULO 8: PROJETO FINAL'
  },
  {
    id: 22,
    title: 'Aula 22: Projeto Final: OneBitCoin (Parte 3)',
    duration: '15:11',
    seconds: 911,
    description: 'Estilização completa da página principal e componentes de exibição de cotação diária.',
    videoUrl: 'https://www.youtube.com/embed/eIqtaM3J0ZQ',
    tag: 'MÓDULO 8: PROJETO FINAL'
  },
  {
    id: 23,
    title: 'Aula 23: Projeto Final: OneBitCoin (Parte 4)',
    duration: '11:17',
    seconds: 677,
    description: 'Implementando a lista histórica de cotações com rolagem otimizada (FlatList) no aplicativo.',
    videoUrl: 'https://www.youtube.com/embed/-b5FREKBHXg',
    tag: 'MÓDULO 8: PROJETO FINAL'
  },
  {
    id: 24,
    title: 'Aula 24: Projeto Final: OneBitCoin (Parte 5)',
    duration: '19:40',
    seconds: 1180,
    description: 'Desenvolvimento e design do gráfico dinâmico de oscilação do Bitcoin em diferentes períodos (7D, 15D, 30D).',
    videoUrl: 'https://www.youtube.com/embed/qIa5eE0Cba8',
    tag: 'MÓDULO 8: PROJETO FINAL'
  },
  {
    id: 25,
    title: 'Aula 25: Projeto Final: OneBitCoin (Parte 6)',
    duration: '22:48',
    seconds: 1368,
    description: 'Aprimoramento da performance do gráfico e redução no tempo de requisição das cotações nas APIs.',
    videoUrl: 'https://www.youtube.com/embed/W-NVPWcokx4',
    tag: 'MÓDULO 8: PROJETO FINAL'
  },
  {
    id: 26,
    title: 'Aula 26: Projeto Final: OneBitCoin (Parte 7)',
    duration: '14:21',
    seconds: 861,
    description: 'Ajustando animações de carregamento e polindo a interface para melhor experiência do usuário (UX).',
    videoUrl: 'https://www.youtube.com/embed/c9Z6lqHh6r0',
    tag: 'MÓDULO 8: PROJETO FINAL'
  },
  {
    id: 27,
    title: 'Aula 27: Projeto Final: OneBitCoin (Parte 8)',
    duration: '12:57',
    seconds: 777,
    description: 'Prevenção de crashes com offline caching e testes fundamentais de usabilidade móvel.',
    videoUrl: 'https://www.youtube.com/embed/Naz-zTGlNps',
    tag: 'MÓDULO 8: PROJETO FINAL'
  },
  {
    id: 28,
    title: 'Aula 28: Projeto Final: OneBitCoin (Conclusão)',
    duration: '19:39',
    seconds: 1179,
    description: 'Finalização do curso de React Native, dicas de deploy no Google Play / App Store e próximos passos na carreira.',
    videoUrl: 'https://www.youtube.com/embed/2xTe-Z-WbR0',
    tag: 'MÓDULO 8: PROJETO FINAL'
  }
];

export default function AulasTab() {
  const [currentAula, setCurrentAula] = useState(MOCK_AULAS[0]);
  const [completedAulas, setCompletedAulas] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);

  // Load completed classes from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('completed_aulas');
    if (saved) {
      try {
        setCompletedAulas(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Save completed classes to localStorage
  const toggleComplete = (id, e) => {
    e.stopPropagation(); // Avoid selecting the class for playing when checking completion
    let updated;
    if (completedAulas.includes(id)) {
      updated = completedAulas.filter(item => item !== id);
    } else {
      updated = [...completedAulas, id];
    }
    setCompletedAulas(updated);
    localStorage.setItem('completed_aulas', JSON.stringify(updated));
  };

  const selectAula = (aula) => {
    setCurrentAula(aula);
    setIsPlaying(true);
  };

  // Progress metrics
  const completedCount = completedAulas.length;
  const totalCount = MOCK_AULAS.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Calculate circular progress dashoffset
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="lessons-grid scale-up">
      {/* Active Player Card */}
      <div className="player-card">
        <div className="player-wrapper">
          {isPlaying ? (
            currentAula.videoUrl.includes('youtube.com') || currentAula.videoUrl.includes('youtu.be') ? (
              <iframe
                key={currentAula.id}
                src={currentAula.videoUrl}
                className="player-video"
                title={currentAula.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <video
                key={currentAula.id}
                src={currentAula.videoUrl}
                className="player-video"
                controls
                autoPlay
                playsInline
              />
            )
          ) : (
            <div className="player-placeholder">
              <div className="player-placeholder-icon">
                <BookOpen size={32} />
              </div>
              <h3 className="player-placeholder-title">Nenhuma aula em reprodução</h3>
              <p style={{ maxWidth: '400px', fontSize: '0.9rem' }}>
                Selecione uma aula na lista lateral para iniciar a transmissão de vídeo interativa.
              </p>
              <button 
                className="btn-start" 
                style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem', marginTop: '10px' }}
                onClick={() => selectAula(currentAula)}
              >
                Assistir Primeira Aula
              </button>
            </div>
          )}
        </div>
        
        <div className="player-info">
          <span className="player-tag">{currentAula.tag}</span>
          <h3 className="player-title">{currentAula.title}</h3>
          <p className="player-desc">{currentAula.description}</p>
        </div>
      </div>

      {/* Sidebar List and Progress info */}
      <div className="lessons-sidebar">
        {/* Progress Stats Card */}
        <div className="stats-card">
          <div className="stats-progress-ring">
            <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="40"
                cy="40"
                r={radius}
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="6"
              />
              <circle
                cx="40"
                cy="40"
                r={radius}
                fill="transparent"
                stroke="var(--color-blue)"
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.4s ease-out' }}
              />
            </svg>
            <span className="stats-progress-text">{progressPercent}%</span>
          </div>
          
          <div className="stats-info">
            <span className="stats-label">Progresso do Curso</span>
            <div className="stats-value">{completedCount} / {totalCount} Concluídas</div>
            <div className="stats-bar-outer">
              <div className="stats-bar-inner" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
        </div>

        {/* Lessons List Card */}
        <div className="lessons-list-card">
          <div className="card-header">
            <h3 className="card-title">Aulas Disponíveis</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {totalCount} lições
            </span>
          </div>
          
          <div className="lessons-list-items">
            {MOCK_AULAS.map((aula) => {
              const isActive = currentAula.id === aula.id;
              const isCompleted = completedAulas.includes(aula.id);
              
              return (
                <div 
                  key={aula.id}
                  className={`lesson-item ${isActive ? 'active' : ''}`}
                  onClick={() => selectAula(aula)}
                  style={{ cursor: 'pointer' }}
                >
                  <button 
                    className={`lesson-checkbox ${isCompleted ? 'checked' : ''}`}
                    onClick={(e) => toggleComplete(aula.id, e)}
                    title={isCompleted ? "Marcar como não assistida" : "Marcar como assistida"}
                  >
                    {isCompleted ? <CheckCircle size={20} /> : <Circle size={20} />}
                  </button>
                  
                  <div className="lesson-item-info">
                    <h4 className="lesson-item-title">{aula.title}</h4>
                    <div className="lesson-item-meta">
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {aula.duration}
                      </span>
                      <span style={{ color: isActive ? 'var(--color-blue)' : 'var(--text-muted)' }}>
                        {aula.tag.split(':')[0]}
                      </span>
                    </div>
                  </div>
                  
                  <button className="lesson-play-btn">
                    <Play size={14} fill={isActive ? "white" : "none"} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Help Tip */}
        <div style={{ display: 'flex', gap: '8px', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          <AlertCircle size={18} style={{ color: 'var(--color-blue)', flexShrink: 0 }} />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'left', lineHeight: '1.4' }}>
            Dica: Ao marcar uma aula como concluída, seu progresso é salvo no navegador automaticamente. Assista a todas para liberar o certificado fictício de sobrevivência!
          </p>
        </div>
      </div>
    </div>
  );
}
