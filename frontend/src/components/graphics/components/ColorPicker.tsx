import React, { useState, useEffect } from 'react';
import GradientColorPicker from 'react-best-gradient-color-picker';
import type { Gradient } from '../types';

interface ColorPickerProps {
  value: string | Gradient;
  onChange: (value: string | Gradient) => void;
  showGradient?: boolean;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ 
  value, 
  onChange, 
  showGradient = true 
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [localValue, setLocalValue] = useState<string>('');
  
  // Convert our gradient format to/from the picker's format
  useEffect(() => {
    if (typeof value === 'string') {
      setLocalValue(value);
    } else {
      // Convert gradient to CSS string
      const stops = value.colorStops
        .map(stop => `${stop.color} ${stop.offset * 100}%`)
        .join(', ');
      
      if (value.type === 'radial') {
        setLocalValue(`radial-gradient(circle, ${stops})`);
      } else {
        setLocalValue(`linear-gradient(${value.angle || 90}deg, ${stops})`);
      }
    }
  }, [value]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    
    // Check if it's a gradient
    if (newValue.includes('gradient')) {
      // Try to parse as linear gradient first
      const linearMatch = newValue.match(/linear-gradient\((?:(\d+)deg)?(?:,\s*)?(.*)\)/);
      const radialMatch = newValue.match(/radial-gradient\((?:circle(?:\s+at\s+[\d.]+%\s+[\d.]+%)?\s*,\s*)?(.*)\)/);
      
      if (linearMatch) {
        const angle = linearMatch[1] ? parseInt(linearMatch[1]) : 90;
        const stopsString = linearMatch[2];
        
        // Parse color stops - handle various formats
        const colorStops: { offset: number; color: string }[] = [];
        
        // More flexible regex to handle different color formats and spacing
        // Matches: color offset% or just color (will add default offsets)
        const stopRegex = /(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|[a-z]+)(?:\s+([\d.]+)%)?/gi;
        let match;
        const matches: Array<{ color: string; offset?: number }> = [];
        
        while ((match = stopRegex.exec(stopsString)) !== null) {
          matches.push({
            color: match[1],
            offset: match[2] ? parseFloat(match[2]) / 100 : undefined
          });
        }
        
        // If no explicit offsets, distribute evenly
        if (matches.length >= 2) {
          const hasOffsets = matches.some(m => m.offset !== undefined);
          
          if (!hasOffsets) {
            // Distribute evenly
            matches.forEach((m, i) => {
              colorStops.push({
                color: m.color,
                offset: i / (matches.length - 1)
              });
            });
          } else {
            // Use provided offsets, default others
            matches.forEach((m, i) => {
              colorStops.push({
                color: m.color,
                offset: m.offset !== undefined ? m.offset : i / (matches.length - 1)
              });
            });
          }
          
          onChange({
            type: 'linear',
            colorStops,
            angle
          });
        } else if (matches.length === 1) {
          // Single color, treat as solid
          onChange(matches[0].color);
        } else {
          // Couldn't parse, pass through
          onChange(newValue);
        }
      } else if (radialMatch) {
        const stopsString = radialMatch[1];
        
        // Parse color stops for radial gradient
        const colorStops: { offset: number; color: string }[] = [];
        const stopRegex = /(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|[a-z]+)(?:\s+([\d.]+)%)?/gi;
        let match;
        const matches: Array<{ color: string; offset?: number }> = [];
        
        while ((match = stopRegex.exec(stopsString)) !== null) {
          matches.push({
            color: match[1],
            offset: match[2] ? parseFloat(match[2]) / 100 : undefined
          });
        }
        
        if (matches.length >= 2) {
          const hasOffsets = matches.some(m => m.offset !== undefined);
          
          if (!hasOffsets) {
            matches.forEach((m, i) => {
              colorStops.push({
                color: m.color,
                offset: i / (matches.length - 1)
              });
            });
          } else {
            matches.forEach((m, i) => {
              colorStops.push({
                color: m.color,
                offset: m.offset !== undefined ? m.offset : i / (matches.length - 1)
              });
            });
          }
          
          onChange({
            type: 'radial',
            colorStops,
            x1: 0.5,
            y1: 0.5,
            r1: 0,
            r2: 0.5
          });
        } else {
          onChange(newValue);
        }
      } else {
        // Not a recognized gradient format, pass through
        onChange(newValue);
      }
    } else {
      // It's a solid color
      onChange(newValue);
    }
  };

  const getDisplayStyle = (): React.CSSProperties => {
    if (typeof value === 'string') {
      if (value.includes('gradient')) {
        return { background: value };
      }
      return { background: value };
    } else {
      const stops = value.colorStops
        .map(stop => `${stop.color} ${stop.offset * 100}%`)
        .join(', ');
      
      if (value.type === 'radial') {
        return {
          background: `radial-gradient(circle, ${stops})`
        };
      } else {
        return {
          background: `linear-gradient(${value.angle || 90}deg, ${stops})`
        };
      }
    }
  };

  return (
    <div style={styles.container}>
      <div 
        style={{
          ...styles.swatch,
          ...getDisplayStyle()
        }}
        onClick={() => setShowPicker(!showPicker)}
      />
      
      {showPicker && (
        <div style={styles.popover}>
          <div style={styles.cover} onClick={() => setShowPicker(false)} />
          <div style={styles.pickerContainer}>
            <GradientColorPicker
              value={localValue}
              onChange={handleChange}
              hideEyeDrop
              hideAdvancedSliders={false}
              hideColorGuide
              hideInputType={false}
              width={250}
              height={250}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative'
  },
  swatch: {
    width: '32px',
    height: '24px',
    border: '1px solid #333',
    borderRadius: '4px',
    cursor: 'pointer',
    backgroundSize: 'cover'
  },
  popover: {
    position: 'absolute',
    zIndex: 2000,
    top: '30px',
    left: '0'
  },
  cover: {
    position: 'fixed',
    top: '0',
    right: '0',
    bottom: '0',
    left: '0'
  },
  pickerContainer: {
    position: 'relative',
    background: '#1a1a1a',
    borderRadius: '4px',
    padding: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
  }
};