// Time formatting utilities

export const formatTime = (date, use24Hour = true) => {
  return date.toLocaleTimeString('en-US', {
    hour12: !use24Hour,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const formatElapsedTime = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const formatCountdown = (ms) => {
  if (ms <= 0) return '0:00';
  
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const getItemTypeName = (type) => {
  const typeMap = {
    'camera': 'Camera',
    'camera_with_audio': 'Camera+Audio',
    'video': 'Video',
    'video_with_audio': 'Video+Audio',
    'audio': 'Audio',
    'graphic': 'Graphic',
    'graphic_template': 'Template',
    'title': 'Title',
    'note': 'Note',
    'manual': 'Manual'
  };
  
  return typeMap[type] || type;
};

export const getItemTypeColor = (type) => {
  const colorMap = {
    'camera': '#2196f3',
    'camera_with_audio': '#1976d2',
    'video': '#9c27b0',
    'video_with_audio': '#7b1fa2',
    'audio': '#ff9800',
    'graphic': '#4caf50',
    'graphic_template': '#388e3c',
    'title': '#00bcd4',
    'note': '#607d8b',
    'manual': '#795548'
  };
  
  return colorMap[type] || '#9e9e9e';
};