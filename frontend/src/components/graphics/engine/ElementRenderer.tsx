import React, { useRef, useEffect, memo } from 'react';
import { Rect, Circle, Ellipse, RegularPolygon, Star, Line, Arrow, Text, Image, Group, Shape } from 'react-konva';
import Konva from 'konva';
import { useEditorStore } from '../state/editorStore';
import type { Element as EditorElement, TextElement, ShapeElement, ImageElement, VideoElement, GroupElement } from '../types';

interface ElementRendererProps {
  element: EditorElement;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (updates: Partial<EditorElement>) => void;
}

export const ElementRenderer: React.FC<ElementRendererProps> = memo(({
  element,
  isSelected,
  onSelect,
  onUpdate
}) => {
  const shapeRef = useRef<any>(null);
  const groupCacheTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Image state - moved to top level
  const [image, setImage] = React.useState<HTMLImageElement | null>(null);
  
  // Video state - moved to top level
  const [video, setVideo] = React.useState<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = React.useState<boolean>(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const animationRef = React.useRef<number | undefined>();

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (groupCacheTimeoutRef.current !== null) {
        clearTimeout(groupCacheTimeoutRef.current);
      }
    };
  }, []);

  // Selection visual feedback is now handled by Moveable
  useEffect(() => {
    if (isSelected && shapeRef.current) {
      // Add a data attribute for Moveable to find this element
      const node = shapeRef.current;
      if (node) {
        node.setAttr('data-selected', 'true');
      }
    } else if (!isSelected && shapeRef.current) {
      const node = shapeRef.current;
      if (node) {
        node.setAttr('data-selected', 'false');
      }
    }
  }, [isSelected, element]);

  // Handle transform (during dragging)
  const handleTransform = () => {
    const node = shapeRef.current;
    if (!node) return;
    
    if (element.type === 'text') {
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      
      if (scaleX !== 1 || scaleY !== 1) {
        const newWidth = Math.max(50, node.width() * scaleX);
        const newHeight = Math.max(20, node.height() * scaleY);
        
        node.width(newWidth);
        node.height(newHeight);
        node.scaleX(1);
        node.scaleY(1);
      }
    }
  };

  // Handle transform end
  const handleTransformEnd = () => {
    const node = shapeRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    if (element.type === 'text') {
      const textElement = element as TextElement;
      
      if (textElement.sizingMode === 'auto') {
        node.scaleX(1);
        node.scaleY(1);
        
        onUpdate({
          x: node.x(),
          y: node.y(),
          rotation: node.rotation()
        });
        return;
      }
      
      const newWidth = node.width() * scaleX;
      const newHeight = node.height() * scaleY;
      
      node.scaleX(1);
      node.scaleY(1);
      
      onUpdate({
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
        width: Math.max(50, newWidth),
        height: Math.max(20, newHeight),
      });
      
      return;
    }

    if (element.type === 'shape') {
      const shapeElement = element as ShapeElement;
      
      if (['circle', 'ellipse', 'triangle', 'polygon', 'hexagon', 'pentagon', 'octagon', 'star'].includes(shapeElement.shapeType)) {
        const newWidth = shapeElement.width * scaleX;
        const newHeight = shapeElement.height * scaleY;
        
        node.scaleX(1);
        node.scaleY(1);
        
        onUpdate({
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          width: Math.max(10, newWidth),
          height: Math.max(10, newHeight),
        });
        
        return;
      }
    }

    node.scaleX(1);
    node.scaleY(1);

    onUpdate({
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      width: Math.max(5, element.width * scaleX),
      height: Math.max(5, element.height * scaleY),
    });
  };

  // Track drag delta for group movement
  const dragStartPos = useRef({ x: 0, y: 0 });
  const otherElementsStartPos = useRef<Array<{ id: string; x: number; y: number }>>([]);
  
  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    dragStartPos.current = { x: element.x, y: element.y };
    
    const store = useEditorStore.getState();
    if (store.selectedElementIds.length > 1 && store.selectedElementIds.includes(element.id)) {
      const positions: Array<{ id: string; x: number; y: number }> = [];
      store.selectedElementIds.forEach(id => {
        if (id !== element.id) {
          for (const layer of store.layers) {
            const el = layer.elements.find(e => e.id === id);
            if (el) {
              positions.push({ id, x: el.x, y: el.y });
              break;
            }
          }
        }
      });
      otherElementsStartPos.current = positions;
    } else {
      otherElementsStartPos.current = [];
    }
  };
  
  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    
    if (otherElementsStartPos.current.length > 0) {
      const deltaX = e.target.x() - dragStartPos.current.x;
      const deltaY = e.target.y() - dragStartPos.current.y;
      
      const store = useEditorStore.getState();
      
      otherElementsStartPos.current.forEach(({ id, x, y }) => {
        store.updateElement(id, { 
          x: x + deltaX, 
          y: y + deltaY 
        });
      });
    }
  };
  
  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    onUpdate({ x: e.target.x(), y: e.target.y() });
    otherElementsStartPos.current = [];
  };

  const commonProps = {
    ref: shapeRef,
    x: element.x || 0,
    y: element.y || 0,
    rotation: element.rotation || 0,
    scaleX: element.scaleX || 1,
    scaleY: element.scaleY || 1,
    skewX: element.skewX || 0,
    skewY: element.skewY || 0,
    opacity: element.opacity ?? 1,
    visible: element.visible ?? true,
    draggable: !element.locked,
    offsetX: element.transformOrigin?.includes('100%') ? element.width : 
             element.transformOrigin?.includes('50%') ? element.width / 2 : 0,
    offsetY: element.transformOrigin?.includes('100%') ? element.height : 
             element.transformOrigin?.includes('50%') ? element.height / 2 : 0,
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      
      if (e.evt.shiftKey) {
        const store = useEditorStore.getState();
        if (store.selectedElementIds.includes(element.id)) {
          store.deselectElement(element.id);
        } else {
          store.selectElement(element.id, true);
        }
      } else {
        onSelect(element.id);
      }
    },
    onTap: (e: Konva.KonvaEventObject<TouchEvent>) => {
      e.cancelBubble = true;
      onSelect(element.id);
    },
    onDragStart: handleDragStart,
    onDragMove: handleDragMove,
    onDragEnd: handleDragEnd,
    onTransform: handleTransform,
    onTransformEnd: handleTransformEnd,
  };

  const renderElement = () => {
    switch (element.type) {
      case 'text':
        return renderTextElement(element as TextElement);
      case 'shape':
        return renderShapeElement(element as ShapeElement);
      case 'image':
        return renderImageElement(element as ImageElement);
      case 'video':
        return renderVideoElement(element as VideoElement);
      case 'group':
        return renderGroupElement(element as GroupElement);
      default:
        return null;
    }
  };

  const renderTextElement = (textElement: TextElement) => {
    // Convert gradient to Konva format if needed
    let fillProp: any = textElement.fill;
    if (typeof textElement.fill !== 'string' && textElement.fill) {
      const gradient = textElement.fill;
      
      if (gradient.type === 'radial') {
        const centerX = (gradient.x1 || 0.5) * textElement.width;
        const centerY = (gradient.y1 || 0.5) * textElement.height;
        const innerRadius = (gradient.r1 || 0) * Math.min(textElement.width, textElement.height);
        const outerRadius = (gradient.r2 || 0.5) * Math.min(textElement.width, textElement.height);
        
        fillProp = {
          fillRadialGradientStartPoint: { x: centerX, y: centerY },
          fillRadialGradientEndPoint: { x: centerX, y: centerY },
          fillRadialGradientStartRadius: innerRadius,
          fillRadialGradientEndRadius: outerRadius,
          fillRadialGradientColorStops: gradient.colorStops.flatMap(stop => [
            stop.offset,
            stop.color
          ])
        };
      } else {
        const angle = (gradient.angle || 90) * Math.PI / 180;
        const x1 = 0.5 - Math.cos(angle) * 0.5;
        const y1 = 0.5 - Math.sin(angle) * 0.5;
        const x2 = 0.5 + Math.cos(angle) * 0.5;
        const y2 = 0.5 + Math.sin(angle) * 0.5;
        
        fillProp = {
          fillLinearGradientStartPoint: { x: x1 * textElement.width, y: y1 * textElement.height },
          fillLinearGradientEndPoint: { x: x2 * textElement.width, y: y2 * textElement.height },
          fillLinearGradientColorStops: gradient.colorStops.flatMap(stop => [
            stop.offset,
            stop.color
          ])
        };
      }
    }
    
    const { scaleX, scaleY, ...textCommonProps } = commonProps;
    
    let textWidth = textElement.width;
    let textHeight = textElement.height;
    let textScaleX = 1;
    let textScaleY = 1;
    
    if (textElement.sizingMode === 'auto') {
      textWidth = undefined as any;
      textHeight = undefined as any;
    }
    
    if (textElement.autoSqueeze && !textElement.textWrap && textElement.sizingMode !== 'auto') {
      const tempText = new Konva.Text({
        text: textElement.text,
        fontSize: textElement.fontSize,
        fontFamily: textElement.fontFamily,
        fontStyle: textElement.fontStyle,
        fontWeight: textElement.fontWeight,
        letterSpacing: textElement.letterSpacing,
        wrap: 'none',
        width: undefined
      });
      
      const naturalWidth = tempText.width();
      
      if (naturalWidth > 0 && naturalWidth > textElement.width) {
        textScaleX = textElement.width / naturalWidth;
        textWidth = textElement.width;
      }
      
      tempText.destroy();
    }
    
    let shadowColor = textElement.shadow?.color;
    let shadowBlur = textElement.shadow?.blur || 0;
    let shadowOffsetX = textElement.shadow?.offsetX || 0;
    let shadowOffsetY = textElement.shadow?.offsetY || 0;
    let shadowOpacity = 1;
    
    if (textElement.dropShadow?.enabled) {
      shadowColor = textElement.dropShadow.color;
      shadowBlur = textElement.dropShadow.blur;
      shadowOffsetX = textElement.dropShadow.offsetX;
      shadowOffsetY = textElement.dropShadow.offsetY;
      shadowOpacity = textElement.dropShadow.opacity;
    }
    
    // Check if we need filters
    const f = textElement.filters || {};
    const needsFilters = 
      (f.blur && f.blur > 0) ||
      (f.brightness !== undefined && f.brightness !== 100) ||
      (f.contrast !== undefined && f.contrast !== 100) ||
      (f.grayscale && f.grayscale > 0) ||
      (f.hueRotate && f.hueRotate !== 0) ||
      (f.invert && f.invert > 0) ||
      (f.saturate !== undefined && f.saturate !== 100) ||
      (f.sepia && f.sepia > 0);
    
    const baseTextProps = {
      text: textElement.text,
      fontSize: textElement.fontSize,
      fontFamily: textElement.fontFamily,
      fontStyle: textElement.fontStyle,
      fontVariant: textElement.fontWeight.toString(),
      align: textElement.textAlign,
      lineHeight: textElement.lineHeight,
      letterSpacing: textElement.letterSpacing,
      ...(typeof fillProp === 'string' ? { fill: fillProp } : fillProp),
      stroke: textElement.stroke,
      strokeWidth: textElement.strokeWidth,
      width: textWidth,
      height: textHeight,
      wrap: textElement.textWrap !== false ? 'word' : 'none',
      shadowColor: shadowColor,
      shadowBlur: shadowBlur,
      shadowOffsetX: shadowOffsetX,
      shadowOffsetY: shadowOffsetY,
      shadowOpacity: shadowOpacity,
      textDecoration: textElement.textDecoration,
      scaleX: textScaleX,
      scaleY: textScaleY
    };
    
    if (!needsFilters) {
      return (
        <Text
          {...textCommonProps}
          {...baseTextProps}
        />
      );
    }
    
    const filters: any[] = [];
    if (f.blur && f.blur > 0) filters.push(Konva.Filters.Blur);
    if (f.brightness !== undefined && f.brightness !== 100) filters.push(Konva.Filters.Brighten);
    if (f.contrast !== undefined && f.contrast !== 100) filters.push(Konva.Filters.Contrast);
    if (f.grayscale && f.grayscale > 0) filters.push(Konva.Filters.Grayscale);
    if (f.hueRotate && f.hueRotate !== 0) filters.push(Konva.Filters.HSL);
    if (f.invert && f.invert > 0) filters.push(Konva.Filters.Invert);
    if (f.saturate !== undefined && f.saturate !== 100 && !filters.includes(Konva.Filters.HSL)) {
      filters.push(Konva.Filters.HSL);
    }
    if (f.sepia && f.sepia > 0) filters.push(Konva.Filters.Sepia);
    
    const handleGroupRef = (node: any) => {
      shapeRef.current = node;
      
      if (node) {
        if (groupCacheTimeoutRef.current) {
          clearTimeout(groupCacheTimeoutRef.current);
        }
        
        groupCacheTimeoutRef.current = setTimeout(() => {
          if (node && node.getLayer()) {
            try {
              node.cache({
                x: 0,
                y: 0,
                width: textElement.width || 200,
                height: textElement.height || 100,
                pixelRatio: 2
              });
              node.getLayer()?.batchDraw();
            } catch (err) {
              console.warn('Cache error:', err);
            }
          }
        }, 0);
      }
    };
    
    return (
      <Group
        {...textCommonProps}
        ref={handleGroupRef}
        filters={filters}
        blurRadius={f.blur || 0}
        brightness={f.brightness ? (f.brightness - 100) / 100 : 0}
        contrast={f.contrast ? (f.contrast - 100) / 100 : 0}
        hue={f.hueRotate || 0}
        saturation={f.saturate ? (f.saturate - 100) / 100 : 0}
      >
        <Text
          x={0}
          y={0}
          {...baseTextProps}
        />
      </Group>
    );
  };

  const renderShapeElement = (shapeElement: ShapeElement) => {
    let fillProp: any = shapeElement.fill;
    if (typeof shapeElement.fill !== 'string' && shapeElement.fill) {
      const gradient = shapeElement.fill;
      
      if (gradient.type === 'radial') {
        const centerX = (gradient.x1 || 0.5) * shapeElement.width;
        const centerY = (gradient.y1 || 0.5) * shapeElement.height;
        const innerRadius = (gradient.r1 || 0) * Math.min(shapeElement.width, shapeElement.height);
        const outerRadius = (gradient.r2 || 0.5) * Math.min(shapeElement.width, shapeElement.height);
        
        fillProp = {
          fillRadialGradientStartPoint: { x: centerX, y: centerY },
          fillRadialGradientEndPoint: { x: centerX, y: centerY },
          fillRadialGradientStartRadius: innerRadius,
          fillRadialGradientEndRadius: outerRadius,
          fillRadialGradientColorStops: gradient.colorStops.flatMap(stop => [
            stop.offset,
            stop.color
          ])
        };
      } else {
        const angle = (gradient.angle || 90) * Math.PI / 180;
        const x1 = 0.5 - Math.cos(angle) * 0.5;
        const y1 = 0.5 - Math.sin(angle) * 0.5;
        const x2 = 0.5 + Math.cos(angle) * 0.5;
        const y2 = 0.5 + Math.sin(angle) * 0.5;
        
        fillProp = {
          fillLinearGradientStartPoint: { x: x1 * shapeElement.width, y: y1 * shapeElement.height },
          fillLinearGradientEndPoint: { x: x2 * shapeElement.width, y: y2 * shapeElement.height },
          fillLinearGradientColorStops: gradient.colorStops.flatMap(stop => [
            stop.offset,
            stop.color
          ])
        };
      }
    }
    
    const shapeProps = {
      ...(typeof fillProp === 'string' ? { fill: fillProp } : fillProp),
      stroke: shapeElement.stroke,
      strokeWidth: shapeElement.strokeWidth,
      dash: shapeElement.strokeDashArray,
      shadowColor: shapeElement.shadow?.color,
      shadowBlur: shapeElement.shadow?.blur,
      shadowOffsetX: shapeElement.shadow?.offsetX,
      shadowOffsetY: shapeElement.shadow?.offsetY,
    };

    const needsCentering = ['circle', 'triangle', 'polygon', 'hexagon', 'pentagon', 'octagon', 'ellipse', 'star'].includes(shapeElement.shapeType);

    if (needsCentering) {
      switch (shapeElement.shapeType) {
        case 'circle':
          return (
            <Ellipse
              {...commonProps}
              radiusX={shapeElement.width / 2}
              radiusY={shapeElement.height / 2}
              {...shapeProps}
            />
          );
        
        case 'ellipse':
          return (
            <Ellipse
              {...commonProps}
              radiusX={shapeElement.width / 2}
              radiusY={shapeElement.height / 2}
              {...shapeProps}
            />
          );
        
        case 'triangle':
          return (
            <RegularPolygon
              {...commonProps}
              sides={3}
              radius={Math.min(shapeElement.width, shapeElement.height) / 2}
              {...shapeProps}
            />
          );
        
        case 'polygon':
        case 'hexagon':
          return (
            <RegularPolygon
              {...commonProps}
              sides={6}
              radius={Math.min(shapeElement.width, shapeElement.height) / 2}
              {...shapeProps}
            />
          );
        
        case 'pentagon':
          return (
            <RegularPolygon
              {...commonProps}
              sides={5}
              radius={Math.min(shapeElement.width, shapeElement.height) / 2}
              {...shapeProps}
            />
          );
        
        case 'octagon':
          return (
            <RegularPolygon
              {...commonProps}
              sides={8}
              radius={Math.min(shapeElement.width, shapeElement.height) / 2}
              {...shapeProps}
            />
          );
        
        case 'star':
          return (
            <Star
              {...commonProps}
              numPoints={5}
              innerRadius={Math.min(shapeElement.width, shapeElement.height) / 4}
              outerRadius={Math.min(shapeElement.width, shapeElement.height) / 2}
              {...shapeProps}
            />
          );
        
        default:
          return null;
      }
    }

    switch (shapeElement.shapeType) {
      case 'rectangle':
        return (
          <Rect
            {...commonProps}
            {...shapeProps}
            width={shapeElement.width}
            height={shapeElement.height}
            cornerRadius={element.cornerRadius as number}
          />
        );
      
      case 'heart':
        return (
          <Shape
            {...commonProps}
            {...shapeProps}
            sceneFunc={(context, shape) => {
              const w = shapeElement.width;
              const h = shapeElement.height;
              context.beginPath();
              context.moveTo(w / 2, h / 4);
              context.bezierCurveTo(w / 2, h / 8, w / 8, h / 8, w / 8, h / 3);
              context.bezierCurveTo(w / 8, h / 2, w / 2, h * 0.8, w / 2, h);
              context.bezierCurveTo(w / 2, h * 0.8, w * 7/8, h / 2, w * 7/8, h / 3);
              context.bezierCurveTo(w * 7/8, h / 8, w / 2, h / 8, w / 2, h / 4);
              context.closePath();
              context.fillStrokeShape(shape);
            }}
          />
        );
      
      case 'cross':
        return (
          <Shape
            {...commonProps}
            {...shapeProps}
            sceneFunc={(context, shape) => {
              const w = shapeElement.width;
              const h = shapeElement.height;
              const thickness = Math.min(w, h) / 3;
              context.beginPath();
              context.rect(0, (h - thickness) / 2, w, thickness);
              context.rect((w - thickness) / 2, 0, thickness, h);
              context.closePath();
              context.fillStrokeShape(shape);
            }}
          />
        );
      
      case 'line':
        return (
          <Line
            {...commonProps}
            {...shapeProps}
            points={[0, 0, shapeElement.width, shapeElement.height]}
          />
        );
      
      case 'arrow':
        return (
          <Arrow
            {...commonProps}
            {...shapeProps}
            points={[0, 0, shapeElement.width, shapeElement.height]}
            pointerLength={10}
            pointerWidth={10}
          />
        );
      
      default:
        return (
          <Rect
            {...commonProps}
            {...shapeProps}
            width={shapeElement.width}
            height={shapeElement.height}
          />
        );
    }
  };

  // Image loading effect
  React.useEffect(() => {
    if (element.type === 'image') {
      const imageElement = element as ImageElement;
      const img = new window.Image();
      img.src = imageElement.src;
      img.onload = () => {
        setImage(img);
        // Transformer is now handled by Moveable
      };
    }
  }, [element.type === 'image' ? (element as ImageElement).src : null, isSelected, element.type]);

  const renderImageElement = (imageElement: ImageElement) => {

    if (!image) {
      return (
        <Rect
          {...commonProps}
          width={imageElement.width}
          height={imageElement.height}
          fill="#333"
          stroke="#555"
          strokeWidth={1}
        />
      );
    }

    return (
      <Image
        {...commonProps}
        image={image}
        width={imageElement.width}
        height={imageElement.height}
        crop={imageElement.cropX ? {
          x: imageElement.cropX,
          y: imageElement.cropY || 0,
          width: imageElement.cropWidth || imageElement.width,
          height: imageElement.cropHeight || imageElement.height,
        } : undefined}
      />
    );
  };

  // Video loading effect
  React.useEffect(() => {
    if (element.type !== 'video') return;

    const videoElement = element as VideoElement;
    const vid = document.createElement('video');
      vid.src = videoElement.src;
      vid.loop = videoElement.loop || false;
      vid.muted = videoElement.muted || false;
      vid.volume = videoElement.volume || 1;
      vid.currentTime = videoElement.currentTime || 0;
      
      vid.onloadedmetadata = () => {
        vid.currentTime = 0.1;
      };
      
      vid.onseeked = () => {
        vid.currentTime = videoElement.currentTime || 0;
        setVideo(vid);
        videoRef.current = vid;
        
        const forceRedraw = () => {
          if (shapeRef.current && shapeRef.current.getLayer()) {
            shapeRef.current.getLayer()?.batchDraw();
          }
        };
        
        forceRedraw();
        setTimeout(forceRedraw, 10);
        setTimeout(forceRedraw, 50);
        setTimeout(forceRedraw, 100);
        
        if (videoElement.playing) {
          vid.play();
          setIsPlaying(true);
        }
        
        // Transformer is now handled by Moveable
      };
      
      return () => {
        vid.pause();
        vid.src = '';
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
  }, [element.type === 'video' ? (element as VideoElement).src : null, isSelected, element.type]);
  
  // Video playing state effect
  React.useEffect(() => {
    if (element.type !== 'video') return;
    const videoElement = element as VideoElement;
      if (video) {
        if (videoElement.playing && !isPlaying) {
          video.play();
          setIsPlaying(true);
        } else if (!videoElement.playing && isPlaying) {
          video.pause();
          setIsPlaying(false);
        }
        
        requestAnimationFrame(() => {
          if (shapeRef.current && shapeRef.current.getLayer()) {
            shapeRef.current.getLayer()?.batchDraw();
          }
        });
      }
  }, [element.type === 'video' ? (element as VideoElement).playing : null, video, element.type]);
  
  // Video properties effect
  React.useEffect(() => {
    if (element.type !== 'video') return;
    const videoElement = element as VideoElement;
      if (video) {
        video.loop = videoElement.loop || false;
        video.muted = videoElement.muted || false;
        video.volume = videoElement.volume || 1;
        
        if (isPlaying) {
          const updateCanvas = () => {
            if (shapeRef.current) {
              shapeRef.current.getLayer()?.batchDraw();
            }
            if (isPlaying && videoRef.current && !videoRef.current.paused) {
              animationRef.current = requestAnimationFrame(updateCanvas);
            }
          };
          updateCanvas();
        } else {
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }
          if (shapeRef.current && shapeRef.current.getLayer()) {
            shapeRef.current.getLayer()?.batchDraw();
          }
        }
      }
  }, [isPlaying, element.type === 'video' ? (element as VideoElement).loop : null, element.type === 'video' ? (element as VideoElement).muted : null, element.type === 'video' ? (element as VideoElement).volume : null, video, element.type]);

  const renderVideoElement = (videoElement: VideoElement) => {

    if (!video) {
      return (
        <Group {...commonProps}>
          <Rect
            x={0}
            y={0}
            width={videoElement.width || 320}
            height={videoElement.height || 180}
            fill="#000"
            stroke="#555"
            strokeWidth={2}
          />
          <Text
            x={(videoElement.width || 320) / 2}
            y={(videoElement.height || 180) / 2}
            text="Loading Video..."
            fontSize={14}
            fill="#888"
            align="center"
            verticalAlign="middle"
            offsetX={50}
            offsetY={7}
          />
        </Group>
      );
    }

    return (
      <Image
        {...commonProps}
        image={video}
        width={videoElement.width || 320}
        height={videoElement.height || 180}
      />
    );
  };

  const renderGroupElement = (groupElement: GroupElement) => {
    const renderChildShape = (shapeChild: ShapeElement) => {
      let fillProp: any = shapeChild.fill;
      if (typeof shapeChild.fill !== 'string' && shapeChild.fill) {
        const gradient = shapeChild.fill;
        
        if (gradient.type === 'radial') {
          const centerX = (gradient.x1 || 0.5) * shapeChild.width;
          const centerY = (gradient.y1 || 0.5) * shapeChild.height;
          const innerRadius = (gradient.r1 || 0) * Math.min(shapeChild.width, shapeChild.height);
          const outerRadius = (gradient.r2 || 0.5) * Math.min(shapeChild.width, shapeChild.height);
          
          fillProp = {
            fillRadialGradientStartPoint: { x: centerX, y: centerY },
            fillRadialGradientEndPoint: { x: centerX, y: centerY },
            fillRadialGradientStartRadius: innerRadius,
            fillRadialGradientEndRadius: outerRadius,
            fillRadialGradientColorStops: gradient.colorStops.flatMap(stop => [
              stop.offset,
              stop.color
            ])
          };
        } else {
          const angle = (gradient.angle || 90) * Math.PI / 180;
          const x1 = 0.5 - Math.cos(angle) * 0.5;
          const y1 = 0.5 - Math.sin(angle) * 0.5;
          const x2 = 0.5 + Math.cos(angle) * 0.5;
          const y2 = 0.5 + Math.sin(angle) * 0.5;
          
          fillProp = {
            fillLinearGradientStartPoint: { x: x1 * shapeChild.width, y: y1 * shapeChild.height },
            fillLinearGradientEndPoint: { x: x2 * shapeChild.width, y: y2 * shapeChild.height },
            fillLinearGradientColorStops: gradient.colorStops.flatMap(stop => [
              stop.offset,
              stop.color
            ])
          };
        }
      }
      
      const shapeProps = {
        key: shapeChild.id,
        x: shapeChild.x,
        y: shapeChild.y,
        ...(typeof fillProp === 'string' ? { fill: fillProp } : fillProp),
        stroke: shapeChild.stroke,
        strokeWidth: shapeChild.strokeWidth,
        rotation: shapeChild.rotation,
        scaleX: shapeChild.scaleX,
        scaleY: shapeChild.scaleY,
        opacity: shapeChild.opacity,
        listening: false,
        draggable: false
      };

      switch (shapeChild.shapeType) {
        case 'circle':
          return (
            <Ellipse
              {...shapeProps}
              x={shapeChild.x + shapeChild.width / 2}
              y={shapeChild.y + shapeChild.height / 2}
              radiusX={shapeChild.width / 2}
              radiusY={shapeChild.height / 2}
            />
          );
        case 'triangle':
          return (
            <RegularPolygon
              {...shapeProps}
              x={shapeChild.x + shapeChild.width / 2}
              y={shapeChild.y + shapeChild.height / 2}
              sides={3}
              radius={Math.min(shapeChild.width, shapeChild.height) / 2}
            />
          );
        case 'star':
          return (
            <Star
              {...shapeProps}
              x={shapeChild.x + shapeChild.width / 2}
              y={shapeChild.y + shapeChild.height / 2}
              numPoints={5}
              innerRadius={Math.min(shapeChild.width, shapeChild.height) / 4}
              outerRadius={Math.min(shapeChild.width, shapeChild.height) / 2}
            />
          );
        case 'rectangle':
        default:
          return (
            <Rect
              {...shapeProps}
              width={shapeChild.width}
              height={shapeChild.height}
            />
          );
      }
    };

    return (
      <Group
        {...commonProps}
        width={groupElement.width}
        height={groupElement.height}
      >
        <Rect
          x={0}
          y={0}
          width={groupElement.width}
          height={groupElement.height}
          fill="transparent"
          stroke="transparent"
        />
        {groupElement.children && groupElement.children.map((child) => {
          const childElement = { ...child };
          
          switch (childElement.type) {
            case 'shape':
              return renderChildShape(childElement as ShapeElement);
            case 'text':
              const textChild = childElement as TextElement;
              return (
                <Text
                  key={textChild.id}
                  x={textChild.x}
                  y={textChild.y}
                  width={textChild.width}
                  height={textChild.height}
                  text={textChild.text}
                  fontSize={textChild.fontSize}
                  fontFamily={textChild.fontFamily}
                  fontStyle={textChild.fontStyle}
                  fill={typeof textChild.fill === 'string' ? textChild.fill : '#000'}
                  align={textChild.textAlign}
                  rotation={textChild.rotation}
                  scaleX={textChild.scaleX}
                  scaleY={textChild.scaleY}
                  opacity={textChild.opacity}
                  listening={false}
                  draggable={false}
                />
              );
            case 'image':
              const imageChild = childElement as ImageElement;
              return (
                <Rect
                  key={imageChild.id}
                  x={imageChild.x}
                  y={imageChild.y}
                  width={imageChild.width}
                  height={imageChild.height}
                  fill="#333"
                  listening={false}
                  draggable={false}
                />
              );
            default:
              return null;
          }
        })}
      </Group>
    );
  };

  return renderElement();
}, (prevProps, nextProps) => {
  return (
    prevProps.element.x === nextProps.element.x &&
    prevProps.element.y === nextProps.element.y &&
    prevProps.element.width === nextProps.element.width &&
    prevProps.element.height === nextProps.element.height &&
    prevProps.element.rotation === nextProps.element.rotation &&
    prevProps.element.scaleX === nextProps.element.scaleX &&
    prevProps.element.scaleY === nextProps.element.scaleY &&
    prevProps.element.opacity === nextProps.element.opacity &&
    prevProps.element.visible === nextProps.element.visible &&
    prevProps.element.locked === nextProps.element.locked &&
    prevProps.isSelected === nextProps.isSelected &&
    JSON.stringify(prevProps.element) === JSON.stringify(nextProps.element)
  );
});