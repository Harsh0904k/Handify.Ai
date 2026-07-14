import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Transformer, Rect, Circle, Line, Group } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';
import { TextBlock, Margins, Boundary, Point } from '../types';

interface CanvasProps {
  backgroundImage: string | null;
  textBlocks: TextBlock[];
  selectedIds: string[];
  onSelect: (id: string | null, multi?: boolean) => void;
  onChange: (blocks: TextBlock[], delta?: Point) => void;
  stageRef: any;
  margins?: Margins;
  showMargins?: boolean;
  boundary?: Boundary | null;
  onBoundaryChange?: (boundary: Boundary) => void;
  isCalibrating?: boolean;
  moveMode?: 'single' | 'all' | 'words';
  draggable?: boolean;
  isExporting?: boolean;
  isActive?: boolean;
  onActivate?: () => void;
  isRealistic?: boolean;
  isCharVariance?: boolean;
  listening?: boolean;
}

const TextBlockItem = React.memo(({ 
  shapeProps, 
  isSelected, 
  onSelect, 
  onChange,
  boundary,
  moveMode = 'single',
  draggable = true,
  scale = 1,
  isExporting = false,
  isActive = true,
  isRealistic = false,
  isCharVariance = false
}: { 
  shapeProps: TextBlock; 
  isSelected: boolean; 
  onSelect: (multi?: boolean) => void; 
  onChange: (newProps: TextBlock, delta?: { x: number, y: number }) => void;
  boundary?: Boundary | null;
  moveMode?: 'single' | 'all' | 'words';
  draggable?: boolean;
  scale?: number;
  isExporting?: boolean;
  isActive?: boolean;
  isRealistic?: boolean;
  isCharVariance?: boolean;
}) => {
  const shapeRef = useRef<any>(null);

  // Add random jitter and skew for realistic mode
  const jitter = React.useMemo(() => {
    if (!isRealistic) return { x: 0, y: 0, rotation: 0, skewX: 0, skewY: 0 };
    // Stable random based on ID
    const seed = shapeProps.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = (s: number) => {
      const x = Math.sin(s) * 10000;
      return x - Math.floor(x);
    };
    
    return {
      x: (random(seed) - 0.5) * 2, // -1 to 1px
      y: (random(seed + 1) - 0.5) * 2, // -1 to 1px
      rotation: (random(seed + 2) - 0.5) * 2, // -1 to 1 deg
      skewX: (random(seed + 3) - 0.5) * 0.03, // Subtle skew
      skewY: (random(seed + 4) - 0.5) * 0.03, // Subtle skew
    };
  }, [isRealistic, shapeProps.id]);

  return (
    <React.Fragment>
      <Group
        ref={shapeRef}
        id={shapeProps.id}
        onClick={(e) => {
          if (isExporting || !isActive) return;
          e.cancelBubble = true;
          onSelect(e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey);
        }}
        onTap={(e) => {
          if (isExporting || !isActive) return;
          e.cancelBubble = true;
          onSelect(true);
        }}
        x={shapeProps.x + jitter.x}
        y={shapeProps.y + jitter.y}
        rotation={shapeProps.rotation + jitter.rotation}
        skewX={jitter.skewX}
        skewY={jitter.skewY}
        draggable={draggable && !isExporting && isActive && (isSelected || typeof window !== 'undefined' && window.innerWidth >= 640)}
        dragBoundFunc={(pos) => {
          if (!boundary) return pos;
          // Convert absolute stage position back to internal coordinates for boundary check
          const internalX = pos.x / scale;
          const internalY = pos.y / scale;
          
          const minX = Math.min(boundary.topLeft.x, boundary.bottomLeft.x);
          const maxX = Math.max(boundary.topRight.x, boundary.bottomRight.x);
          const minY = Math.min(boundary.topLeft.y, boundary.topRight.y);
          const maxY = Math.max(boundary.bottomLeft.y, boundary.bottomRight.y);
          
          const node = shapeRef.current;
          const width = node ? node.width() : 0;
          const height = node ? node.height() : 0;
          
          const clampedX = Math.max(minX, Math.min(internalX, maxX - width));
          const clampedY = Math.max(minY, Math.min(internalY, maxY - height));
          
          // Return absolute stage position
          return {
            x: clampedX * scale,
            y: clampedY * scale,
          };
        }}
        onDragEnd={(e) => {
          const delta = {
            x: e.target.x() - shapeProps.x,
            y: e.target.y() - shapeProps.y,
          };
          onChange({
            ...shapeProps,
            x: e.target.x(),
            y: e.target.y(),
          }, moveMode === 'all' ? delta : undefined);
        }}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...shapeProps,
            x: node.x(),
            y: node.y(),
            rotation: node.rotation(),
            width: Math.max(5, node.width() * scaleX),
            fontSize: (shapeProps.fontSize || 24) * scaleY,
          });
        }}
      >
        <Text
          key={`${shapeProps.id}-${isRealistic}-${isCharVariance}-${isSelected}`}
          {...shapeProps}
          id={shapeProps.id + '-text'}
          x={0}
          y={0}
          text={shapeProps.text}
          lineHeight={shapeProps.lineHeight || 1.2}
          letterSpacing={shapeProps.letterSpacing || 0}
          opacity={shapeProps.opacity || 1}
          align={shapeProps.align || 'left'}
          draggable={false}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
          hitStrokeWidth={0}
          listening={isActive && !isExporting}
          hitFunc={(context, shape) => {
            // Draw a simple rectangle for hit detection to make selection easier and more reliable
            const fontSize = shapeProps.fontSize || 24;
            const text = shapeProps.text;
            const letterSpacing = shapeProps.letterSpacing || 0;
            const wordSpacing = (shapeProps.wordSpacing || 0) * 10;
            
            context.font = `${fontSize}px "${shapeProps.fontFamily || 'cursive_real'}"`;
            const words = text.split(' ');
            let totalWidth = 0;
            words.forEach((word, i) => {
              for (let j = 0; j < word.length; j++) {
                totalWidth += context.measureText(word[j]).width + letterSpacing;
              }
              if (i < words.length - 1) {
                totalWidth += context.measureText(' ').width + letterSpacing + wordSpacing;
              }
            });

            const hitPadding = typeof window !== 'undefined' && window.innerWidth < 640 ? 15 : 5;
            context.beginPath();
            context.rect(-hitPadding, -hitPadding, totalWidth + hitPadding * 2, fontSize + hitPadding * 2);
            context.closePath();
            context.fillStrokeShape(shape);
          }}
          sceneFunc={(context, shape) => {
            const text = shapeProps.text;
            const words = text.split(' ');
            const fontSize = shapeProps.fontSize || 24;
            const fontFamily = shapeProps.fontFamily || 'cursive_real';
            const secondaryFontFamily = shapeProps.secondaryFontFamily || fontFamily;
            const isCombinedFont = shapeProps.isCombinedFont || false;
            const fill = shapeProps.fill || '#000000';
            const letterSpacing = shapeProps.letterSpacing || 0;
            const wordSpacing = (shapeProps.wordSpacing || 0) * 10; // Extra pixels between words
            const align = shapeProps.align || 'left';
            const width = shapeProps.width || 200;

            context.fillStyle = fill;
            context.textBaseline = 'alphabetic';
            
            const baseOpacity = shape.opacity();
            context.globalAlpha = baseOpacity;

            // Stable random function for character variance
            const random = (s: number) => {
              const x = Math.sin(s) * 10000;
              return x - Math.floor(x);
            };
            const seed = shapeProps.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

            // Calculate total width to handle alignment
            let charIndex = 0;
            let totalWidth = 0;
            const wordMetrics = words.map((word, i) => {
              let w = 0;
              for (let j = 0; j < word.length; j++) {
                const char = word[j];
                const charSeed = seed + charIndex + char.charCodeAt(0);
                const currentFont = isCombinedFont && random(charSeed + 100) > 0.5 ? secondaryFontFamily : fontFamily;
                context.font = `${fontSize}px "${currentFont}"`;
                w += context.measureText(char).width + letterSpacing;
                charIndex++;
              }
              totalWidth += w;
              if (i < words.length - 1) {
                context.font = `${fontSize}px "${fontFamily}"`;
                totalWidth += context.measureText(' ').width + letterSpacing + wordSpacing;
                charIndex++;
              }
              return w;
            });

            let startX = 0;
            if (align === 'center') startX = (width - totalWidth) / 2;
            if (align === 'right') startX = width - totalWidth;

            let currentX = startX;
            context.font = `${fontSize}px "${fontFamily}"`;
            const spaceWidth = context.measureText(' ').width + letterSpacing + wordSpacing;

            charIndex = 0;
            words.forEach((word, i) => {
              // Draw each character for letter spacing
              for (let j = 0; j < word.length; j++) {
                const char = word[j];
                const charSeed = seed + charIndex + char.charCodeAt(0);
                const currentFont = isCombinedFont && random(charSeed + 100) > 0.5 ? secondaryFontFamily : fontFamily;
                context.font = `${fontSize}px "${currentFont}"`;

                let charX = currentX;
                let charY = fontSize * 0.8;
                let charRotation = 0;
                let charScale = 1;

                if (isCharVariance) {
                  const charSeed = seed + charIndex + char.charCodeAt(0);
                  // More natural, subtle offsets
                  charX += (random(charSeed) - 0.5) * (fontSize * 0.04); 
                  charY += (random(charSeed + 1) - 0.5) * (fontSize * 0.04); 
                  charRotation = (random(charSeed + 2) - 0.5) * 0.08; 
                  charScale = 0.98 + (random(charSeed + 3) * 0.04); // Scale between 0.98 and 1.02
                  
                  const charSkewX = (random(charSeed + 4) - 0.5) * 0.1; 
                  // Pressure affects opacity and stroke
                  const pressure = random(charSeed + 5);
                  const charOpacity = 0.75 + (pressure * 0.25); 
                  // Very subtle stroke to vary thickness without making it look "bold"
                  const charStrokeWidth = pressure > 0.7 ? (pressure - 0.7) * (fontSize * 0.015) : 0;

                  context.save();
                  context.translate(charX, charY);
                  context.rotate(charRotation);
                  context.scale(charScale, charScale);
                  context.transform(1, 0, charSkewX, 1, 0, 0); 
                  context.globalAlpha = charOpacity * baseOpacity;
                  
                  // Ink bleed effect - subtle shadow
                  if (isRealistic) {
                    context.shadowColor = fill;
                    context.shadowBlur = fontSize * (0.01 + pressure * 0.02);
                    context.shadowOffsetX = 0;
                    context.shadowOffsetY = 0;

                    // Color jitter for ink
                    const colorSeed = charSeed + 10;
                    const r = parseInt(fill.slice(1, 3), 16);
                    const g = parseInt(fill.slice(3, 5), 16);
                    const b = parseInt(fill.slice(5, 7), 16);
                    const offset = (random(colorSeed) - 0.5) * 20; // Increased jitter
                    context.fillStyle = `rgb(${Math.max(0, Math.min(255, r + offset))}, ${Math.max(0, Math.min(255, g + offset))}, ${Math.max(0, Math.min(255, b + offset))})`;
                    
                    // Smudge effect - very subtle
                    context.save();
                    context.globalAlpha = 0.04 * baseOpacity;
                    context.fillText(char, 0.4, 0.4);
                    context.fillText(char, -0.4, -0.4);
                    context.restore();
                  }

                  if (charStrokeWidth > 0) {
                    context.lineWidth = charStrokeWidth;
                    context.strokeStyle = context.fillStyle;
                    context.strokeText(char, 0, 0);
                  }
                  
                  context.fillText(char, 0, 0);
                  
                  // Add a second pass with slightly different offset for "ink flow"
                  if (isRealistic && pressure > 0.6) {
                    context.globalAlpha = (pressure - 0.6) * 0.3 * baseOpacity;
                    context.fillText(char, 0.2, 0.2);
                  }

                  context.restore();
                } else {
                  if (isRealistic) {
                    const charSeed = seed + charIndex + char.charCodeAt(0);
                    const pressure = random(charSeed + 5);
                    
                    context.save();
                    context.translate(charX, charY);
                    
                    // Subtle ink bleed even without variance
                    context.shadowColor = fill;
                    context.shadowBlur = fontSize * 0.01;
                    context.globalAlpha = (0.8 + pressure * 0.2) * baseOpacity;
                    
                    context.fillText(char, 0, 0);
                    context.restore();
                  } else {
                    context.fillText(char, charX, charY);
                  }
                }

                currentX += context.measureText(char).width + letterSpacing;
                charIndex++;
              }
              if (i < words.length - 1) {
                currentX += spaceWidth;
                charIndex++; // Count space as well for seed stability
              }
            });
          }}
        />
      </Group>
    </React.Fragment>
  );
});

