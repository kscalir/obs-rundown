import React, { useState, useEffect } from 'react';
import TextAnimationComponent from './components/graphics/TextAnimationComponent';
import AnimationPreview from './components/graphics/AnimationPreview';
import AnimationSettings from './components/AnimationSettings';

const TestBroadcastText = () => {
  const [effect, setEffect] = useState('fadeInLeft');
  const [splitType, setSplitType] = useState('char');
  const [simpleTestKey, setSimpleTestKey] = useState(0);

  useEffect(() => {
    console.log('TestBroadcastText mounted successfully');
  }, []);

  // Trigger simple test animation when effect changes
  useEffect(() => {
    setSimpleTestKey(prev => prev + 1);
  }, [effect]);

  // Verified animate.css v4.1.1 effects (corrected names)
  const effects = [
    'none',
    // Attention Seekers
    'bounce', 'flash', 'pulse', 'rubberBand', 'shakeX', 'shakeY', 'headShake', 'swing', 'tada', 'wobble', 'jello', 'heartBeat',
    // Bounce Animations 
    'bounceIn', 'bounceInDown', 'bounceInLeft', 'bounceInRight', 'bounceInUp',
    'bounceOut', 'bounceOutDown', 'bounceOutLeft', 'bounceOutRight', 'bounceOutUp',
    // Fade Animations
    'fadeIn', 'fadeInDown', 'fadeInDownBig', 'fadeInLeft', 'fadeInLeftBig', 
    'fadeInRight', 'fadeInRightBig', 'fadeInUp', 'fadeInUpBig',
    'fadeInTopLeft', 'fadeInTopRight', 'fadeInBottomLeft', 'fadeInBottomRight',
    'fadeOut', 'fadeOutDown', 'fadeOutDownBig', 'fadeOutLeft', 'fadeOutLeftBig',
    'fadeOutRight', 'fadeOutRightBig', 'fadeOutUp', 'fadeOutUpBig',
    'fadeOutTopLeft', 'fadeOutTopRight', 'fadeOutBottomLeft', 'fadeOutBottomRight',
    // Flip Animations
    'flip', 'flipInX', 'flipInY', 'flipOutX', 'flipOutY',
    // Lightspeed
    'lightSpeedInRight', 'lightSpeedInLeft', 'lightSpeedOutRight', 'lightSpeedOutLeft',
    // Rotate Animations
    'rotateIn', 'rotateInDownLeft', 'rotateInDownRight', 'rotateInUpLeft', 'rotateInUpRight',
    'rotateOut', 'rotateOutDownLeft', 'rotateOutDownRight', 'rotateOutUpLeft', 'rotateOutUpRight',
    // Slide Animations
    'slideInDown', 'slideInLeft', 'slideInRight', 'slideInUp',
    'slideOutDown', 'slideOutLeft', 'slideOutRight', 'slideOutUp',
    // Zoom Animations
    'zoomIn', 'zoomInDown', 'zoomInLeft', 'zoomInRight', 'zoomInUp',
    'zoomOut', 'zoomOutDown', 'zoomOutLeft', 'zoomOutRight', 'zoomOutUp',
    // Back Animations
    'backInDown', 'backInLeft', 'backInRight', 'backInUp',
    'backOutDown', 'backOutLeft', 'backOutRight', 'backOutUp',
    // Special
    'hinge', 'rollIn', 'rollOut'
  ];

  const splitTypes = ['char', 'word', 'line'];

  return (
    <div style={{ 
      padding: '40px', 
      backgroundColor: '#1a1a1a', 
      color: '#fff', 
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>BroadcastText Test Page</h1>
      
      <AnimationSettings style={{ marginBottom: '30px' }} />
      
      <div style={{ marginBottom: '30px' }}>
        <h3>Controls</h3>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div>
            <label>Status: </label>
            <span style={{ color: '#0f7b0f', marginLeft: '10px' }}>TextAnimationComponent - Ready</span>
          </div>
          <div>
            <label>Effect: </label>
            <select 
              value={effect} 
              onChange={(e) => setEffect(e.target.value)}
              style={{ padding: '5px', marginLeft: '10px' }}
            >
              {effects.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Split By: </label>
            <select 
              value={splitType} 
              onChange={(e) => setSplitType(e.target.value)}
              style={{ padding: '5px', marginLeft: '10px' }}
            >
              {splitTypes.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
        {/* Main Animation Area */}
        <div style={{ 
          backgroundColor: '#2a2a2a', 
          padding: '40px', 
          borderRadius: '8px',
          minHeight: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <TextAnimationComponent
            animation={{ 
              effect: effect === 'none' ? undefined : effect,
              splitType: splitType
            }}
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#ffffff',
              textAlign: 'center'
            }}
          >
            Textillate Animation Test with {splitType} splitting
          </TextAnimationComponent>
        </div>

        {/* Preview Panel */}
        <div style={{
          backgroundColor: '#1a1a1a',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #333'
        }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#fff' }}>
            Properties Preview
          </h3>
          <AnimationPreview
            effect={effect}
            splitType={splitType}
            previewText="Properties Panel Preview"
          />
          <div style={{ fontSize: '12px', color: '#888', marginTop: '10px' }}>
            This preview panel simulates what will appear in the properties panel when you select text elements.
          </div>
        </div>
      </div>

      <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#333', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Simple Animation Test</h3>
        <div 
          key={simpleTestKey}
          className={`animate__animated animate__${effect}`}
          style={{
            padding: '10px',
            backgroundColor: '#555',
            borderRadius: '4px',
            textAlign: 'center',
            color: '#fff',
            animationDuration: '1s',
            animationFillMode: 'both'
          }}
        >
          Simple Test: {effect}
        </div>
        <div style={{ fontSize: '12px', color: '#888', marginTop: '10px' }}>
          This tests animate.css directly without SplitType splitting
        </div>
      </div>

      <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#333', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Debug: Quick Effect Tests</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
          {[
            'bounce', 'flash', 'pulse', 'shakeX', 'fadeIn', 'fadeInLeft', 'slideInUp', 'rotateIn', 
            'bounceIn', 'zoomIn', 'flipInX', 'tada', 'wobble', 'rollIn'
          ].map(testEffect => (
            <button
              key={testEffect}
              onClick={() => {
                setEffect(testEffect);
                setSplitType('char');
              }}
              style={{
                padding: '8px 4px',
                fontSize: '9px',
                background: effect === testEffect ? '#4caf50' : '#555',
                color: '#fff',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              {testEffect}
            </button>
          ))}
        </div>
        <div style={{ fontSize: '11px', color: '#888', marginTop: '10px' }}>
          Click any button to quickly test that specific effect with character splitting
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>Instructions</h3>
        <ul>
          <li>Select different textillate effects from the dropdown</li>
          <li>Choose how to split the text: characters, words, or lines</li>
          <li>Watch the live preview in the properties panel (right side)</li>
          <li>The preview automatically plays when you change effects</li>
          <li>Click "REPLAY" to see the animation again</li>
          <li>This preview system will transfer to the timeline later</li>
        </ul>
        
        <h3>Available Effect Categories</h3>
        <ul style={{ fontSize: '14px' }}>
          <li><strong>Attention Seekers:</strong> bounce, flash, pulse, rubberBand, shakeX, shakeY, swing, tada, wobble</li>
          <li><strong>Bounce:</strong> bounceIn/Out variations (Down, Left, Right, Up)</li>
          <li><strong>Fade:</strong> fadeIn/Out variations (Down, Left, Right, Up, Big)</li>
          <li><strong>Slide:</strong> slideIn/Out variations (Down, Left, Right, Up)</li>
          <li><strong>Rotate:</strong> rotateIn/Out variations (DownLeft, DownRight, UpLeft, UpRight)</li>
          <li><strong>Flip:</strong> flip, flipInX, flipInY, flipOutX, flipOutY</li>
          <li><strong>Zoom:</strong> zoomIn/Out variations (Down, Left, Right, Up)</li>
          <li><strong>Special:</strong> hinge, rollIn, rollOut</li>
        </ul>
      </div>
    </div>
  );
};

export default TestBroadcastText;