import React, { useState, useEffect } from 'react';
import IntroScreen from './components/IntroScreen';
import DashboardLayout from './components/DashboardLayout';

export default function App() {
  const [screen, setScreen] = useState('intro'); // 'intro', 'transitioning', 'dashboard'
  const [glitchActive, setGlitchActive] = useState(false);

  const startTransition = () => {
    setScreen('transitioning');
    setGlitchActive(true);
    
    // Simulate transition effect for 1.2 seconds, then show dashboard
    const timer = setTimeout(() => {
      setScreen('dashboard');
      setGlitchActive(false);
    }, 1200);

    return () => clearTimeout(timer);
  };

  return (
    <>
      {/* Glitch/Fade Transition Flash Screen Overlay */}
      {screen === 'transitioning' && (
        <div className={`transition-flash active ${glitchActive ? 'glitch' : ''}`} />
      )}

      {/* Main Screen Router */}
      {screen === 'intro' && (
        <IntroScreen onComplete={startTransition} />
      )}

      {screen === 'dashboard' && (
        <DashboardLayout />
      )}
    </>
  );
}
