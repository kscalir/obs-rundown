import React from 'react';
import { 
  Cursor, CursorText, Square, Circle, FileEarmarkImage, FileEarmarkPlay, Collection, GridFill
} from 'react-bootstrap-icons';

const ToolbarDebug = () => {
  return (
    <div style={{ padding: '20px', background: '#2a2a2a', color: '#fff' }}>
      <h3>Toolbar Icon Debug</h3>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
        <Cursor size={22} color="#fff" />
        <CursorText size={22} color="#fff" />
        <Square size={22} color="#fff" />
        <Circle size={22} color="#fff" />
        <FileEarmarkImage size={22} color="#fff" />
        <FileEarmarkPlay size={22} color="#fff" />
        <Collection size={22} color="#fff" />
        <GridFill size={22} color="#fff" />
        <span>← These should be icons</span>
      </div>
      
      <div>
        <h4>Button Tests:</h4>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Test 1: Basic button */}
          <button style={{
            width: '40px',
            height: '40px',
            background: '#4a90e2',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Cursor size={22} color="#fff" />
          </button>
          
          {/* Test 2: With explicit positioning */}
          <button style={{
            width: '40px',
            height: '40px',
            background: '#4a90e2',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'visible'
          }}>
            <CursorText size={22} color="#fff" style={{ 
              display: 'block',
              position: 'relative',
              zIndex: 10
            }} />
          </button>
          
          {/* Test 3: Different approach */}
          <div style={{
            width: '40px',
            height: '40px',
            background: '#4a90e2',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}>
            <Square size={22} color="#fff" />
          </div>
          
          <span>← Test different approaches</span>
        </div>
      </div>
    </div>
  );
};

export default ToolbarDebug;