const INTERNAL_WIDTH = 3000;

const IndividualTransformer = ({ id, isActive, isExporting, textBlocks }: { id: string, isActive: boolean, isExporting: boolean, textBlocks: TextBlock[] }) => {
  const trRef = useRef<any>(null);
  useEffect(() => {
    if (trRef.current && isActive && !isExporting) {
      const stage = trRef.current.getStage();
      const node = stage.findOne('#' + id);
      if (node) {
        trRef.current.nodes([node]);
        trRef.current.getLayer().batchDraw();
      }
    }
  }, [id, isActive, isExporting, textBlocks]);

  if (!isActive || isExporting) return null;

  return (
    <Transformer
      ref={trRef}
      rotateEnabled={true}
      enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right']}
      anchorSize={typeof window !== 'undefined' && window.innerWidth < 640 ? 16 : 10}
      anchorCornerRadius={4}
      anchorStroke="#6366f1"
      anchorFill="#fff"
      borderStroke="#6366f1"
      borderDash={[3, 3]}
      boundBoxFunc={(oldBox, newBox) => {
        if (newBox.width < 5 || newBox.height < 5) return oldBox;
        return newBox;
      }}
    />
  );
};

export default function Canvas({ 
  backgroundImage, 
  textBlocks, 
  selectedIds, 
  onSelect, 
  onChange,
  stageRef,
  margins,
  showMargins = false,
  boundary,
  onBoundaryChange,
  isCalibrating = false,
  moveMode = 'single',
  isExporting = false,
  isActive = true,
  onActivate,
  isRealistic = false,
  isCharVariance = false,
  listening
}: CanvasProps) {
  const [image] = useImage(backgroundImage || '');
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const trRef = useRef<any>(null);

  // Page-level jitter for realistic mode
  const pageJitter = React.useMemo(() => {
    if (!isRealistic || !image) return { rotation: 0, x: 0, y: 0 };
    // Use background image URL as seed for stable random
    const seed = backgroundImage?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0;
    const random = (s: number) => {
      const x = Math.sin(s) * 10000;
      return x - Math.floor(x);
    };
    
    return {
      rotation: (random(seed + 10) - 0.5) * 1.5, // Increased rotation jitter
      x: (random(seed + 11) - 0.5) * 15, // Increased x jitter
      y: (random(seed + 12) - 0.5) * 15  // Increased y jitter
    };
  }, [isRealistic, backgroundImage, image]);

  useEffect(() => {
    if (trRef.current) {
      const stage = trRef.current.getStage();
      const nodes = selectedIds.map(id => stage.findOne('#' + id)).filter(Boolean);
      trRef.current.nodes(nodes);
      trRef.current.getLayer().batchDraw();
    }
  }, [selectedIds, textBlocks]);

  useEffect(() => {
    const updateDimensions = () => {
      if (image && containerRef.current) {
        // Use requestAnimationFrame to ensure the DOM has updated visibility/layout
        requestAnimationFrame(() => {
          if (!containerRef.current) return;
          const containerWidth = containerRef.current.offsetWidth;
          const containerHeight = containerRef.current.offsetHeight;
          
          if (containerWidth > 0) {
            const scaleX = containerWidth / image.width;
            const scaleY = containerHeight / image.height;
            const scale = Math.min(scaleX, scaleY);
            
            setDimensions({
              width: image.width * scale,
              height: image.height * scale
            });
          } else if (isExporting) {
            // Fallback for hidden pages during export to ensure they have valid dimensions
            // Use a sensible default based on internal width to avoid "zoomed" look
            const scale = 0.25; // Roughly 750px width
            setDimensions({
              width: INTERNAL_WIDTH * scale,
              height: (INTERNAL_WIDTH * (image.height / image.width)) * scale
            });
          }
        });
      }
    };

    updateDimensions();
    // Add a small delay for mobile visibility transitions
    const timer = setTimeout(updateDimensions, 100);

    window.addEventListener('resize', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timer);
    };
  }, [image, isActive, isExporting]);

  const handleStageClick = (e: any) => {
    if (isExporting) return;
    
    if (!isActive) {
      onActivate?.();
      return;
    }

    if (e.target === e.target.getStage() || e.target.getClassName() === 'Image') {
      onSelect(null);
    }
  };

  const scale = dimensions.width > 0 ? dimensions.width / INTERNAL_WIDTH : 1;

  // Generate a stable noise pattern for realistic mode
  const noisePattern = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    const imageData = ctx.createImageData(256, 256);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const val = 200 + Math.random() * 55;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = 10; // Very low opacity noise
    }
    ctx.putImageData(imageData, 0, 0);

    // Add subtle paper fibers
    ctx.strokeStyle = 'rgba(0,0,0,0.03)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.moveTo(x, y);
      const len = 2 + Math.random() * 8;
      const angle = Math.random() * Math.PI * 2;
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }

    // Add pulp dots (dust/pulp)
    ctx.fillStyle = 'rgba(0,0,0,0.02)';
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = Math.random() * 0.6;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    return canvas;
  }, []);

  return (
    <div 
      ref={containerRef} 
      onClick={() => !isActive && !isExporting && onActivate?.()}
      className={`w-full h-full bg-surface-100 rounded-xl overflow-hidden transition-all duration-300 flex items-center justify-center relative touch-pan-y ${
        !isExporting && isActive ? 'sm:ring-4 sm:ring-brand-500/30 sm:shadow-2xl' : 'shadow-inner'
      } ${!isActive && !isExporting ? 'cursor-pointer hover:bg-surface-200' : ''}`}
    >
      {!backgroundImage ? (
        <div className="text-surface-400 font-medium italic p-4 text-center">Upload a photo to start</div>
      ) : (
        <Stage
          width={dimensions.width}
          height={dimensions.height}
          onClick={handleStageClick}
          onTap={handleStageClick}
          ref={stageRef}
          className={!isExporting && isActive && (selectedIds.length > 0 || moveMode === 'all' || typeof window !== 'undefined' && window.innerWidth >= 640) ? 'touch-none' : 'touch-pan-y'}
          pixelRatio={isExporting ? 3 : Math.min(2, window.devicePixelRatio || 1)}
          listening={listening !== undefined ? listening : (!isExporting && isActive)}
          preventDefault={!isExporting && isActive && (selectedIds.length > 0 || moveMode === 'all' || typeof window !== 'undefined' && window.innerWidth >= 640)}
        >
          <Layer 
            scaleX={scale} 
            scaleY={scale}
            rotation={pageJitter.rotation}
            x={pageJitter.x * scale}
            y={pageJitter.y * scale}
            offsetX={INTERNAL_WIDTH / 2}
            offsetY={image ? (INTERNAL_WIDTH * (image.height / image.width)) / 2 : 0}
            position={{ 
              x: (dimensions.width / 2) + (pageJitter.x * scale), 
              y: (dimensions.height / 2) + (pageJitter.y * scale) 
            }}
          >
            {image && (
              <KonvaImage
                image={image}
                width={INTERNAL_WIDTH}
                height={INTERNAL_WIDTH * (image.height / image.width)}
              />
            )}
            
            {showMargins && margins && !boundary && !isExporting && (
              <React.Fragment>
                {/* Margin lines */}
                <Text 
                  x={margins.left} 
                  y={margins.top - 15} 
                  text="Margin Area" 
                  fontSize={10} 
                  fill="#ef4444" 
                  opacity={0.5} 
                  fontStyle="bold"
                />
                <Rect
                  x={margins.left}
                  y={margins.top}
                  width={INTERNAL_WIDTH - margins.left - margins.right}
                  height={(INTERNAL_WIDTH * (image.height / image.width)) - margins.top - margins.bottom}
                  stroke="#ef4444"
                  strokeWidth={1}
                  dash={[5, 5]}
                  opacity={0.3}
                />
              </React.Fragment>
            )}

            {boundary && !isExporting && (
              <React.Fragment>
                <Line
                  points={[
                    boundary.topLeft.x, boundary.topLeft.y,
                    boundary.topRight.x, boundary.topRight.y,
                    boundary.bottomRight.x, boundary.bottomRight.y,
                    boundary.bottomLeft.x, boundary.bottomLeft.y,
                    boundary.topLeft.x, boundary.topLeft.y,
                  ]}
                  stroke="#ef4444"
                  strokeWidth={2}
                  dash={[5, 5]}
                  opacity={0.8}
                  fill={isCalibrating ? "rgba(239, 68, 68, 0.05)" : "transparent"}
                  closed={true}
                />
                {isCalibrating && (
                  <React.Fragment>
                    {(['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const).map((corner) => (
                      <Circle
                        key={corner}
                        x={boundary[corner].x}
                        y={boundary[corner].y}
                        radius={18 / scale} // Keep circles large on screen
                        fill="#ef4444"
                        stroke="white"
                        strokeWidth={3 / scale} // Keep stroke thin on screen
                        draggable={isActive}
                        shadowColor="black"
                        shadowBlur={10}
                        shadowOpacity={0.3}
                        onDragMove={(e) => onBoundaryChange?.({ ...boundary, [corner]: { x: e.target.x(), y: e.target.y() } })}
                        onMouseEnter={(e: any) => {
                          if (!isActive) return;
                          const stage = e.target.getStage();
                          stage.container().style.cursor = 'move';
                          e.target.scale({ x: 1.2, y: 1.2 });
                        }}
                        onMouseLeave={(e: any) => {
                          if (!isActive) return;
                          const stage = e.target.getStage();
                          stage.container().style.cursor = 'default';
                          e.target.scale({ x: 1, y: 1 });
                        }}
                      />
                    ))}
                  </React.Fragment>
                )}
              </React.Fragment>
            )}

            {moveMode === 'all' ? (
              <Group
                draggable={!isExporting && isActive}
                onDragEnd={(e) => {
                  const deltaX = e.target.x();
                  const deltaY = e.target.y();
                  const newBlocks = textBlocks.map(b => ({
                    ...b,
                    x: b.x + deltaX,
                    y: b.y + deltaY
                  }));
                  // Reset group position to 0,0 so blocks stay in sync with absolute stage state
                  e.target.x(0);
                  e.target.y(0);
                  onChange(newBlocks, { x: deltaX, y: deltaY });
                }}
              >
                {textBlocks.map((block, i) => (
                  <TextBlockItem
                    key={block.id}
                    shapeProps={block}
                    isSelected={false}
                    onSelect={() => {}}
                    onChange={(newProps) => {
                      const newBlocks = textBlocks.slice();
                      newBlocks[i] = newProps;
                      onChange(newBlocks);
                    }}
                    boundary={boundary}
                    moveMode={moveMode}
                    draggable={false}
                    scale={scale}
                    isExporting={isExporting}
                    isActive={isActive}
                    isRealistic={isRealistic}
                    isCharVariance={isCharVariance}
                  />
                ))}
              </Group>
            ) : (
              <React.Fragment>
                {textBlocks.map((block, i) => (
                  <TextBlockItem
                    key={block.id}
                    shapeProps={block}
                    isSelected={selectedIds.includes(block.id)}
                    onSelect={(multi) => onSelect(block.id, multi)}
                    onChange={(newProps) => {
                      const newBlocks = textBlocks.slice();
                      newBlocks[i] = newProps;
                      onChange(newBlocks);
                    }}
                    boundary={boundary}
                    moveMode={moveMode}
                    scale={scale}
                    isExporting={isExporting}
                    isActive={isActive}
                    isRealistic={isRealistic}
                    isCharVariance={isCharVariance}
                  />
                ))}
                {selectedIds.length > 0 && !isExporting && isActive && (
                  typeof window !== 'undefined' && window.innerWidth < 640 ? (
                    selectedIds.map(id => (
                      <IndividualTransformer
                        key={id}
                        id={id}
                        isActive={isActive}
                        isExporting={isExporting}
                        textBlocks={textBlocks}
                      />
                    ))
                  ) : (
                    <Transformer
                      ref={trRef}
                      rotateEnabled={true}
                      enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right']}
                      anchorSize={12}
                      anchorCornerRadius={3}
                      anchorStroke="#6366f1"
                      anchorFill="#fff"
                      borderStroke="#6366f1"
                      borderDash={[3, 3]}
                      boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 5 || newBox.height < 5) return oldBox;
                        return newBox;
                      }}
                    />
                  )
                )}
              </React.Fragment>
            )}
            
            {isRealistic && noisePattern && (
              <Rect
                width={INTERNAL_WIDTH}
                height={image ? INTERNAL_WIDTH * (image.height / image.width) : 1000}
                fillPatternImage={noisePattern as any}
                fillPatternRepeat="repeat"
                opacity={0.6}
                listening={false}
                perfectDrawEnabled={false}
              />
            )}

            {isRealistic && (
              <Rect
                width={INTERNAL_WIDTH}
                height={image ? INTERNAL_WIDTH * (image.height / image.width) : 1000}
                fillRadialGradientStartPoint={{ x: INTERNAL_WIDTH / 2, y: INTERNAL_WIDTH / 4 }}
                fillRadialGradientStartRadius={0}
                fillRadialGradientEndPoint={{ x: INTERNAL_WIDTH / 2, y: INTERNAL_WIDTH / 4 }}
                fillRadialGradientEndRadius={INTERNAL_WIDTH * 1.2}
                fillRadialGradientColorStops={[
                  0, 'rgba(255, 252, 240, 0.08)', 
                  0.5, 'rgba(255, 255, 255, 0)', 
                  1, 'rgba(0, 0, 0, 0.18)'
                ]}
                listening={false}
                perfectDrawEnabled={false}
              />
            )}

            {isRealistic && (
              <Rect
                width={INTERNAL_WIDTH}
                height={image ? INTERNAL_WIDTH * (image.height / image.width) : 1000}
                fill="rgba(255, 245, 220, 0.03)"
                listening={false}
                perfectDrawEnabled={false}
              />
            )}
          </Layer>
        </Stage>
      )}
    </div>
  );
}
