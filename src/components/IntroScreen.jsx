import React, { useState, useRef, useEffect } from 'react';
import { Play, Lock, ShieldAlert } from 'lucide-react';

export default function IntroScreen({ onComplete }) {
  const [hasStarted, setHasStarted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showSkip, setShowSkip] = useState(false);
  const videoRef = useRef(null);

  // Show skip button after 2 seconds
  useEffect(() => {
    if (hasStarted) {
      const timer = setTimeout(() => {
        setShowSkip(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [hasStarted]);

  const handleStart = () => {
    setHasStarted(true);
    // Play video after state update
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().catch(err => {
          console.log("Autoplay was blocked or failed", err);
        });
      }
    }, 100);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration || 1;
      setProgress((current / duration) * 100);
    }
  };

  const handleVideoEnded = () => {
    onComplete();
  };

  return (
    <div className="intro-container">
      {!hasStarted ? (
        <div className="intro-content scale-up">
          <div className="sidebar-logo-icon" style={{ margin: '0 auto 1.5rem', width: '60px', height: '60px' }}>
            <ShieldAlert size={36} />
          </div>
          <h1 className="intro-title haunted-flicker">Inconsistência <span>Mental</span></h1>
          <p className="intro-desc">
            Esta experiência contém som e elementos visuais atmosféricos. Certifique-se de que seu áudio está ativado antes de entrar.
          </p>
          <button className="btn-start" onClick={handleStart}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <Play size={18} fill="white" /> Entrar
            </span>
          </button>
        </div>
      ) : (
        <div className="intro-video-wrapper fade-in">
          {showSkip && (
            <button className="btn-skip fade-in" onClick={onComplete}>
              Pular Introdução
            </button>
          )}
          
          <video
            ref={videoRef}
            src="/intro.mp4"
            className="intro-video"
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
            playsInline
          />
          
          <div className="intro-overlay"></div>
          
          <div className="intro-playing-ui">
            <div className="progress-bar-container">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="intro-lock-msg">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={12} className="fade-in" style={{ color: 'var(--color-primary)' }} />
                Carregando Dashboard...
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
