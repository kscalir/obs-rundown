import React, { useState } from 'react';

// Import animate.css and override any conflicting global styles
import 'animate.css/animate.min.css';

const MinimalAnimationTest = () => {
  const [triggerKey, setTriggerKey] = useState(0);

  const triggerAnimation = () => {
    setTriggerKey(prev => prev + 1);
  };

  return (
    <div style={{ 
      padding: '40px', 
      backgroundColor: '#000', 
      color: '#fff', 
      minHeight: '100vh',
      // Override any global styles that might interfere
      fontFamily: 'Arial, sans-serif',
      boxSizing: 'border-box'
    }}>
      <h1>Minimal Animation Test</h1>
      <p>Testing the simplest possible animate.css integration</p>
      
      <div style={{ margin: '40px 0' }}>
        <button onClick={triggerAnimation} style={{
          padding: '10px 20px',
          backgroundColor: '#333',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          Trigger Animation
        </button>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px',
        backgroundColor: '#111',
        borderRadius: '8px',
        margin: '20px 0'
      }}>
        <div
          key={triggerKey}
          className="animate__animated animate__bounce"
          style={{
            padding: '20px',
            backgroundColor: '#333',
            borderRadius: '4px',
            fontSize: '20px',
            fontWeight: 'bold',
            // Explicitly set animation properties to override any global interference
            animationDuration: '1s !important',
            animationFillMode: 'both !important',
            animationTimingFunction: 'ease-in-out !important'
          }}
        >
          BOUNCE TEST
        </div>
      </div>

      <div style={{ backgroundColor: '#222', padding: '20px', borderRadius: '8px' }}>
        <h3>Manual CSS Test (should always work):</h3>
        <div
          style={{
            padding: '20px',
            backgroundColor: '#444',
            borderRadius: '4px',
            fontSize: '16px',
            animation: 'bounce 1s infinite',
            display: 'inline-block'
          }}
        >
          Manual CSS Animation
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%, 20%, 53%, 80%, to {
            animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
            transform: translate3d(0, 0, 0);
          }
          40%, 43% {
            animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
            transform: translate3d(0, -30px, 0);
          }
          70% {
            animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
            transform: translate3d(0, -15px, 0);
          }
          90% {
            transform: translate3d(0, -4px, 0);
          }
        }
      `}</style>
    </div>
  );
};

export default MinimalAnimationTest;