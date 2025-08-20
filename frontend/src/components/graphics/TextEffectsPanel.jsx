import React, { useState, useEffect } from 'react';
import AnimationPreview from './AnimationPreview';
import { getEffect, getEffectNames, createEffectParameters } from './GWDEffects';

const TextEffectsPanel = ({ selectedElement, onUpdateElement }) => {
  const [currentEffect, setCurrentEffect] = useState(selectedElement?.textEffects?.effect || 'none');
  const [effectParameters, setEffectParameters] = useState(() => {
    const effect = selectedElement?.textEffects?.effect || 'none';
    const storedParams = selectedElement?.textEffects || {};
    return effect === 'none' ? {} : createEffectParameters(effect, storedParams);
  });

  // Update state when selectedElement changes
  useEffect(() => {
    if (selectedElement?.textEffects) {
      const effect = selectedElement.textEffects.effect || 'none';
      setCurrentEffect(effect);
      setEffectParameters(effect === 'none' ? {} : createEffectParameters(effect, selectedElement.textEffects));
    } else {
      setCurrentEffect('none');
      setEffectParameters({});
    }
  }, [selectedElement]);

  // Get the current effect definition
  const effectDef = currentEffect !== 'none' ? getEffect(currentEffect) : null;
  
  // Available easing options
  const easingOptions = [
    'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 
    'bounce-out', 'back-out'
  ];

  // Sequence options
  const sequenceOptions = [
    { value: 'char', label: 'Character' },
    { value: 'word', label: 'Word-by-word' },
    { value: 'line', label: 'Line-by-line' },
    { value: 'block', label: 'All at once' }
  ];

  // Handle effect change
  const handleEffectChange = (newEffect) => {
    setCurrentEffect(newEffect);
    
    if (newEffect === 'none') {
      setEffectParameters({});
      updateTextEffects({ effect: 'none' });
    } else {
      const newParams = createEffectParameters(newEffect);
      setEffectParameters(newParams);
      updateTextEffects({ effect: newEffect, ...newParams });
    }
  };

  // Handle parameter changes
  const handleParameterChange = (paramName, value) => {
    const newParams = { ...effectParameters, [paramName]: value };
    setEffectParameters(newParams);
    updateTextEffects({ effect: currentEffect, ...newParams });
  };

  // Update the element with new text effects
  const updateTextEffects = (params) => {
    if (onUpdateElement && selectedElement) {
      onUpdateElement(selectedElement.id, {
        textEffects: params
      });
    }
  };

  // Render a parameter control based on its type
  const renderParameterControl = (paramName) => {
    if (!effectDef || !effectDef.ui.includes(paramName)) return null;
    
    const value = effectParameters[paramName];

    switch (paramName) {
      case 'duration':
        return (
          <div key={paramName} style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
              fontSize: '12px', 
              color: '#ccc'
            }}>
              Duration
              <span style={{ 
                background: '#333', 
                padding: '2px 6px', 
                borderRadius: '3px',
                fontSize: '11px'
              }}>
                {value || 2}s
              </span>
            </label>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={value || 2}
              onChange={(e) => handleParameterChange('duration', parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        );

      case 'easing':
        return (
          <div key={paramName} style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '12px', 
              color: '#ccc'
            }}>
              Easing
            </label>
            <select
              value={value || 'ease-out'}
              onChange={(e) => handleParameterChange('easing', e.target.value)}
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
              {easingOptions.map(option => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1).replace('-', ' ')}
                </option>
              ))}
            </select>
          </div>
        );

      case 'speed':
        return (
          <div key={paramName} style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
              fontSize: '12px', 
              color: '#ccc'
            }}>
              Speed
              <span style={{ 
                background: '#333', 
                padding: '2px 6px', 
                borderRadius: '3px',
                fontSize: '11px'
              }}>
                {value || 0.5}
              </span>
            </label>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={value || 0.5}
              onChange={(e) => handleParameterChange('speed', parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        );

      case 'sequence':
        return (
          <div key={paramName} style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '12px', 
              color: '#ccc'
            }}>
              Sequence
            </label>
            <select
              value={value || 'char'}
              onChange={(e) => handleParameterChange('sequence', e.target.value)}
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
              {sequenceOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );

      case 'groupSize':
        return (
          <div key={paramName} style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
              fontSize: '12px', 
              color: '#ccc'
            }}>
              Grouping size
              <span style={{ 
                background: '#333', 
                padding: '2px 6px', 
                borderRadius: '3px',
                fontSize: '11px'
              }}>
                {value || 1}
              </span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={value || 1}
              onChange={(e) => handleParameterChange('groupSize', parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        );

      // Effect-specific numeric parameters
      case 'scaleFrom':
        return (
          <div key={paramName} style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
              fontSize: '12px', 
              color: '#ccc'
            }}>
              Scale
              <span style={{ 
                background: '#333', 
                padding: '2px 6px', 
                borderRadius: '3px',
                fontSize: '11px'
              }}>
                {Math.round((value || 0) * 100)}%
              </span>
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={value || 0}
              onChange={(e) => handleParameterChange('scaleFrom', parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        );

      case 'opacityFrom':
        return (
          <div key={paramName} style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
              fontSize: '12px', 
              color: '#ccc'
            }}>
              Opacity
              <span style={{ 
                background: '#333', 
                padding: '2px 6px', 
                borderRadius: '3px',
                fontSize: '11px'
              }}>
                {Math.round((value || 0) * 100)}%
              </span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={value || 0}
              onChange={(e) => handleParameterChange('opacityFrom', parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        );

      case 'xFrom':
        return (
          <div key={paramName} style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
              fontSize: '12px', 
              color: '#ccc'
            }}>
              X From
              <span style={{ 
                background: '#333', 
                padding: '2px 6px', 
                borderRadius: '3px',
                fontSize: '11px'
              }}>
                {value || 0}px
              </span>
            </label>
            <input
              type="range"
              min="-200"
              max="200"
              step="10"
              value={value || 0}
              onChange={(e) => handleParameterChange('xFrom', parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        );

      case 'yFrom':
        return (
          <div key={paramName} style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
              fontSize: '12px', 
              color: '#ccc'
            }}>
              Y From
              <span style={{ 
                background: '#333', 
                padding: '2px 6px', 
                borderRadius: '3px',
                fontSize: '11px'
              }}>
                {value || 0}px
              </span>
            </label>
            <input
              type="range"
              min="-200"
              max="200"
              step="10"
              value={value || 0}
              onChange={(e) => handleParameterChange('yFrom', parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        );

      case 'rotateFrom':
        return (
          <div key={paramName} style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
              fontSize: '12px', 
              color: '#ccc'
            }}>
              Rotation
              <span style={{ 
                background: '#333', 
                padding: '2px 6px', 
                borderRadius: '3px',
                fontSize: '11px'
              }}>
                {value || 0}°
              </span>
            </label>
            <input
              type="range"
              min="-720"
              max="720"
              step="15"
              value={value || 0}
              onChange={(e) => handleParameterChange('rotateFrom', parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        );

      case 'blurFromPx':
        return (
          <div key={paramName} style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
              fontSize: '12px', 
              color: '#ccc'
            }}>
              Blur
              <span style={{ 
                background: '#333', 
                padding: '2px 6px', 
                borderRadius: '3px',
                fontSize: '11px'
              }}>
                {value || 0}px
              </span>
            </label>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={value || 0}
              onChange={(e) => handleParameterChange('blurFromPx', parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        );

      case 'randomize':
        return (
          <div key={paramName} style={{ marginBottom: '15px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '12px',
              color: '#ccc',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={value || false}
                onChange={(e) => handleParameterChange('randomize', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Randomize order
            </label>
          </div>
        );

      case 'reverse':
        return (
          <div key={paramName} style={{ marginBottom: '15px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '12px',
              color: '#ccc',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={value || false}
                onChange={(e) => handleParameterChange('reverse', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Reverse
            </label>
          </div>
        );

      case 'direction':
        // Direction dropdown for positional effects
        const getDirectionOptions = () => {
          switch (currentEffect) {
            case 'Drop in':
              return [
                { value: 'top', label: 'From top' },
                { value: 'bottom', label: 'From bottom' },
                { value: 'left', label: 'From left' },
                { value: 'right', label: 'From right' }
              ];
            case 'Line up':
              return [
                { value: 'bottom', label: 'From bottom' },
                { value: 'top', label: 'From top' }
              ];
            case 'Slide':
              return [
                { value: 'left', label: 'From left' },
                { value: 'right', label: 'From right' },
                { value: 'top', label: 'From top' },
                { value: 'bottom', label: 'From bottom' }
              ];
            case 'Flip':
            case 'Roll':
            case 'Spin':
              return [
                { value: 'center', label: 'From center' },
                { value: 'left', label: 'From left' },
                { value: 'right', label: 'From right' }
              ];
            case 'Spread':
              return [
                { value: 'center', label: 'From center' },
                { value: 'left', label: 'From left' },
                { value: 'right', label: 'From right' },
                { value: 'top', label: 'From top' },
                { value: 'bottom', label: 'From bottom' }
              ];
            default:
              return [{ value: 'center', label: 'From center' }];
          }
        };
        
        return (
          <div key={paramName} style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '12px', 
              color: '#ccc'
            }}>
              Direction
            </label>
            <select
              value={value || 'center'}
              onChange={(e) => handleParameterChange('direction', e.target.value)}
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
              {getDirectionOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );


      case 'type':
        // Scroll type dropdown
        return (
          <div key={paramName} style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '12px', 
              color: '#ccc'
            }}>
              Type
            </label>
            <select
              value={value || 'regular'}
              onChange={(e) => handleParameterChange('type', e.target.value)}
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
              <option value="regular">Regular</option>
              <option value="smooth">Smooth</option>
              <option value="bounce">Bounce</option>
            </select>
          </div>
        );

      case 'fadeIn':
        // Typewriter fade in checkbox
        return (
          <div key={paramName} style={{ marginBottom: '15px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '12px',
              color: '#ccc',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={value || false}
                onChange={(e) => handleParameterChange('fadeIn', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Fade in
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ 
      padding: '0', 
      backgroundColor: '#2a2a2a',
      borderRadius: '8px',
      color: '#fff'
    }}>
      {/* Header */}
      <div style={{
        padding: '15px 20px',
        borderBottom: '1px solid #444',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: '16px',
          fontWeight: '600',
          color: '#fff',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Text Effects
        </h3>
      </div>

      {/* Enhanced Preview Window */}
      <div style={{ 
        padding: '20px',
        borderBottom: '1px solid #444'
      }}>
        <div style={{
          position: 'relative',
          minHeight: '180px',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          border: '2px solid #333'
        }}>
          <AnimationPreview
            effect={currentEffect}
            parameters={effectParameters}
            previewText={selectedElement?.text || 'TEXT EFFECTS'}
          />
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Effect Selector */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontSize: '12px', 
            color: '#ccc',
            fontWeight: 'bold'
          }}>
            Effect
          </label>
          <select
            value={currentEffect}
            onChange={(e) => handleEffectChange(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#1a1a1a',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '6px',
              fontSize: '13px'
            }}
          >
            <option value="none">None</option>
            {getEffectNames().map(effectName => (
              <option key={effectName} value={effectName}>
                {effectName}
              </option>
            ))}
          </select>
        </div>

        {/* Dynamic Properties Section */}
        {currentEffect !== 'none' && effectDef && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ 
              fontSize: '12px', 
              color: '#888', 
              margin: '0 0 15px 0',
              fontWeight: 'bold'
            }}>
              Properties
            </h4>

            {/* Render controls based on effect's UI specification */}
            {effectDef.ui.map(paramName => renderParameterControl(paramName))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TextEffectsPanel;