import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Notebook, Skull, CalendarDays, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Music } from 'lucide-react';
import AulasTab from './AulasTab';
import AnotacoesTab from './AnotacoesTab';
import PlaylistTab from './PlaylistTab';

export default function DashboardLayout() {
  const [activeTab, setActiveTab] = useState('aulas'); // 'aulas', 'anotacoes', 'playlist'
  const [currentDateString, setCurrentDateString] = useState('');
  
  // Lifted Audio Playlist State
  const [playlist, setPlaylist] = useState([
    {
      id: 'default',
      title: 'Silent Hill Theme',
      artist: 'Akira Yamaoka',
      url: '/silenthill.wav',
      duration: 'Estática'
    },
    {
      id: 'hellno',
      title: 'Hell no',
      artist: 'L1nn',
      url: '/hellno.wav',
      duration: 'Estática'
    },
    {
      id: 'c4',
      title: 'C4',
      artist: 'Mental Instability',
      url: '/c4.wav',
      duration: 'Estática'
    },
    {
      id: 'pills',
      title: 'Pills',
      artist: 'Mental Instability',
      url: '/pills.wav',
      duration: 'Estática'
    },
    {
      id: 'rotina',
      title: 'Rotina',
      artist: 'Mental Instability',
      url: '/rotina.mp3',
      duration: 'Estática'
    },
    {
      id: 'vemevai',
      title: 'Vem e Vai',
      artist: 'Mental Instability',
      url: '/vemevai.wav',
      duration: 'Estática'
    }
  ]);

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);

  const activeTrack = playlist[currentTrackIndex] || playlist[0];

  // Sync date
  useEffect(() => {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = today.toLocaleDateString('pt-BR', options);
    setCurrentDateString(dateStr.charAt(0).toUpperCase() + dateStr.slice(1));
  }, []);

  // Parse Spotify login redirect (either hash or search code query param)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      const clientId = localStorage.getItem('spotify_client_id');
      const codeVerifier = localStorage.getItem('spotify_code_verifier');
      if (clientId && codeVerifier) {
        exchangeSpotifyCodeForToken(code, clientId, codeVerifier);
      }
    }

    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      if (accessToken) {
        localStorage.setItem('spotify_access_token', accessToken);
        const expiresIn = params.get('expires_in');
        if (expiresIn) {
          const expireTime = Date.now() + parseInt(expiresIn) * 1000;
          localStorage.setItem('spotify_token_expires', expireTime.toString());
        }
        window.history.pushState("", document.title, window.location.pathname);
        setActiveTab('playlist');
      }
    }
  }, []);

  const exchangeSpotifyCodeForToken = async (code, clientId, codeVerifier) => {
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: window.location.origin + '/',
          code_verifier: codeVerifier,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('spotify_access_token', data.access_token);
        if (data.expires_in) {
          const expireTime = Date.now() + parseInt(data.expires_in) * 1000;
          localStorage.setItem('spotify_token_expires', expireTime.toString());
        }
        localStorage.removeItem('spotify_code_verifier');
        window.history.pushState("", document.title, window.location.pathname);
        setActiveTab('playlist');
        // Notify playlist tab to load Spotify tracks
        window.dispatchEvent(new Event('spotify_connected'));
      } else {
        console.error('Failed to exchange Spotify authorization code', await response.json());
      }
    } catch (err) {
      console.error('Error during Spotify token exchange', err);
    }
  };

  // Handle active track change
  useEffect(() => {
    if (audioRef.current) {
      if (activeTrack?.isSpotify) {
        audioRef.current.pause();
        return;
      }
      audioRef.current.src = activeTrack.url;
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play().catch(err => {
          console.log("Play failed", err);
          setIsPlaying(false);
        });
      }
    }
  }, [currentTrackIndex]);

  const setupVisualizer = () => {
    if (!audioRef.current) return;
    
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
    }
    
    const ctx = audioContextRef.current;
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    if (!analyserRef.current) {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
    }
    
    const analyser = analyserRef.current;
    
    if (!sourceRef.current) {
      try {
        const source = ctx.createMediaElementSource(audioRef.current);
        source.connect(analyser);
        analyser.connect(ctx.destination);
        sourceRef.current = source;
      } catch (err) {
        console.warn("MediaElementSource connection failed", err);
      }
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setupVisualizer();
      if (activeTrack?.isSpotify) {
        setIsPlaying(true);
      } else {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(err => console.log(err));
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    handleNext();
  };

  const handleNext = () => {
    const nextIdx = (currentTrackIndex + 1) % playlist.length;
    setCurrentTrackIndex(nextIdx);
  };

  const handlePrev = () => {
    const prevIdx = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    setCurrentTrackIndex(prevIdx);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
    if (val > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const targetMute = !isMuted;
      setIsMuted(targetMute);
      audioRef.current.muted = targetMute;
    }
  };

  // Pack audio state to share down
  const audioState = {
    playlist,
    setPlaylist,
    currentTrackIndex,
    setCurrentTrackIndex,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    audioRef,
    analyserRef,
    setupVisualizer,
    handlePlayPause,
    handleNext,
    handlePrev,
    handleVolumeChange,
    toggleMute
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'aulas': return 'Dashboard de Aulas';
      case 'anotacoes': return 'Anotações Diárias';
      case 'playlist': return 'Playlist Personalizada';
      default: return 'Painel Principal';
    }
  };

  const getTabSubtitle = () => {
    switch (activeTab) {
      case 'aulas': return 'Gerencie suas aulas assistidas e acompanhe seu progresso de aprendizado.';
      case 'anotacoes': return 'Registre suas descobertas, pensamentos e planos diários.';
      case 'playlist': return 'Gerencie suas músicas preferidas e sincronize com seu Spotify.';
      default: return '';
    }
  };

  return (
    <div className="dashboard-root fade-in">
      {/* Global Audio Element */}
      <audio
        ref={audioRef}
        src={activeTrack ? activeTrack.url : ''}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
        crossOrigin="anonymous"
      />

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo-icon">
            <Skull size={20} />
          </div>
          <h2 className="sidebar-title haunted-flicker" style={{ fontSize: '0.85rem' }}>Inconsistência <span>Mental</span></h2>
        </div>

        <nav className="sidebar-menu">
          <button 
            className={`menu-item ${activeTab === 'aulas' ? 'active' : ''}`}
            onClick={() => setActiveTab('aulas')}
          >
            <BookOpen />
            <span>Aulas</span>
          </button>

          <button 
            className={`menu-item ${activeTab === 'anotacoes' ? 'active' : ''}`}
            onClick={() => setActiveTab('anotacoes')}
          >
            <Notebook />
            <span>Anotações</span>
          </button>

          <button 
            className={`menu-item ${activeTab === 'playlist' ? 'active' : ''}`}
            onClick={() => setActiveTab('playlist')}
          >
            <Music />
            <span>Playlist</span>
          </button>
        </nav>

        {/* Sidebar Footer GitHub Bubble Button */}
        <div className="sidebar-footer github-footer">
          <a
            href="https://github.com/caiobcmv"
            target="_blank"
            rel="noopener noreferrer"
            className="github-bubble-btn"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <div className="balloon-tooltip">GitHub caiobcmv</div>
          </a>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="main-content" style={{ position: 'relative' }}>
        <header className="content-header">
          <div className="header-title-area">
            <h2 className="haunted-flicker">{getTabTitle()}</h2>
            <p>{getTabSubtitle()}</p>
          </div>
          
          <div className="header-date">
            <CalendarDays size={14} style={{ color: 'var(--color-primary)' }} />
            <span>{currentDateString}</span>
          </div>
        </header>

        {/* Dynamic Tab Body */}
        <div className={`tab-container ${activeTab !== 'playlist' ? 'has-player' : ''}`}>
          <div style={{ display: activeTab === 'aulas' ? 'block' : 'none' }}>
            <AulasTab />
          </div>
          <div style={{ display: activeTab === 'anotacoes' ? 'block' : 'none' }}>
            <AnotacoesTab />
          </div>
          <div style={{ display: activeTab === 'playlist' ? 'block' : 'none' }}>
            <PlaylistTab audioState={audioState} />
          </div>
        </div>

        {/* Bottom Persistent Mini-Player Bar */}
        {activeTab !== 'playlist' && (
          <div className="mini-player-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '180px', maxWidth: '260px' }}>
              <Skull 
                size={16} 
                className={isPlaying ? 'spin' : ''} 
                style={{ 
                  animation: 'spinSlow 6s linear infinite', 
                  animationPlayState: isPlaying ? 'running' : 'paused', 
                  color: '#fff', 
                  flexShrink: 0 
                }} 
              />
              <div style={{ overflow: 'hidden', textAlign: 'left' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeTrack ? activeTrack.title : 'Nenhuma faixa'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {activeTrack ? activeTrack.artist : ''}
                </div>
              </div>
            </div>

            {/* Playback controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button onClick={handlePrev} className="btn-ctrl-mini" style={{ color: 'var(--text-muted)' }} title="Anterior">
                <SkipBack size={16} />
              </button>
              <button 
                onClick={handlePlayPause} 
                className="btn-ctrl-mini-play" 
                style={{ 
                  background: '#fff', 
                  color: '#000', 
                  borderRadius: '50%', 
                  width: '32px', 
                  height: '32px', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center' 
                }}
                title={isPlaying ? "Pausar" : "Tocar"}
              >
                {isPlaying ? <Pause size={14} fill="black" /> : <Play size={14} fill="black" style={{ marginLeft: '2px' }} />}
              </button>
              <button onClick={handleNext} className="btn-ctrl-mini" style={{ color: 'var(--text-muted)' }} title="Próxima">
                <SkipForward size={16} />
              </button>
            </div>

            {/* Volume controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
              <button onClick={toggleMute} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} title={isMuted ? "Desmutar" : "Mutar"}>
                {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="volume-slider"
                style={{ width: '80px', cursor: 'pointer' }}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
