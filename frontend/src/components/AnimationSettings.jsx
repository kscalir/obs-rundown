import React, { useState, useEffect } from 'react';
import { 
  ANIMATION_MODES, 
  getAnimationMode, 
  setAnimationMode, 
  prefersReducedMotion,
  shouldAnimate 
} from '../utils/animationSettings';

const AnimationSettings = ({ style = {} }) => {
  const [currentMode, setCurrentMode] = useState(getAnimationMode());
  const [reducedMotionDetected, setReducedMotionDetected] = useState(false);
  
  useEffect(() => {
    setReducedMotionDetected(prefersReducedMotion());
  }, []);
  
  const handleModeChange = (mode) => {
    setAnimationMode(mode);
    setCurrentMode(mode);
    
    // Reload the page to see changes take effect
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };
  
  const getStatusColor = () => {
    switch (currentMode) {
      case ANIMATION_MODES.FORCE_ANIMATIONS: return '#4caf50';
      case ANIMATION_MODES.MINIMAL_ANIMATIONS: return '#ff9800';
      case ANIMATION_MODES.NO_ANIMATIONS: return '#f44336';
      case ANIMATION_MODES.RESPECT_PREFERENCE: return '#2196f3';
      default: return '#666';
    }
  };
  
  const getStatusText = () => {
    const animationStatus = shouldAnimate();
    switch (currentMode) {
      case ANIMATION_MODES.FORCE_ANIMATIONS: 
        return 'FORCE ANIMATIONS (Broadcast Mode)';
      case ANIMATION_MODES.MINIMAL_ANIMATIONS: 
        return 'MINIMAL ANIMATIONS';
      case ANIMATION_MODES.NO_ANIMATIONS: 
        return 'NO ANIMATIONS';
      case ANIMATION_MODES.RESPECT_PREFERENCE: 
        return `RESPECT OS PREFERENCE (${animationStatus ? 'Enabled' : 'Disabled'})`;
      default: 
        return 'UNKNOWN';
    }
  };
  
  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#2a2a2a',
      borderRadius: '8px',
      border: `2px solid ${getStatusColor()}`,
      ...style
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h3 style={{ 
          margin: 0, 
          color: getStatusColor(),
          fontSize: '14px',
          textTransform: 'uppercase'
        }}>
          Animation Settings
        </h3>
        <div style={{
          padding: '4px 8px',
          backgroundColor: getStatusColor(),
          color: '#fff',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: 'bold'
        }}>
          {getStatusText()}
        </div>
      </div>
      
      {reducedMotionDetected && (
        <div style={{
          padding: '10px',
          backgroundColor: '#3a1a1a',
          border: '1px solid #f44336',
          borderRadius: '4px',
          marginBottom: '15px',
          fontSize: '12px',
          color: '#f44336'
        }}>
          <strong>⚠️ Reduced Motion Detected</strong><br/>
          Your OS accessibility settings have "Reduce Motion" enabled, which disables animate.css by default.
        </div>
      )}
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontSize: '12px', 
          color: '#ccc',
          fontWeight: 'bold'
        }}>
          Animation Mode:
        </label>
        <select
          value={currentMode}
          onChange={(e) => handleModeChange(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: '#1a1a1a',
            color: '#fff',
            border: '1px solid #555',
            borderRadius: '4px',
            fontSize: '12px'
          }}
        >
          <option value={ANIMATION_MODES.FORCE_ANIMATIONS}>
            Force Animations (Broadcast Mode)
          </option>
          <option value={ANIMATION_MODES.RESPECT_PREFERENCE}>
            Respect OS Preference
          </option>
          <option value={ANIMATION_MODES.MINIMAL_ANIMATIONS}>
            Minimal Animations Only
          </option>
          <option value={ANIMATION_MODES.NO_ANIMATIONS}>
            No Animations
          </option>
        </select>
      </div>
      
      <div style={{ fontSize: '11px', color: '#888', lineHeight: '1.4' }}>
        <p style={{ margin: '0 0 8px 0' }}>
          <strong>Force Animations:</strong> Override OS settings for broadcast use
        </p>
        <p style={{ margin: '0 0 8px 0' }}>
          <strong>Respect OS:</strong> Honor user's accessibility preferences
        </p>
        <p style={{ margin: '0 0 8px 0' }}>
          <strong>Minimal:</strong> Use simple fade effects only
        </p>
        <p style={{ margin: '0' }}>
          <strong>No Animations:</strong> Disable all animations
        </p>
      </div>
    </div>
  );
};

export default AnimationSettings;