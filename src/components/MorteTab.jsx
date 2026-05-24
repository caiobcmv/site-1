import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Trash, Plus, Disc, Music, Skull } from 'lucide-react';

export default function MorteTab({ audioState }) {
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

  // Draw visualizer loop
  const drawVisualizer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const canvasCtx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    if (!canvasCtx || !analyser) return;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      if (!isPlaying) {
        // Flat line animation when paused
        if (canvas) {
          canvasCtx.fillStyle = '#0c0d12';
          canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
          canvasCtx.lineWidth = 2;
          canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          canvasCtx.beginPath();
          canvasCtx.moveTo(0, canvas.height / 2);
          canvasCtx.lineTo(canvas.width, canvas.height / 2);
          canvasCtx.stroke();
        }
        animationRef.current = requestAnimationFrame(draw);
        return;
      }
      
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      
      canvasCtx.fillStyle = '#0c0d12'; // Clear canvas
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 1.5;
      let barHeight;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        
        // Monochrome/grayscale for visualizer
        const gray = Math.min(255, 60 + barHeight * 1.5);
        canvasCtx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
        
        x += barWidth;
      }
    };
    
    // Cancel previous frame just in case
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    draw();
  };

  // Trigger visualizer loop when playing states changes
  useEffect(() => {
    if (isPlaying && analyserRef.current) {
      drawVisualizer();
    } else {
      // Draw flat line when paused
      const canvas = canvasRef.current;
      if (canvas) {
        const canvasCtx = canvas.getContext('2d');
        if (canvasCtx) {
          canvasCtx.fillStyle = '#0c0d12';
          canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
          canvasCtx.lineWidth = 2;
          canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          canvasCtx.beginPath();
          canvasCtx.moveTo(0, canvas.height / 2);
          canvasCtx.lineTo(canvas.width, canvas.height / 2);
          canvasCtx.stroke();
        }
      }
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
  }, [isPlaying, currentTrackIndex, analyserRef.current]);

  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const handleScrubberChange = (e) => {
    if (!audioRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickRatio = Math.max(0, Math.min(1, clickX / width));
    const newTime = clickRatio * duration;
    
    audioRef.current.currentTime = newTime;
  };

  // Format seconds to MM:SS
  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Handle Drag & Drop / File Input uploads
  const handleFileUpload = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newTracks = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Create local URL
      const fileUrl = URL.createObjectURL(file);
      
      newTracks.push({
        id: `upload-${Date.now()}-${i}`,
        title: file.name.replace(/\.[^/.]+$/, ""), // Strip file extension
        artist: 'Upload Local',
        url: fileUrl,
        duration: 'Local'
      });
    }

    const oldLength = playlist.length;
    setPlaylist(prev => [...prev, ...newTracks]);
    
    // Automatically select the first uploaded track and play it
    if (newTracks.length > 0) {
      setCurrentTrackIndex(oldLength);
      setIsPlaying(true);
      setTimeout(() => {
        setupVisualizer();
      }, 200);
    }
  };

  // Remove track from playlist
  const handleRemoveTrack = (id, e) => {
    e.stopPropagation();
    if (!id.startsWith('upload-')) return; // Cannot remove default tracks
    
    const trackIdx = playlist.findIndex(t => t.id === id);
    if (trackIdx === -1) return;
    
    const newPlaylist = playlist.filter(t => t.id !== id);
    setPlaylist(newPlaylist);
    
    if (currentTrackIndex === trackIdx) {
      // If active track is removed, reset to track index 0
      setCurrentTrackIndex(0);
      setIsPlaying(false);
    } else if (currentTrackIndex > trackIdx) {
      // Adjust current index
      setCurrentTrackIndex(currentTrackIndex - 1);
    }
  };

  return (
    <div className="morte-root fade-in">
      <div className="morte-grid">
        {/* Vinyl & Player Controls */}
        <div className="music-player-card">
          <div className="vinyl-container">
            <div className={`vinyl-disc ${isPlaying ? 'playing' : ''}`}>
              <div className="vinyl-grooves"></div>
              <div className="vinyl-center">
                <Skull size={24} style={{ color: '#000' }} />
              </div>
            </div>
          </div>

          <div className="track-info">
            <h3 className="track-title">{activeTrack.title}</h3>
            <span className="track-subtitle">{activeTrack.artist}</span>
          </div>

          {/* Time Scrubber */}
          <div className="scrubber-container">
            <div className="scrubber-time-info">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration || 0)}</span>
            </div>
            <div className="scrubber-bar" onClick={handleScrubberChange}>
              <div 
                className="scrubber-fill" 
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              ></div>
              <div 
                className="scrubber-handle" 
                style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          {/* Core Controls */}
          <div className="player-controls">
            <button className="btn-ctrl" onClick={handlePrev} title="Música Anterior">
              <SkipBack size={18} />
            </button>
            
            <button 
              className="btn-ctrl play-pause" 
              onClick={handlePlayPause}
              title={isPlaying ? "Pausar" : "Tocar"}
            >
              {isPlaying ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" style={{ marginLeft: '4px' }} />}
            </button>
            
            <button className="btn-ctrl" onClick={handleNext} title="Próxima Música">
              <SkipForward size={18} />
            </button>
          </div>

          {/* Volume Control */}
          <div className="volume-controls">
            <button style={{ color: 'inherit' }} onClick={toggleMute} title={isMuted ? "Tirar do Mudo" : "Mutar"}>
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
        </div>

        {/* Playlist & Interactive Visualizer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Visualizer Card */}
          <div className="visualizer-card">
            <div className="visualizer-header">
              <h4 className="visualizer-title">
                <Disc size={16} className={isPlaying ? 'spin' : ''} style={{ animation: 'spinSlow 3s linear infinite', animationPlayState: isPlaying ? 'running' : 'paused' }} />
                Análise de Frequência Sombria
              </h4>
            </div>
            <div className="visualizer-canvas-container">
              <canvas 
                ref={canvasRef} 
                className="visualizer-canvas" 
                width="400" 
                height="120"
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4', textAlign: 'left' }}>
              Este analisador lê as ondas sonoras em tempo real direto da saída do reprodutor. Inicie a música para ativar as flutuações de sinal e revelar a assinatura de áudio.
            </p>
          </div>

          {/* Playlist Panel */}
          <div className="playlist-card">
            <div className="card-header">
              <h3 className="card-title">Sua Playlist de Sobrevivência</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {playlist.length} faixas
              </span>
            </div>

            {/* List */}
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
                  >
                    <span className="playlist-item-index">
                      {isActive && isPlaying ? <Music size={14} className="fade-in" style={{ color: 'var(--color-primary)' }} /> : index + 1}
                    </span>
                    <span className="playlist-item-title">{track.title}</span>
                    <span className="playlist-item-duration">{track.duration}</span>
                    
                    {isUploaded && (
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
              <div className="upload-text">Adicionar Suas Músicas</div>
              <div className="upload-subtext">Arraste ou clique para enviar arquivos de áudio (.mp3, .wav)</div>
            </label>
          </div>

        </div>
      </div>
    </div>
  );
}
