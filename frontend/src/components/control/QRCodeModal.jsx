import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const QRCodeModal = ({ isOpen, onClose, onOpenControlPad }) => {
  const [copied, setCopied] = useState(false);
  
  const getControlSurfaceUrl = () => {
    const protocol = window.location.protocol;
    const host = window.location.host;
    return `${protocol}//${host}/control-surface`;
  };
  
  const handleCopyUrl = () => {
    const url = getControlSurfaceUrl();
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  if (!isOpen) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '500px',
        width: '90%',
        position: 'relative'
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#666'
          }}
        >
          ✕
        </button>
        
        <h2 style={{
          margin: '0 0 24px 0',
          fontSize: '24px',
          fontWeight: '700',
          textAlign: 'center'
        }}>
          Control Surface
        </h2>
        
        {/* QR Code */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '24px'
        }}>
          <QRCodeSVG
            value={getControlSurfaceUrl()}
            size={256}
            level="H"
          />
        </div>
        
        {/* URL Display */}
        <div style={{
          background: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
          fontFamily: 'monospace',
          fontSize: '14px',
          wordBreak: 'break-all',
          textAlign: 'center'
        }}>
          {getControlSurfaceUrl()}
        </div>
        
        {/* Copy Button */}
        <button
          onClick={handleCopyUrl}
          style={{
            width: '100%',
            padding: '12px',
            background: copied ? '#4caf50' : '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background 0.3s'
          }}
        >
          {copied ? '✓ Copied!' : 'Copy URL'}
        </button>
        
        {/* Control Pad Popup Button */}
        <button
          onClick={() => {
            if (onOpenControlPad) {
              onOpenControlPad();
            }
            onClose();
          }}
          style={{
            width: '100%',
            padding: '12px',
            marginTop: '12px',
            background: '#9c27b0',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background 0.3s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#7b1fa2'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#9c27b0'}
        >
          Open Control Pad in Popup
        </button>
        
        {/* Instructions */}
        <p style={{
          marginTop: '16px',
          fontSize: '14px',
          color: '#666',
          textAlign: 'center',
          lineHeight: '1.5'
        }}>
          Scan the QR code or use the URL to open the control surface on any device
        </p>
      </div>
    </div>
  );
};

export default QRCodeModal;