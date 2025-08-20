import React from 'react';
import { PlayFill, ArrowRepeat } from 'react-bootstrap-icons';

const IconTest = () => {
  return (
    <div style={{ padding: '20px', background: '#333' }}>
      <h3 style={{ color: '#fff' }}>Icon Test</h3>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <PlayFill size={24} color="#4caf50" />
        <ArrowRepeat size={24} color="#2196F3" />
        <span style={{ color: '#fff' }}>Icons should appear here</span>
      </div>
    </div>
  );
};

export default IconTest;