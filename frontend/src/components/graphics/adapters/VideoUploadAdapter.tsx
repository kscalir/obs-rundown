import React, { useRef } from 'react';
import { Film } from 'react-bootstrap-icons';
import { useEditorStore } from '../state/editorStore';
import type { VideoElement } from '../types';

export const VideoUploadAdapter: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addElement, activeLayerId, setTool } = useEditorStore();

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('video/')) return;

    const videoUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    
    video.onloadedmetadata = () => {
      // Calculate appropriate size
      const maxSize = 600;
      let width = video.videoWidth;
      let height = video.videoHeight;
      
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width *= ratio;
        height *= ratio;
      }
      
      const newVideo: VideoElement = {
        id: `video-${Date.now()}`,
        type: 'video',
        name: file.name,
        src: videoUrl,
        x: 100,
        y: 100,
        width,
        height,
        visible: true,
        locked: false,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        zIndex: 0,
        playing: false,
        loop: false,
        muted: false,
        volume: 1,
        currentTime: 0,
        duration: video.duration
      };
      
      addElement(newVideo, activeLayerId || undefined);
      setTool('select');
    };
    
    video.src = videoUrl;
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleVideoUpload}
        style={{ display: 'none' }}
      />
      <button
        style={styles.button}
        onClick={handleClick}
        title="Add Video"
      >
        <Film size={18} color="currentColor" />
      </button>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  button: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: '4px',
    color: '#b0b0b0',
    cursor: 'pointer',
    transition: 'all 0.2s',
    padding: 0
  }
};