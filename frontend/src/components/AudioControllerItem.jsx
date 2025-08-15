import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config';

export default function AudioControllerItem({ item, onSave }) {
  const [audioSources, setAudioSources] = useState([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [formData, setFormData] = useState({
    audioSource: '',
    on: true,
    level: 100,
    fade: false,
    fadeDuration: 1.0
  });

  // Load form data from item
  useEffect(() => {
    if (item?.data) {
      setFormData({
        audioSource: item.data.audioSource || '',
        on: item.data.on !== undefined ? item.data.on : true,
        level: item.data.level !== undefined ? item.data.level : 100,
        fade: item.data.fade !== undefined ? item.data.fade : false,
        fadeDuration: item.data.fadeDuration !== undefined ? item.data.fadeDuration : 1.0
      });
    }
  }, [item]);

  // Fetch audio sources from OBS
  const fetchAudioSources = useCallback(async () => {
    setLoadingSources(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/obs/audio-sources`);
      if (!res.ok) {
        throw new Error(`Failed to fetch audio sources: ${res.status}`);
      }
      const sources = await res.json();
      setAudioSources(Array.isArray(sources) ? sources : []);
    } catch (error) {
      console.warn('Failed to fetch audio sources:', error);
      setAudioSources([]);
    } finally {
      setLoadingSources(false);
    }
  }, []);

  // Load audio sources on mount
  useEffect(() => {
    fetchAudioSources();
  }, [fetchAudioSources]);

  // Handle form changes
  const handleChange = useCallback((field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      
      // Auto-save when data changes
      if (onSave) {
        onSave(next);
      }
      
      return next;
    });
  }, [onSave]);

  return (
    <div style={{
      background: '#f8fbff',
      border: '1px solid #e6eef6',
      borderRadius: 10,
      boxShadow: '0 6px 18px rgba(15, 30, 60, .06)',
      overflow: 'hidden',
      marginRight: 16
    }}>
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e1e6ec',
        padding: '16px 20px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 600,
          color: '#1976d2'
        }}>
          Audio Cue
        </h3>
      </div>

      <div style={{ padding: 20 }}>
        {/* Audio Source Selection */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ 
            display: 'block', 
            fontSize: 14, 
            fontWeight: 600, 
            color: '#222', 
            marginBottom: 8 
          }}>
            Audio Source
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              value={formData.audioSource}
              onChange={(e) => handleChange('audioSource', e.target.value)}
              disabled={loadingSources}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #d4deea',
                borderRadius: 6,
                background: '#fff',
                fontSize: 14,
                fontFamily: 'inherit'
              }}
            >
              <option value="">Select audio source...</option>
              {audioSources.map((source, idx) => (
                <option key={idx} value={source.name || source}>
                  {source.name || source}
                </option>
              ))}
            </select>
            <button
              onClick={fetchAudioSources}
              disabled={loadingSources}
              style={{
                padding: '8px 12px',
                border: '1px solid #d4deea',
                borderRadius: 6,
                background: '#fff',
                fontSize: 12,
                cursor: 'pointer',
                color: '#666'
              }}
            >
              {loadingSources ? '...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* On/Off Toggle */}
        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            fontWeight: 600,
            color: '#222',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={formData.on}
              onChange={(e) => handleChange('on', e.target.checked)}
              style={{ margin: 0 }}
            />
            Audio On
          </label>
        </div>

        {/* Level Slider */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ 
            display: 'block', 
            fontSize: 14, 
            fontWeight: 600, 
            color: '#222', 
            marginBottom: 8 
          }}>
            Level: {formData.level}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={formData.level}
            onChange={(e) => handleChange('level', parseInt(e.target.value, 10))}
            style={{
              width: '100%',
              height: 6,
              borderRadius: 3,
              background: '#e1e6ec',
              outline: 'none',
              appearance: 'none'
            }}
          />
        </div>

        {/* Fade Options */}
        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            fontWeight: 600,
            color: '#222',
            cursor: 'pointer',
            marginBottom: 12
          }}>
            <input
              type="checkbox"
              checked={formData.fade}
              onChange={(e) => handleChange('fade', e.target.checked)}
              style={{ margin: 0 }}
            />
            Enable Fade
          </label>

          {formData.fade && (
            <div style={{ marginLeft: 20 }}>
              <label style={{ 
                display: 'block', 
                fontSize: 13, 
                fontWeight: 500, 
                color: '#555', 
                marginBottom: 6 
              }}>
                Fade Duration (seconds)
              </label>
              <input
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={formData.fadeDuration}
                onChange={(e) => handleChange('fadeDuration', parseFloat(e.target.value) || 0.1)}
                style={{
                  width: '100px',
                  padding: '6px 8px',
                  border: '1px solid #d4deea',
                  borderRadius: 4,
                  background: '#fff',
                  fontSize: 13,
                  fontFamily: 'inherit'
                }}
              />
            </div>
          )}
        </div>

        {/* Status Info */}
        <div style={{
          padding: '12px 16px',
          background: '#f0f4f8',
          borderRadius: 6,
          fontSize: 12,
          color: '#666',
          lineHeight: 1.4
        }}>
          <strong>Status:</strong> {formData.audioSource ? 
            `${formData.audioSource} - ${formData.on ? 'ON' : 'OFF'} at ${formData.level}%` + 
            (formData.fade ? ` (fade: ${formData.fadeDuration}s)` : '') :
            'No audio source selected'
          }
        </div>
      </div>
    </div>
  );
}