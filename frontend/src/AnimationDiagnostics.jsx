import React, { useState, useEffect } from 'react';
import 'animate.css/animate.min.css';

// Check if animate.css is properly loaded
const checkAnimateCSSLoaded = () => {
  // Create a test element to check for animate.css
  const testEl = document.createElement('div');
  testEl.className = 'animate__animated animate__bounce';
  testEl.style.position = 'absolute';
  testEl.style.left = '-9999px';
  document.body.appendChild(testEl);
  
  const computedStyle = getComputedStyle(testEl);
  const hasAnimation = computedStyle.animationName && computedStyle.animationName !== 'none';
  
  document.body.removeChild(testEl);
  return hasAnimation;
};

const AnimationDiagnostics = () => {
  const [currentEffect, setCurrentEffect] = useState('bounce');
  const [testKey, setTestKey] = useState(0);
  const [animationStatus, setAnimationStatus] = useState('ready');
  const [cssLoaded, setCssLoaded] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  
  // Check CSS loading on mount
  useEffect(() => {
    const isLoaded = checkAnimateCSSLoaded();
    setCssLoaded(isLoaded);
    
    // Additional debugging
    const stylesheets = Array.from(document.styleSheets);
    const animateSheet = stylesheets.find(sheet => {
      try {
        return sheet.href && sheet.href.includes('animate');
      } catch (e) {
        return false;
      }
    });
    
    setDebugInfo(`
      CSS Loaded: ${isLoaded}
      Total Stylesheets: ${stylesheets.length}
      Animate.css Sheet Found: ${!!animateSheet}
      Sheet URL: ${animateSheet?.href || 'Not found'}
    `);
  }, []);

  // Core animate.css effects to test
  const testEffects = [
    'bounce', 'flash', 'pulse', 'shakeX', 'shakeY', 'heartBeat',
    'fadeIn', 'fadeInLeft', 'fadeInRight', 'fadeInUp', 'fadeInDown',
    'slideInUp', 'slideInDown', 'slideInLeft', 'slideInRight',
    'bounceIn', 'bounceInUp', 'bounceInDown',
    'zoomIn', 'zoomInUp', 'rotateIn', 'flipInX', 'flipInY',
    'tada', 'wobble', 'jello', 'rollIn'
  ];

  const testAnimation = (effect) => {
    setCurrentEffect(effect);
    setAnimationStatus('playing');
    setTestKey(prev => prev + 1);
    
    // Reset status after animation
    setTimeout(() => {
      setAnimationStatus('ready');
    }, 1000);
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#1a1a1a', color: '#fff', minHeight: '100vh' }}>
      <h1>Animate.css Diagnostics</h1>
      <p>Testing individual animate.css effects to identify which ones work properly.</p>
      
      <div style={{
        padding: '15px',
        backgroundColor: cssLoaded ? '#1a3a1a' : '#3a1a1a',
        borderRadius: '8px',
        marginBottom: '20px',
        border: `2px solid ${cssLoaded ? '#4caf50' : '#f44336'}`
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: cssLoaded ? '#4caf50' : '#f44336' }}>
          CSS Status: {cssLoaded ? '✓ LOADED' : '✗ NOT LOADED'}
        </h3>
        <pre style={{ fontSize: '11px', color: '#ccc', margin: 0, whiteSpace: 'pre-wrap' }}>
          {debugInfo}
        </pre>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <strong>Current Effect:</strong> {currentEffect} 
        <span style={{ marginLeft: '20px', color: animationStatus === 'playing' ? '#4caf50' : '#888' }}>
          Status: {animationStatus}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px', marginBottom: '30px' }}>
        {testEffects.map(effect => (
          <button
            key={effect}
            onClick={() => testAnimation(effect)}
            style={{
              padding: '6px 4px',
              fontSize: '9px',
              background: currentEffect === effect ? '#4caf50' : '#444',
              color: '#fff',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            {effect}
          </button>
        ))}
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px',
        backgroundColor: '#2a2a2a',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <div
          key={testKey}
          className={`animate__animated animate__${currentEffect}`}
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            padding: '20px',
            backgroundColor: '#333',
            borderRadius: '4px',
            animationDuration: '1s',
            border: '2px solid #666'
          }}
          onAnimationStart={() => console.log(`Animation started: ${currentEffect}`)}
          onAnimationEnd={() => console.log(`Animation ended: ${currentEffect}`)}
        >
          Testing: {currentEffect}
        </div>
      </div>

      <div style={{ backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0 }}>Expected Results:</h3>
        <ul style={{ fontSize: '14px' }}>
          <li><strong>bounce:</strong> Should bounce up and down</li>
          <li><strong>flash:</strong> Should flash in and out</li>
          <li><strong>shakeX:</strong> Should shake left and right</li>
          <li><strong>fadeIn:</strong> Should fade in from transparent</li>
          <li><strong>slideInUp:</strong> Should slide in from bottom</li>
          <li><strong>rotateIn:</strong> Should rotate in from scaled down</li>
        </ul>
        <p style={{ color: '#888', fontSize: '12px', marginBottom: 0 }}>
          If an effect doesn't work, it may be: 1) Wrong effect name, 2) CSS not loaded, 3) Animation timing issue
        </p>
        
        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#1a1a1a', borderRadius: '4px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '12px' }}>Debug Commands (open browser console):</h4>
          <code style={{ fontSize: '10px', color: '#4caf50' }}>
            • document.querySelector('.animate__animated').style<br/>
            • getComputedStyle(document.querySelector('.animate__animated')).animationName<br/>
            • Array.from(document.styleSheets).map(s =&gt; s.href)
          </code>
        </div>
      </div>
    </div>
  );
};

export default AnimationDiagnostics;