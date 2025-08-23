import React, { useRef } from 'react';
import { Image as ImageIcon } from 'react-bootstrap-icons';
import { useEditorStore } from '../state/editorStore';
import type { ImageElement } from '../types';

interface ImageUploadAdapterProps {
  onImageAdded?: (element: ImageElement) => void;
}

export const ImageUploadAdapter: React.FC<ImageUploadAdapterProps> = ({ onImageAdded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addElement, activeLayerId, canvas, setTool } = useEditorStore();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Create object URL for the image
    const imageUrl = URL.createObjectURL(file);
    
    // Create new image element to get dimensions
    const img = new Image();
    img.onload = () => {
      // Calculate appropriate size (max 500px width/height while maintaining aspect ratio)
      const maxSize = 500;
      let width = img.width;
      let height = img.height;
      
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width *= ratio;
        height *= ratio;
      }

      const newImage: ImageElement = {
        id: `image-${Date.now()}`,
        type: 'image',
        name: file.name,
        src: imageUrl,
        x: (canvas.size.width - width) / 2,
        y: (canvas.size.height - height) / 2,
        width,
        height,
        visible: true,
        locked: false,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        zIndex: 0
      };

      addElement(newImage, activeLayerId || undefined);
      setTool('select');
      
      if (onImageAdded) {
        onImageAdded(newImage);
      }

      // Clean up the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    img.src = imageUrl;
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <button
        onClick={handleClick}
        style={styles.button}
        title="Add Image"
      >
        <ImageIcon size={18} color="currentColor" />
      </button>
    </>
  );
};

const styles = {
  button: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: '4px',
    color: '#b0b0b0',
    cursor: 'pointer',
    transition: 'all 0.2s',
    padding: 0,
    outline: 'none'
  } as React.CSSProperties
};