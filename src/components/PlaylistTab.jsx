import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Trash, Plus, Disc, Music, Skull, Link2, X, RefreshCw, ExternalLink } from 'lucide-react';

// PKCE Helpers for Spotify authentication
const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, x => possible[x % possible.length]).join('');
};

const sha256 = async (plain) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
};

const base64urlencode = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const getSpotifyTrackId = (track) => {
  if (!track || !track.isSpotify) return '';
  if (track.id === 'spotify-demo1') return '20hJ2wfBh6si4zHXI5tB58';
  if (track.id === 'spotify-demo2') return '2TpxZ7JUBn3uw46aR7qd6V';
  if (track.id === 'spotify-demo3') return '7MXVkk9YM5d2v2Sg0B5t2S';
  if (track.id === 'spotify-demo4') return '598VNs5m1Bh5lu20g7tHi3';
  const parts = track.id.replace('spotify-', '').split('-');
  return parts[0];
};

export default function PlaylistTab({ audioState }) {
  const {
    playlist,
    setPlaylist,
    currentTrackIndex,
    setCurrentTrackIndex,
    isPlaying,
    setIsPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    audioRef,
    analyserRef,
    setupVisualizer,
    handlePlayPause,
    handleNext,
    handlePrev,
    handleVolumeChange,
    toggleMute
  } = audioState;

  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const activeTrack = playlist[currentTrackIndex] || playlist[0];

  // Spotify integration states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientId, setClientId] = useState(localStorage.getItem('spotify_client_id') || '');
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [spotifyUser, setSpotifyUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');

  // Draw visualizer loop
  const drawVisualizer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const canvasCtx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    
    const bufferLength = analyser ? analyser.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      if (!canvas || !canvasCtx) return;
      
      if (!isPlaying) {
        canvasCtx.fillStyle = '#0c0d12';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = 'rgba(29, 185, 84, 0.2)'; // Spotify green hint
        canvasCtx.beginPath();
        canvasCtx.moveTo(0, canvas.height / 2);
        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
        animationRef.current = requestAnimationFrame(draw);
        return;
      }
      
      animationRef.current = requestAnimationFrame(draw);
      
      if (activeTrack?.isSpotify) {
        // Generate simulated, organic lofi green waves when playing a Spotify track
        canvasCtx.fillStyle = '#0c0d12';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        
        const time = Date.now() * 0.005;
        const barWidth = (canvas.width / bufferLength) * 1.5;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
          const wave1 = Math.sin(i * 0.15 + time) * 15;
          const wave2 = Math.cos(i * 0.08 - time * 0.4) * 12;
          const noise = Math.sin(i * 0.5 + time * 2) * 5;
          const simulatedHeight = Math.max(4, 25 + wave1 + wave2 + noise + (i < 8 ? 12 : 0));
          
          const greenValue = Math.min(255, 130 + simulatedHeight * 1.6);
          canvasCtx.fillStyle = `rgb(29, ${greenValue}, 84)`;
          canvasCtx.fillRect(x, canvas.height - simulatedHeight, barWidth - 2, simulatedHeight);
          
          x += barWidth;
        }
        return;
      }
      
      if (analyser) {
        analyser.getByteFrequencyData(dataArray);
        canvasCtx.fillStyle = '#0c0d12';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / bufferLength) * 1.5;
        let barHeight;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
          barHeight = dataArray[i] / 2;
          const greenValue = Math.min(255, 120 + barHeight * 1.2);
          canvasCtx.fillStyle = `rgb(29, ${greenValue}, 84)`;
          canvasCtx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
          x += barWidth;
        }
      }
    };
    
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    draw();
  };

  // Visualizer trigger
  useEffect(() => {
    if (isPlaying) {
      drawVisualizer();
    } else {
      const canvas = canvasRef.current;
      if (canvas) {
        const canvasCtx = canvas.getContext('2d');
        if (canvasCtx) {
          canvasCtx.fillStyle = '#0c0d12';
          canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
          canvasCtx.lineWidth = 2;
          canvasCtx.strokeStyle = 'rgba(29, 185, 84, 0.2)';
          canvasCtx.beginPath();
          canvasCtx.moveTo(0, canvas.height / 2);
          canvasCtx.lineTo(canvas.width, canvas.height / 2);
          canvasCtx.stroke();
        }
      }
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
  }, [isPlaying, currentTrackIndex, analyserRef.current]);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Fetch Spotify data on mount or token change
  useEffect(() => {
    const token = localStorage.getItem('spotify_access_token');
    const expiry = localStorage.getItem('spotify_token_expires');
    
    // Check if token exists and is not expired
    if (token && (!expiry || Date.now() < parseInt(expiry))) {
      setIsSpotifyConnected(true);
      fetchSpotifyUserData(token);
    } else {
      // Clean up expired tokens
      if (token) handleDisconnectSpotify();
    }
  }, []);

  // Listen for the custom spotify_connected event dispatched by DashboardLayout after PKCE token exchange
  useEffect(() => {
    const handleConnectedEvent = () => {
      const token = localStorage.getItem('spotify_access_token');
      if (token) {
        setIsSpotifyConnected(true);
        fetchSpotifyUserData(token);
        setIsModalOpen(false); // Close the modal once connected
      }
    };
    window.addEventListener('spotify_connected', handleConnectedEvent);
    return () => window.removeEventListener('spotify_connected', handleConnectedEvent);
  }, []);

  const fetchSpotifyUserData = async (token) => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSpotifyUser({
          name: data.display_name,
          image: data.images?.[0]?.url || null,
          id: data.id
        });
        // Automatically sync tracks on successful connection
        syncSpotifyTracks(token);
      } else if (response.status === 401) {
        handleDisconnectSpotify();
      }
    } catch (err) {
      console.error('Error fetching Spotify user info:', err);
    }
  };

  const syncSpotifyTracks = async (token) => {
    setIsSyncing(true);
    setSyncError('');
    try {
      // Fetch user recently played tracks
      const response = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=15', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
          const spotifyTracks = data.items.map((item, idx) => {
            const track = item.track;
            return {
              id: `spotify-${track.id}-${idx}`,
              title: track.name,
              artist: track.artists.map(a => a.name).join(', '),
              url: track.preview_url || '/silenthill.wav', // fall back to silence or atmospheric theme if no 30s preview
              duration: track.preview_url ? 'Preview 30s' : 'Sem Preview (Estática)',
              spotifyUrl: track.external_urls.spotify,
              isSpotify: true
            };
          });

          // Prepend Spotify tracks to the current playlist (avoid duplicates)
          setPlaylist(prev => {
            const nonSpotifyTracks = prev.filter(t => !t.isSpotify && !t.id.startsWith('spotify-'));
            return [...spotifyTracks, ...nonSpotifyTracks];
          });
          
          // Select first track and notify
          setCurrentTrackIndex(0);
        }
      } else {
        const errorData = await response.json();
        setSyncError(errorData?.error?.message || 'Falha ao sincronizar músicas.');
      }
    } catch (err) {
      console.error('Spotify Sync Error:', err);
      setSyncError('Erro de conexão ao buscar músicas do Spotify.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleScrubberChange = (e) => {
    if (!audioRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickRatio = Math.max(0, Math.min(1, clickX / width));
    const newTime = clickRatio * duration;
    audioRef.current.currentTime = newTime;
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Local File Upload
  const handleFileUpload = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newTracks = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileUrl = URL.createObjectURL(file);
      newTracks.push({
        id: `upload-${Date.now()}-${i}`,
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: 'Upload Local',
        url: fileUrl,
        duration: 'Local'
      });
    }

    const oldLength = playlist.length;
    setPlaylist(prev => [...prev, ...newTracks]);
    
    if (newTracks.length > 0) {
      setCurrentTrackIndex(oldLength);
      setIsPlaying(true);
      setTimeout(() => {
        setupVisualizer();
      }, 200);
    }
  };

  // Track removal
  const handleRemoveTrack = (id, e) => {
    e.stopPropagation();
    
    const trackIdx = playlist.findIndex(t => t.id === id);
    if (trackIdx === -1) return;
    
    const newPlaylist = playlist.filter(t => t.id !== id);
    setPlaylist(newPlaylist);
    
    if (currentTrackIndex === trackIdx) {
      setCurrentTrackIndex(0);
      setIsPlaying(false);
    } else if (currentTrackIndex > trackIdx) {
      setCurrentTrackIndex(currentTrackIndex - 1);
    }
  };

  // Spotify Authentication Flow (PKCE)
  const handleConnectSpotify = async (e) => {
    e.preventDefault();
    if (!clientId.trim()) return;

    localStorage.setItem('spotify_client_id', clientId.trim());
    
    const verifier = generateRandomString(64);
    localStorage.setItem('spotify_code_verifier', verifier);
    
    const hashed = await sha256(verifier);
    const codeChallenge = base64urlencode(hashed);
    
    const redirectUri = window.location.origin + '/';
    const scope = 'user-read-currently-playing user-read-recently-played';
    
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${encodeURIComponent(clientId.trim())}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&code_challenge_method=S256&code_challenge=${codeChallenge}&scope=${encodeURIComponent(scope)}`;
    
    // Redirect user to Spotify login
    window.location.href = authUrl;
  };

  // Demo Connection
  const handleDemoConnect = () => {
    setIsSpotifyConnected(true);
    setSpotifyUser({
      name: 'caio barreto (Playlist: Novo)',
      image: 'https://i.scdn.co/image/ab6775700000ee851bc7248e404730de1e9b05a3',
      id: 'caiobarretovalle'
    });

    const demoTracks = [
      {
        id: 'spotify-7trj9vNyMfcw77KtLxzo8M-0',
        title: 'Sempre Volta',
        artist: 'Nick, lilgiela33',
        url: '/rotina.mp3',
        duration: 'Spotify Sync',
        spotifyUrl: 'https://open.spotify.com/track/7trj9vNyMfcw77KtLxzo8M',
        isSpotify: true
      },
      {
        id: 'spotify-21t1GPQTSTRLpQ1soSZSNb-1',
        title: 'P.F.A.',
        artist: 'Myd',
        url: '/vemevai.wav',
        duration: 'Spotify Sync',
        spotifyUrl: 'https://open.spotify.com/track/21t1GPQTSTRLpQ1soSZSNb',
        isSpotify: true
      },
      {
        id: 'spotify-1nZpe0B9lb4EJrWq8JK2Xp-2',
        title: 'Minha Droga',
        artist: 'zTokyo',
        url: '/c4.wav',
        duration: 'Spotify Sync',
        spotifyUrl: 'https://open.spotify.com/track/1nZpe0B9lb4EJrWq8JK2Xp',
        isSpotify: true
      },
      {
        id: 'spotify-1W6xna821g67vahHm6tP0x-3',
        title: 'Não Foda Minha Semana',
        artist: 'zTokyo, Lil Chuv',
        url: '/pills.wav',
        duration: 'Spotify Sync',
        spotifyUrl: 'https://open.spotify.com/track/1W6xna821g67vahHm6tP0x',
        isSpotify: true
      },
      {
        id: 'spotify-13zIMw63T7fsRisy8TxYto-4',
        title: 'Por Favor Se Vá',
        artist: 'lilgiela33',
        url: '/rotina.mp3',
        duration: 'Spotify Sync',
        spotifyUrl: 'https://open.spotify.com/track/13zIMw63T7fsRisy8TxYto',
        isSpotify: true
      },
      {
        id: 'spotify-0GHiPdmhMv6SHAwMF65Gk2-5',
        title: 'Que Merda!!!',
        artist: 'lilgiela33, zTokyo',
        url: '/vemevai.wav',
        duration: 'Spotify Sync',
        spotifyUrl: 'https://open.spotify.com/track/0GHiPdmhMv6SHAwMF65Gk2',
        isSpotify: true
      },
      {
        id: 'spotify-07p8s4hndVIeecLIZRxRwR-6',
        title: 'Peep, Cobain',
        artist: 'lilgiela33',
        url: '/c4.wav',
        duration: 'Spotify Sync',
        spotifyUrl: 'https://open.spotify.com/track/07p8s4hndVIeecLIZRxRwR',
        isSpotify: true
      },
      {
        id: 'spotify-1NtFTUkIrux7FbXOj5gt9F-7',
        title: 'Garoto Do Mal',
        artist: 'lilgiela33',
        url: '/pills.wav',
        duration: 'Spotify Sync',
        spotifyUrl: 'https://open.spotify.com/track/1NtFTUkIrux7FbXOj5gt9F',
        isSpotify: true
      },
      {
        id: 'spotify-5Pkj6F3UN5ZIXeWpsV6Ngy-8',
        title: 'Chorando Mais...',
        artist: 'lilgiela33',
        url: '/rotina.mp3',
        duration: 'Spotify Sync',
        spotifyUrl: 'https://open.spotify.com/track/5Pkj6F3UN5ZIXeWpsV6Ngy',
        isSpotify: true
      },
      {
        id: 'spotify-5NITKynujGpYbvIn3R7OqH-9',
        title: 'Go Go',
        artist: 'giela061, massacrey',
        url: '/vemevai.wav',
        duration: 'Spotify Sync',
        spotifyUrl: 'https://open.spotify.com/track/5NITKynujGpYbvIn3R7OqH',
        isSpotify: true
      },
      {
        id: 'spotify-3gZbT75j9LTGNVhr5eGdsD-10',
        title: 'No Fundo Cê Nem Liga',
        artist: 'DROPO',
        url: '/c4.wav',
        duration: 'Spotify Sync',
        spotifyUrl: 'https://open.spotify.com/track/3gZbT75j9LTGNVhr5eGdsD',
        isSpotify: true
      },
      {
        id: 'spotify-6IPGbolQwYYBd5ecZKmbwY-11',
        title: 'Tô "Diferente"',
        artist: 'lilgiela33',
        url: '/pills.wav',
        duration: 'Spotify Sync',
        spotifyUrl: 'https://open.spotify.com/track/6IPGbolQwYYBd5ecZKmbwY',
        isSpotify: true
      },
      {
        id: 'spotify-2YlDr4BwuzFshb7BHKSk3j-12',
        title: 'Eu N Sinto Falta de Ngm',
        artist: 'Myd',
        url: '/rotina.mp3',
        duration: 'Spotify Sync',
        spotifyUrl: 'https://open.spotify.com/track/2YlDr4BwuzFshb7BHKSk3j',
        isSpotify: true
      },
      {
        id: 'spotify-6u6ZyQppG0KUhoUZOGOFBV-13',
        title: 'Prefiro a Morte',
        artist: 'giela061, Sadzinnx',
        url: '/vemevai.wav',
        duration: 'Spotify Sync',
        spotifyUrl: 'https://open.spotify.com/track/6u6ZyQppG0KUhoUZOGOFBV',
        isSpotify: true
      },
      {
        id: 'spotify-6pfsmxb6NRP4XNTZZ9s4Xe-14',
        title: 'Cade Seu Pai? - Remastered',
        artist: 'lilberto33',
        url: '/c4.wav',
        duration: 'Spotify Sync',
        spotifyUrl: 'https://open.spotify.com/track/6pfsmxb6NRP4XNTZZ9s4Xe',
        isSpotify: true
      },
      {
        id: 'spotify-1aJVvkLB5i6cptjdtH9TyR-15',
        title: 'FARMA',
        artist: 'DROPO, STONED SUN',
        url: '/pills.wav',
        duration: 'Spotify Sync',
        spotifyUrl: 'https://open.spotify.com/track/1aJVvkLB5i6cptjdtH9TyR',
        isSpotify: true
      },
      {
        id: 'spotify-3mIz14S0awRRB6XyWaLu2m-16',
        title: 'Fundo do poço',
        artist: 'YOUNG JP 111',
        url: '/rotina.mp3',
        duration: 'Spotify Sync',
        spotifyUrl: 'https://open.spotify.com/track/3mIz14S0awRRB6XyWaLu2m',
        isSpotify: true
      },
      {
        id: 'spotify-36phzDplFcXThr5BezlJc4-17',
        title: 'Fumando Gás',
        artist: 'DROPO, zTokyo',
        url: '/vemevai.wav',
        duration: 'Spotify Sync',
        spotifyUrl: 'https://open.spotify.com/track/36phzDplFcXThr5BezlJc4',
        isSpotify: true
      },
      {
        id: 'spotify-0iQp0xNUANPYoOaPyBUObv-18',
        title: 'Câmera Lenta',
        artist: 'lilgiela33',
        url: '/c4.wav',
        duration: 'Spotify Sync',
        spotifyUrl: 'https://open.spotify.com/track/0iQp0xNUANPYoOaPyBUObv',
        isSpotify: true
      },
      {
        id: 'spotify-5XsDj33LACB2bgq3jNaiFy-19',
        title: 'Buracos de Cobras',
        artist: 'Nick',
        url: '/pills.wav',
        duration: 'Spotify Sync',
        spotifyUrl: 'https://open.spotify.com/track/5XsDj33LACB2bgq3jNaiFy',
        isSpotify: true
      },
      {
        id: 'spotify-4TIUZoHUpm3I2RqkaAtRq2-20',
        title: 'Aquafina',
        artist: 'zTokyo',
        url: '/rotina.mp3',
        duration: 'Spotify Sync',
        spotifyUrl: 'https://open.spotify.com/track/4TIUZoHUpm3I2RqkaAtRq2',
        isSpotify: true
      },
      {
        id: 'spotify-1YqSWCBYFRSGC4Rfi2rfge-21',
        title: 'Você (Only One)',
        artist: 'Nick, DROPO',
        url: '/vemevai.wav',
        duration: 'Spotify Sync',
        spotifyUrl: 'https://open.spotify.com/track/1YqSWCBYFRSGC4Rfi2rfge',
        isSpotify: true
      },
      {
        id: 'spotify-3P8ZUpoOx1nJAxscDsc8O4-22',
        title: 'Mesmo de Sempre',
        artist: 'Poison6, Nosred',
        url: '/c4.wav',
        duration: 'Spotify Sync',
        spotifyUrl: 'https://open.spotify.com/track/3P8ZUpoOx1nJAxscDsc8O4',
        isSpotify: true
      }
    ];

    setPlaylist(prev => {
      const nonSpotify = prev.filter(t => !t.isSpotify);
      return [...demoTracks, ...nonSpotify];
    });

    setCurrentTrackIndex(0);
    setIsModalOpen(false);
  };

  const handleDisconnectSpotify = () => {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_token_expires');
    setIsSpotifyConnected(false);
    setSpotifyUser(null);
    
    // Clean Spotify tracks out of the playlist
    setPlaylist(prev => prev.filter(t => !t.isSpotify));
    setCurrentTrackIndex(0);
  };

  const handleRefreshSync = () => {
    const token = localStorage.getItem('spotify_access_token');
    if (token) {
      syncSpotifyTracks(token);
    }
  };

  return (
    <div className="morte-root fade-in">
      <div className="morte-grid">
        {/* Player Panel */}
        <div className="music-player-card">
          <div className="vinyl-container">
            <div className={`vinyl-disc ${isPlaying ? 'playing' : ''}`} style={{ borderColor: activeTrack?.isSpotify ? 'var(--spotify-green, #1db954)' : 'var(--border-medium)' }}>
              <div className="vinyl-grooves"></div>
              <div className="vinyl-center" style={{ backgroundColor: activeTrack?.isSpotify ? '#1db954' : '#fff' }}>
                {activeTrack?.isSpotify ? <Music size={24} style={{ color: '#000' }} /> : <Skull size={24} style={{ color: '#000' }} />}
              </div>
            </div>
          </div>

          <div className="track-info">
            <h3 className="track-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {activeTrack?.isSpotify && <span style={{ color: '#1db954', fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid #1db954', padding: '1px 4px', borderRadius: '3px', textTransform: 'uppercase' }}>Spotify</span>}
              {activeTrack?.title}
            </h3>
            <span className="track-subtitle">{activeTrack?.artist}</span>
          </div>

          {activeTrack?.isSpotify ? (
            <>
              <div style={{ marginTop: '1.5rem', width: '100%', borderRadius: '12px', overflow: 'hidden', marginBottom: '1.5rem' }}>
                <iframe
                  src={`https://open.spotify.com/embed/track/${getSpotifyTrackId(activeTrack)}?utm_source=generator&theme=0`}
                  width="100%"
                  height="152"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  style={{ border: 'none' }}
                ></iframe>
              </div>
              <div style={{
                background: 'rgba(29, 185, 84, 0.05)',
                border: '1px solid rgba(29, 185, 84, 0.15)',
                borderRadius: '8px',
                padding: '1.25rem',
                marginTop: '1rem',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: '#1db954',
                lineHeight: '1.4'
              }}>
                Reprodutor Spotify Carregado.<br/>Use os botões e a barra de volume **dentro do próprio card verde do Spotify acima** para escutar e controlar a música real.
              </div>
            </>
          ) : (
            <>
              {/* Scrubber */}
              <div className="scrubber-container">
                <div className="scrubber-time-info">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration || 0)}</span>
                </div>
                <div className="scrubber-bar" onClick={handleScrubberChange}>
                  <div 
                    className="scrubber-fill" 
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`, backgroundColor: 'var(--color-primary)' }}
                  ></div>
                  <div 
                    className="scrubber-handle" 
                    style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="player-controls">
                <button className="btn-ctrl" onClick={handlePrev} title="Música Anterior">
                  <SkipBack size={18} />
                </button>
                
                <button 
                  className="btn-ctrl play-pause" 
                  onClick={handlePlayPause}
                  title={isPlaying ? "Pausar" : "Tocar"}
                  style={{ backgroundColor: '#fff', color: '#000' }}
                >
                  {isPlaying ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" style={{ marginLeft: '4px' }} />}
                </button>
                
                <button className="btn-ctrl" onClick={handleNext} title="Próxima Música">
                  <SkipForward size={18} />
                </button>
              </div>

              {/* Volume */}
              <div className="volume-controls">
                <button style={{ color: 'inherit', background: 'none', border: 'none', cursor: 'pointer' }} onClick={toggleMute} title={isMuted ? "Tirar do Mudo" : "Mutar"}>
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
                />
              </div>
            </>
          )}

          {/* Spotify Direct Link */}
          {activeTrack?.spotifyUrl && (
            <a 
              href={activeTrack.spotifyUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="spotify-link-out"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                color: '#1db954',
                marginTop: '1rem',
                textDecoration: 'none',
                fontFamily: 'var(--font-mono)'
              }}
            >
              <ExternalLink size={12} />
              Ouvir Completa no Spotify
            </a>
          )}
        </div>

        {/* Visualizer & Playlist controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Visualizer */}
          <div className="visualizer-card">
            <div className="visualizer-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 className="visualizer-title" style={{ margin: 0 }}>
                <Disc size={16} className={isPlaying ? 'spin' : ''} style={{ animation: 'spinSlow 3s linear infinite', animationPlayState: isPlaying ? 'running' : 'paused' }} />
                Análise de Sinal
              </h4>
              
              {/* Spotify Link Button */}
              {!isSpotifyConnected ? (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="spotify-connect-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#1db954',
                    color: '#000',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '0.4rem 0.9rem',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <Link2 size={12} />
                  Vincular Spotify
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={handleRefreshSync}
                    className="spotify-refresh-btn"
                    title="Sincronizar Músicas do Spotify"
                    disabled={isSyncing}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <RefreshCw size={14} className={isSyncing ? 'spin' : ''} />
                  </button>
                  <span style={{ fontSize: '0.75rem', color: '#1db954', fontWeight: 'bold' }}>
                    Conectado
                  </span>
                  <button 
                    onClick={handleDisconnectSpotify}
                    style={{
                      background: 'none',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'var(--text-muted)',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      fontSize: '0.65rem',
                      cursor: 'pointer'
                    }}
                  >
                    Sair
                  </button>
                </div>
              )}
            </div>

            <div className="visualizer-canvas-container" style={{ marginTop: '1rem' }}>
              <canvas 
                ref={canvasRef} 
                className="visualizer-canvas" 
                width="400" 
                height="120"
              />
            </div>
            
            {spotifyUser && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', padding: '6px 12px', background: 'rgba(29, 185, 84, 0.05)', border: '1px solid rgba(29, 185, 84, 0.15)', borderRadius: '6px' }}>
                {spotifyUser.image ? (
                  <img src={spotifyUser.image} alt={spotifyUser.name} style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                ) : (
                  <Music size={14} style={{ color: '#1db954' }} />
                )}
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Playlist integrada com a conta: <strong style={{ color: '#fff' }}>{spotifyUser.name}</strong>
                </span>
              </div>
            )}
            
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4', textAlign: 'left', margin: '8px 0 0' }}>
              Inicie a reprodução das músicas do Spotify para ver o equalizador gráfico em tempo real. Faixas importadas são sinalizadas com o selo verde.
            </p>
          </div>

          {/* Playlist Tracks List */}
          <div className="playlist-card">
            <div className="card-header">
              <h3 className="card-title">Sua Playlist Ativa</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {playlist.length} faixas
              </span>
            </div>

            <div className="playlist-items">
              {playlist.map((track, index) => {
                const isActive = index === currentTrackIndex;
                const isUploaded = track.id.startsWith('upload-');

                return (
                  <div
                    key={track.id}
                    className={`playlist-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentTrackIndex(index);
                      setIsPlaying(true);
                      setTimeout(() => {
                        setupVisualizer();
                      }, 200);
                    }}
                    style={{ borderLeft: track.isSpotify ? '3px solid #1db954' : 'none' }}
                  >
                    <span className="playlist-item-index">
                      {isActive && isPlaying ? <Music size={14} className="fade-in" style={{ color: track.isSpotify ? '#1db954' : 'var(--color-primary)' }} /> : index + 1}
                    </span>
                    <span className="playlist-item-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {track.title}
                      {track.isSpotify && <span style={{ color: '#1db954', fontSize: '0.6rem', padding: '0 3px', border: '1px solid rgba(29, 185, 84, 0.4)', borderRadius: '2px' }}>Spotify</span>}
                    </span>
                    <span className="playlist-item-duration">{track.duration}</span>
                    
                    {(isUploaded || track.isSpotify) && (
                      <button 
                        className="playlist-item-remove"
                        onClick={(e) => handleRemoveTrack(track.id, e)}
                        title="Remover da Playlist"
                      >
                        <Trash size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* File Upload Zone */}
            <label className="upload-zone">
              <input
                type="file"
                accept="audio/*"
                multiple
                onChange={handleFileUpload}
                className="hidden-file-input"
              />
              <Plus className="upload-icon" />
              <div className="upload-text">Adicionar Suas Músicas Locais</div>
              <div className="upload-subtext">Arraste ou clique para enviar arquivos de áudio (.mp3, .wav)</div>
            </label>
          </div>

        </div>
      </div>

      {/* Spotify Connection Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(9, 9, 11, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999,
          padding: '1rem'
        }} className="fade-in">
          <div style={{
            background: '#0e1017',
            border: '1px solid var(--border-medium)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '480px',
            padding: '2rem',
            position: 'relative',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }} className="scale-up">
            
            {/* Close */}
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
              <div style={{ width: '40px', height: '40px', background: '#1db954', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Music size={20} style={{ color: '#000' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Vincular com o Spotify</h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sincronize as músicas que você escuta no seu dia a dia.</p>
              </div>
            </div>

            {/* Quick Demo Option */}
            <div style={{
              background: 'rgba(29, 185, 84, 0.05)',
              border: '1px solid rgba(29, 185, 84, 0.2)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem',
              textAlign: 'left'
            }}>
              <h4 style={{ margin: '0 0 4px', fontSize: '0.85rem', color: '#1db954' }}>Carregar Playlist de Caio (Recomendado)</h4>
              <p style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Vincule instantaneamente a conta simulada de <strong>caio barreto</strong> carregando a playlist <strong>"Novo"</strong> (contendo 23 faixas de Lil Giela, zTokyo e outros) para ver o funcionamento completo.
              </p>
              <button 
                onClick={handleDemoConnect}
                className="btn-start"
                style={{
                  width: '100%',
                  backgroundColor: '#1db954',
                  color: '#000',
                  fontWeight: 'bold',
                  border: 'none',
                  fontSize: '0.8rem',
                  padding: '0.6rem'
                }}
              >
                Vincular Playlist "Novo" (Demo)
              </button>
            </div>

            {/* Real Connection API Option */}
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem', textAlign: 'left' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#fff' }}>Conectar via API Oficial do Spotify</h4>
              <p style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Para trazer suas músicas reais, registre um App no site <a href="https://developer.spotify.com" target="_blank" rel="noreferrer" style={{ color: '#1db954', textDecoration: 'underline' }}>Spotify Developers</a>, configure a <strong>Redirect URI</strong> como <code>{window.location.origin}/</code> e insira o seu <strong>Client ID</strong> abaixo:
              </p>

              <form onSubmit={handleConnectSpotify}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>SPOTIFY CLIENT ID</label>
                  <input 
                    type="text" 
                    placeholder="Digite seu Client ID da API..."
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#000',
                      border: '1px solid var(--border-medium)',
                      borderRadius: '6px',
                      padding: '0.6rem 0.8rem',
                      color: '#fff',
                      fontSize: '0.85rem',
                      outline: 'none',
                      fontFamily: 'monospace'
                    }}
                    required
                  />
                </div>

                <button 
                  type="submit"
                  className="btn-start"
                  style={{
                    width: '100%',
                    background: '#000',
                    border: '1px solid var(--border-medium)',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    padding: '0.6rem',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Link2 size={14} />
                  Autenticar no Spotify
                </button>
              </form>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
