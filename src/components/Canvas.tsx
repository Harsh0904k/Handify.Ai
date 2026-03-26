import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Transformer, Rect, Circle, Line, Group } from 'react-konva';
import useImage from 'use-image';
import { TextBlock, Margins, Boundary, Point } from '../types';

interface CanvasProps {
  backgroundImage: string | null;
  textBlocks: TextBlock[];
  selectedIds: string[];
  onSelect: (id: string | null, multi?: boolean) => void;
  onChange: (blocks: TextBlock[]) => void;
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
  isActive = true
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
}) => {
  const shapeRef = useRef<any>(null);

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
        x={shapeProps.x}
        y={shapeProps.y}
        rotation={shapeProps.rotation}
        draggable={draggable && !isExporting && isActive}
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
          sceneFunc={(context, shape) => {
            const text = shapeProps.text;
            const words = text.split(' ');
            const fontSize = shapeProps.fontSize || 24;
            const fontFamily = shapeProps.fontFamily || 'Caveat';
            const fill = shapeProps.fill || '#000000';
            const letterSpacing = shapeProps.letterSpacing || 0;
            const wordSpacing = (shapeProps.wordSpacing || 0) * 10; // Extra pixels between words
            const align = shapeProps.align || 'left';
            const width = shapeProps.width || 200;

            context.font = `${fontSize}px "${fontFamily}"`;
            context.fillStyle = fill;
            context.textBaseline = 'alphabetic';

            // Calculate total width to handle alignment
            let totalWidth = 0;
            const wordMetrics = words.map(word => {
              let w = 0;
              for (let j = 0; j < word.length; j++) {
                w += context.measureText(word[j]).width + letterSpacing;
              }
              totalWidth += w;
              return w;
            });
            totalWidth += (words.length - 1) * (context.measureText(' ').width + letterSpacing + wordSpacing);

            let startX = 0;
            if (align === 'center') startX = (width - totalWidth) / 2;
            if (align === 'right') startX = width - totalWidth;

            let currentX = startX;
            const spaceWidth = context.measureText(' ').width + letterSpacing + wordSpacing;

            words.forEach((word, i) => {
              // Draw each character for letter spacing
              for (let j = 0; j < word.length; j++) {
                context.fillText(word[j], currentX, fontSize * 0.8); // Adjust baseline slightly for better alignment
                currentX += context.measureText(word[j]).width + letterSpacing;
              }
              if (i < words.length - 1) {
                currentX += spaceWidth;
              }
            });
          }}
        />
      </Group>
    </React.Fragment>
  );
});

const INTERNAL_WIDTH = 3000;

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
  onActivate
}: CanvasProps) {
  const [image] = useImage(backgroundImage || '');
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const trRef = useRef<any>(null);

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
        const containerWidth = containerRef.current.offsetWidth || 800;
        const containerHeight = containerRef.current.offsetHeight || 600;
        
        const scaleX = containerWidth / image.width;
        const scaleY = containerHeight / image.height;
        const scale = Math.min(scaleX, scaleY);
        
        const newWidth = image.width * scale;
        const newHeight = image.height * scale;
        
        setDimensions({
          width: newWidth,
          height: newHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [image]);

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

  return (
    <div 
      ref={containerRef} 
      onClick={() => !isActive && !isExporting && onActivate?.()}
      className={`w-full h-full bg-zinc-200 rounded-xl overflow-hidden transition-all duration-300 flex items-center justify-center relative ${
        !isExporting && isActive ? 'ring-4 ring-blue-500 shadow-2xl' : 'shadow-inner'
      } ${!isActive && !isExporting ? 'cursor-pointer hover:bg-zinc-300' : ''}`}
    >
      {!backgroundImage ? (
        <div className="text-zinc-400 font-medium italic p-4 text-center">Upload a photo to start</div>
      ) : (
        <Stage
          width={dimensions.width}
          height={dimensions.height}
          onClick={handleStageClick}
          onTap={handleStageClick}
          ref={stageRef}
          className={!isExporting && !isActive ? 'touch-auto' : 'touch-none'}
          pixelRatio={Math.max(2, window.devicePixelRatio || 1)}
          listening={!isExporting}
        >
          <Layer scaleX={scale} scaleY={scale}>
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
                  onChange(newBlocks);
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
                  />
                ))}
                {selectedIds.length > 0 && !isExporting && isActive && (
                  <Transformer
                    ref={trRef}
                    rotateEnabled={true}
                    enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right']}
                    anchorSize={12}
                    anchorCornerRadius={3}
                    anchorStroke="#000"
                    anchorFill="#fff"
                    borderStroke="#000"
                    borderDash={[3, 3]}
                    boundBoxFunc={(oldBox, newBox) => {
                      if (newBox.width < 5 || newBox.height < 5) return oldBox;
                      return newBox;
                    }}
                  />
                )}
              </React.Fragment>
            )}
          </Layer>
        </Stage>
      )}
    </div>
  );
}
