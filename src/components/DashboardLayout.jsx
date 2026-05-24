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
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.log(err));
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

        {/* Sidebar Footer User Info */}
        <div className="sidebar-footer">
          <div className="user-avatar">
            U
          </div>
          <div className="user-info">
            <span className="user-name">Recruta #448</span>
            <span className="user-role">Investigador Nível 1</span>
          </div>
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
