import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Display, X, BoxArrowUpRight, Clipboard } from 'react-bootstrap-icons';

const PresenterQRModal = ({ isOpen, onClose, onOpenPresenter }) => {
  const [copied, setCopied] = useState(false);
  
  if (!isOpen) return null;

  const presenterUrl = `${window.location.origin}/presenter${window.location.search}`;
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(presenterUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 10000
      }} onClick={onClose} />
      
      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: '#2a2a2a',
        borderRadius: '8px',
        padding: '30px',
        zIndex: 10001,
        width: '400px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        color: '#fff'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '25px'
        }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#ff9800'
          }}>
            <Display size={24} />
            Presenter View
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#999',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={24} />
          </button>
        </div>
        
        {/* QR Code */}
        <div style={{
          background: '#fff',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <QRCodeSVG value={presenterUrl} size={200} />
        </div>
        
        {/* URL Display */}
        <div style={{
          background: '#1a1a1a',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px',
          fontSize: '14px',
          wordBreak: 'break-all',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ flex: 1 }}>{presenterUrl}</span>
          <button
            onClick={copyToClipboard}
            style={{
              background: copied ? '#4caf50' : '#555',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Clipboard size={14} />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        
        {/* Instructions */}
        <div style={{
          color: '#aaa',
          fontSize: '14px',
          marginBottom: '20px',
          lineHeight: '1.5'
        }}>
          Scan the QR code or visit the URL above to open the Presenter View. 
          This displays current segment info, live items, and presenter notes in real-time.
        </div>
        
        {/* Open in New Window Button */}
        <button
          onClick={onOpenPresenter}
          style={{
            width: '100%',
            padding: '12px',
            background: '#ff9800',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <BoxArrowUpRight size={18} />
          Open Presenter View
        </button>
      </div>
    </>
  );
};

export default PresenterQRModal;