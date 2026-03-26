import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Plus, 
  Download, 
  Type, 
  Trash2, 
  Image as ImageIcon, 
  RotateCcw,
  Settings2,
  FileText,
  Layout,
  Eye,
  EyeOff,
  ChevronDown,
  ImagePlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import { TextBlock, HANDWRITING_FONTS, INK_COLORS, Margins, Boundary, Point } from './types';
import { useDebounce } from './hooks/useDebounce';

export default function App() {
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkText, setBulkText] = useState('');
  const [margins, setMargins] = useState<Margins>({ top: 80, bottom: 80, left: 80, right: 80 });
  const [showMargins, setShowMargins] = useState(true);
  const [moveMode, setMoveMode] = useState<'single' | 'all' | 'words'>('single');
  const [pages, setPages] = useState<TextBlock[][]>([]);
  const [boundary, setBoundary] = useState<Boundary | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isLayoutLoading, setIsLayoutLoading] = useState(false);
  const [activePageIndex, setActivePageIndex] = useState<number | null>(null);
  const [layoutTemplate, setLayoutTemplate] = useState<Partial<TextBlock>>({
    fontSize: 96,
    fontFamily: 'cursive_real',
    fill: '#000066',
    lineHeight: 1.2,
    letterSpacing: 0,
    wordSpacing: 0,
    opacity: 0.8,
    align: 'left',
  });
  
  const debouncedBulkText = useDebounce(bulkText, 300);
  const debouncedMargins = useDebounce(margins, 200);
  const debouncedBoundary = useDebounce(boundary, 200);
  
  const stageRefs = useRef<any[]>([]);

  const [isExporting, setIsExporting] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exportResolution, setExportResolution] = useState<'low' | 'normal' | 'high'>('normal');
  const [isRealisticMode, setIsRealisticMode] = useState(false);
  const [isCharVariance, setIsCharVariance] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
        setBackgroundImage(imageUrl);
        
        // Initialize boundary based on fixed internal width (3000px for high quality)
        const w = 3000;
        const scale = w / img.width;
        const h = img.height * scale;
        
        setBoundary({
          topLeft: { x: w * 0.1, y: h * 0.1 },
          topRight: { x: w * 0.9, y: h * 0.1 },
          bottomLeft: { x: w * 0.1, y: h * 0.9 },
          bottomRight: { x: w * 0.9, y: h * 0.9 }
        });
        setIsCalibrating(true);
      };
      img.onerror = () => {
        console.error("Failed to load image");
        alert("Failed to load image. Please try another file.");
      };
      img.src = imageUrl;
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false,
    noClick: !!backgroundImage,
    noKeyboard: true
  });

  const addTextBlock = () => {
    const newBlock: TextBlock = {
      id: Math.random().toString(36).substr(2, 9),
      text: 'Write something here...',
      x: 50,
      y: 50,
      fontSize: 96,
      fontFamily: 'cursive_real',
      fill: '#000066',
      rotation: 0,
      width: 1000,
      lineHeight: 1.2,
      letterSpacing: 0,
      wordSpacing: 0,
      opacity: 0.8,
      align: 'left',
    };
    setTextBlocks([...textBlocks, newBlock]);
    setSelectedIds([newBlock.id]);
  };

  const deleteSelected = () => {
    if (selectedIds.length > 0) {
      setTextBlocks(textBlocks.filter(b => !selectedIds.includes(b.id)));
      setPages(pages.map(page => page.filter(b => !selectedIds.includes(b.id))));
      setSelectedIds([]);
    }
  };

  const selectedBlocks = useMemo(() => {
    const allBlocks = [...pages.flat(), ...textBlocks];
    return allBlocks.filter(b => selectedIds.includes(b.id));
  }, [pages, textBlocks, selectedIds]);

  const updateSelected = (updates: Partial<TextBlock>) => {
    if (moveMode === 'all') {
      // Update the global layout template so changes are preserved across modes
      setLayoutTemplate(prev => ({ ...prev, ...updates }));
      
      // Apply updates to ALL blocks on ALL pages and the template blocks
      const updatedPages = pages.map(page => page.map(b => ({ ...b, ...updates })));
      const updatedTextBlocks = textBlocks.map(b => ({ ...b, ...updates }));
      
      setPages(updatedPages);
      setTextBlocks(updatedTextBlocks);
    } else if (selectedIds.length > 0) {
      // Update both textBlocks and pages
      setTextBlocks(prev => prev.map(b => selectedIds.includes(b.id) ? { ...b, ...updates } : b));
      setPages(prev => prev.map(page => page.map(b => selectedIds.includes(b.id) ? { ...b, ...updates } : b)));
    }
  };

  const resetBoundary = () => {
    if (!backgroundImage || imageDimensions.width === 0) return;
    
    const w = 3000;
    const scale = w / imageDimensions.width;
    const h = imageDimensions.height * scale;
    
    setBoundary({
      topLeft: { x: w * 0.1, y: h * 0.1 },
      topRight: { x: w * 0.9, y: h * 0.1 },
      bottomLeft: { x: w * 0.1, y: h * 0.9 },
      bottomRight: { x: w * 0.9, y: h * 0.9 }
    });
    setIsCalibrating(true);
  };

  const downloadAsImage = async () => {
    setIsExporting(true);
    setIsExportMenuOpen(false);
    // Wait for render to hide UI elements
    setTimeout(async () => {
      const stagesToDownload = pages.length > 0 ? stageRefs.current.slice(0, pages.length) : [stageRefs.current[0]];
      for (let i = 0; i < stagesToDownload.length; i++) {
        const stage = stagesToDownload[i];
        if (stage) {
          const stageWidth = stage.width();
          // Low: 1024px, Normal: 1600px, High: 2400px
          const targetWidth = exportResolution === 'low' ? 1024 : exportResolution === 'normal' ? 1600 : 2400;
          const pixelRatio = Math.max(1, targetWidth / stageWidth);
          
          // Use JPEG with quality to keep file size under 2MB
          const uri = stage.toDataURL({ 
            pixelRatio,
            mimeType: 'image/jpeg',
            quality: 0.85
          });
          
          const link = document.createElement('a');
          link.download = `handwritten-page-${i + 1}.jpg`;
          link.href = uri;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      setIsExporting(false);
    }, 100);
  };

  const downloadAsPDF = async () => {
    const { jsPDF } = await import('jspdf');
    setIsExporting(true);
    setIsExportMenuOpen(false);
    
    setTimeout(async () => {
      const stagesToDownload = pages.length > 0 ? stageRefs.current.slice(0, pages.length) : [stageRefs.current[0]];
      
      // Target dimensions based on resolution
      const targetWidth = exportResolution === 'low' ? 1024 : exportResolution === 'normal' ? 1600 : 2400;
      const scaleFactor = targetWidth / 3000; // 3000 is INTERNAL_WIDTH
      const pdfWidth = imageDimensions.width * scaleFactor;
      const pdfHeight = imageDimensions.height * scaleFactor;

      const pdf = new jsPDF({
        orientation: imageDimensions.width > imageDimensions.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [pdfWidth, pdfHeight]
      });

      for (let i = 0; i < stagesToDownload.length; i++) {
        const stage = stagesToDownload[i];
        if (stage) {
          const stageWidth = stage.width();
          const pixelRatio = Math.max(1, targetWidth / stageWidth);
          
          // Use JPEG for PDF as well to keep size down
          const uri = stage.toDataURL({ 
            pixelRatio,
            mimeType: 'image/jpeg',
            quality: 0.8
          });
          
          if (i > 0) pdf.addPage([pdfWidth, pdfHeight]);
          pdf.addImage(uri, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        }
      }
      
      pdf.save('handwritten-document.pdf');
      setIsExporting(false);
    }, 100);
  };

  const effectiveSelectedBlock = useMemo(() => {
    if (moveMode === 'all') {
      return {
        id: 'template',
        text: '',
        x: 0, y: 0, 
        fontSize: 96, 
        fontFamily: 'cursive_real', 
        fill: '#000066', 
        rotation: 0, 
        width: 800,
        ...layoutTemplate
      } as TextBlock;
    }
    
    return selectedBlocks[0] || (textBlocks.length === 0 && pages.length === 0 ? { 
        id: 'template', text: '', x: 0, y: 0, fontSize: 96, fontFamily: 'cursive_real', fill: '#000066', rotation: 0, width: 800,
        ...layoutTemplate 
      } as TextBlock : null);
  }, [moveMode, selectedBlocks, textBlocks, pages, layoutTemplate]);

  // Auto-layout logic
  useEffect(() => {
    if (!debouncedBulkText || !backgroundImage || imageDimensions.width === 0 || !debouncedBoundary) {
      setPages([]);
      return;
    }

    const generatePages = async () => {
      setIsLayoutLoading(true);
      
      try {
        const template = {
          fontSize: 96,
          fontFamily: 'cursive_real',
          fill: '#000066',
          lineHeight: 1.2,
          letterSpacing: 0,
          wordSpacing: 0,
          opacity: 0.8,
          align: 'left',
          ...layoutTemplate
        };

        // Ensure font is loaded before measuring
        try {
          await document.fonts.load(`${template.fontSize}px "${template.fontFamily}"`);
        } catch (e) {
          console.warn('Font loading failed, proceeding with fallback', e);
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.font = `${template.fontSize}px "${template.fontFamily}"`;
        
        const paragraphs = debouncedBulkText.split('\n');
        const lineHeightPx = template.fontSize * (template.lineHeight || 1.2);
        
        // Calculate average height of the boundary
        const boundaryHeight = ((debouncedBoundary.bottomLeft.y - debouncedBoundary.topLeft.y) + (debouncedBoundary.bottomRight.y - debouncedBoundary.topRight.y)) / 2;
        const padding = 10;
        const usableHeight = boundaryHeight - (padding * 2);
        
        let currentY = 0;
        let currentPageBlocks: TextBlock[] = [];
        const allPages: TextBlock[][] = [];

        const getLineInfoAtY = (y: number) => {
          const t = y / boundaryHeight;
          const leftX = debouncedBoundary.topLeft.x + (debouncedBoundary.bottomLeft.x - debouncedBoundary.topLeft.x) * t + padding;
          const rightX = debouncedBoundary.topRight.x + (debouncedBoundary.bottomRight.x - debouncedBoundary.topRight.x) * t - padding;
          const startY = debouncedBoundary.topLeft.y + (debouncedBoundary.bottomLeft.y - debouncedBoundary.topLeft.y) * t + padding;
          return { leftX, width: Math.max(0, rightX - leftX), startY };
        };

        const spaceWidth = ctx.measureText(' ').width + (template.letterSpacing || 0) + (template.wordSpacing || 0);

        for (const para of paragraphs) {
          if (para.trim() === '') {
            currentY += lineHeightPx;
            if (currentY + lineHeightPx > usableHeight) {
              allPages.push(currentPageBlocks);
              currentPageBlocks = [];
              currentY = 0;
            }
            continue;
          }

          const words = para.split(/\s+/);
          let currentLine = '';

          for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const testLine = currentLine ? currentLine + ' ' + word : word;
            const metrics = ctx.measureText(testLine);
            const letterSpacingAdjustment = testLine.length * (template.letterSpacing || 0);
            const { width: availableWidth } = getLineInfoAtY(currentY);
            
            if (metrics.width + letterSpacingAdjustment > availableWidth && currentLine) {
              const { leftX, startY, width: lineWidthAtY } = getLineInfoAtY(currentY);
              
              if (moveMode === 'words') {
                const wordsInLine = currentLine.split(' ');
                let wordX = leftX;
                const actualLineWidth = ctx.measureText(currentLine).width + (currentLine.length * (template.letterSpacing || 0));
                
                if (template.align === 'center') wordX += (lineWidthAtY - actualLineWidth) / 2;
                else if (template.align === 'right') wordX += (lineWidthAtY - actualLineWidth);

                wordsInLine.forEach((w) => {
                  const wWidth = ctx.measureText(w).width + (w.length * (template.letterSpacing || 0));
                  currentPageBlocks.push({
                    ...template,
                    id: `page-${allPages.length}-word-${currentPageBlocks.length}`,
                    text: w,
                    x: wordX,
                    y: startY,
                    width: wWidth,
                    rotation: 0,
                  } as TextBlock);
                  wordX += wWidth + spaceWidth;
                });
              } else {
                const actualLineWidth = ctx.measureText(currentLine).width + (currentLine.length * (template.letterSpacing || 0));
                let lineX = leftX;
                if (template.align === 'center') lineX += (lineWidthAtY - actualLineWidth) / 2;
                else if (template.align === 'right') lineX += (lineWidthAtY - actualLineWidth);

                currentPageBlocks.push({
                  ...template,
                  id: `page-${allPages.length}-line-${currentPageBlocks.length}`,
                  text: currentLine,
                  x: lineX,
                  y: startY,
                  width: actualLineWidth,
                  rotation: 0,
                } as TextBlock);
              }
              
              currentY += lineHeightPx;
              if (currentY + lineHeightPx > usableHeight) {
                allPages.push(currentPageBlocks);
                currentPageBlocks = [];
                currentY = 0;
              }
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }

          if (currentLine) {
            const { leftX, startY, width: lineWidthAtY } = getLineInfoAtY(currentY);
            
            if (moveMode === 'words') {
              const wordsInLine = currentLine.split(' ');
              let wordX = leftX;
              const actualLineWidth = ctx.measureText(currentLine).width + (currentLine.length * (template.letterSpacing || 0));
              
              if (template.align === 'center') wordX += (lineWidthAtY - actualLineWidth) / 2;
              else if (template.align === 'right') wordX += (lineWidthAtY - actualLineWidth);

              wordsInLine.forEach((w) => {
                const wWidth = ctx.measureText(w).width + (w.length * (template.letterSpacing || 0));
                currentPageBlocks.push({
                  ...template,
                  id: `page-${allPages.length}-word-${currentPageBlocks.length}`,
                  text: w,
                  x: wordX,
                  y: startY,
                  width: wWidth,
                  rotation: 0,
                } as TextBlock);
                wordX += wWidth + spaceWidth;
              });
            } else {
              const actualLineWidth = ctx.measureText(currentLine).width + (currentLine.length * (template.letterSpacing || 0));
              let lineX = leftX;
              if (template.align === 'center') lineX += (lineWidthAtY - actualLineWidth) / 2;
              else if (template.align === 'right') lineX += (lineWidthAtY - actualLineWidth);

              currentPageBlocks.push({
                ...template,
                id: `page-${allPages.length}-line-${currentPageBlocks.length}`,
                text: currentLine,
                x: lineX,
                y: startY,
                width: actualLineWidth,
                rotation: 0,
              } as TextBlock);
            }
            currentY += lineHeightPx;
          }

          if (currentY + lineHeightPx > usableHeight) {
            allPages.push(currentPageBlocks);
            currentPageBlocks = [];
            currentY = 0;
          }
        }

        if (currentPageBlocks.length > 0) {
          allPages.push(currentPageBlocks);
        }
        
        setPages(allPages);
      } catch (err) {
        console.error('Error generating pages:', err);
      } finally {
        setIsLayoutLoading(false);
      }
    };

    generatePages();
  }, [debouncedBulkText, debouncedBoundary, backgroundImage, imageDimensions, layoutTemplate, moveMode === 'words']);

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
      {/* Font Preloader */}
      <div className="opacity-0 fixed -z-50 pointer-events-none" aria-hidden="true">
        {HANDWRITING_FONTS.map(font => (
          <span key={font.value} style={{ fontFamily: font.value }}>preloader</span>
        ))}
      </div>

      {/* Calibration Overlay */}
      <AnimatePresence>
        {isCalibrating && backgroundImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-zinc-900/95 backdrop-blur-md flex flex-col items-center justify-center p-2 md:p-6"
          >
            <div className="w-full max-w-6xl flex flex-col gap-3 h-full max-h-[95vh]">
              <div className="flex items-center justify-between text-white px-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg hidden sm:block">
                    <Layout size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm md:text-base font-bold leading-tight">Calibrate Page Boundary</h2>
                    <p className="text-[9px] md:text-xs text-zinc-400">Drag the red circles to the corners of the writing area.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={resetBoundary}
                    className="p-2 md:px-4 md:py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-bold transition-all flex items-center gap-2 text-zinc-300"
                    title="Reset Dots"
                  >
                    <RotateCcw size={14} />
                    <span className="hidden md:inline">Reset</span>
                  </button>
                  <button 
                    onClick={() => setIsCalibrating(false)}
                    className="px-4 md:px-6 py-1.5 md:py-2 bg-white text-zinc-900 rounded-lg text-xs font-bold hover:bg-zinc-100 transition-all shadow-lg"
                  >
                    Done
                  </button>
                </div>
              </div>
              
              <div className="flex-1 min-h-0 bg-zinc-800 rounded-2xl overflow-hidden relative border border-zinc-700 shadow-2xl flex items-center justify-center">
                <Canvas 
                  backgroundImage={backgroundImage}
                  textBlocks={[]}
                  selectedIds={[]}
                  isRealistic={isRealisticMode}
                  onSelect={() => {}}
                  onChange={() => {}}
                  stageRef={() => {}}
                  margins={margins}
                  showMargins={false}
                  boundary={boundary}
                  onBoundaryChange={setBoundary}
                  isCalibrating={true}
                  moveMode="single"
                  isExporting={isExporting}
                  isActive={true}
                />
              </div>

              <div className="grid grid-cols-4 gap-2 md:gap-4 text-zinc-500 text-[8px] md:text-[10px] uppercase font-bold tracking-widest text-center px-2">
                <div className="bg-zinc-800/50 py-1.5 md:py-2 rounded-lg border border-zinc-700/50">Top Left</div>
                <div className="bg-zinc-800/50 py-1.5 md:py-2 rounded-lg border border-zinc-700/50">Top Right</div>
                <div className="bg-zinc-800/50 py-1.5 md:py-2 rounded-lg border border-zinc-700/50">Bottom Left</div>
                <div className="bg-zinc-800/50 py-1.5 md:py-2 rounded-lg border border-zinc-700/50">Bottom Right</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Top Bar Container */}
      <div className="sticky top-0 z-50 bg-white shadow-sm">
        {/* Header */}
        <header className="bg-white border-b border-zinc-200 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between relative z-20">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-zinc-900 rounded-lg flex items-center justify-center text-white">
              <Type size={20} className="md:hidden" />
              <Type size={24} className="hidden md:block" />
            </div>
            <div>
              <h1 className="font-bold text-base md:text-lg tracking-tight">Handify.ai</h1>
              <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider hidden sm:block">Realistic Handwriting Tool</p>
            </div>
          </div>
          
            <div className="flex gap-2">
              <div className="relative">
                <button 
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  className="px-3 md:px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-bold hover:bg-zinc-800 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                  disabled={isExporting || !backgroundImage || (bulkText && pages.length === 0)}
                >
                  <Download size={18} />
                  {isExporting ? 'Processing...' : (pages.length > 0 ? `Export ${pages.length}` : 'Export')}
                  <ChevronDown size={16} className={`transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isExportMenuOpen && (
                    <>
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm" 
                        onClick={() => setIsExportMenuOpen(false)}
                      />
                      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
                        <motion.div 
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 20, scale: 0.95 }}
                          className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-zinc-100 overflow-hidden pointer-events-auto"
                        >
                        <div className="p-4 border-b border-zinc-100 bg-zinc-50/50">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-zinc-900">Export Options</h3>
                            <button 
                              onClick={() => setIsExportMenuOpen(false)}
                              className="p-1 hover:bg-zinc-200 rounded-full text-zinc-400 transition-colors"
                            >
                              <Plus size={20} className="rotate-45" />
                            </button>
                          </div>
                          
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Resolution</p>
                          <div className="grid grid-cols-3 gap-1 bg-zinc-200/50 p-1 rounded-xl">
                            {(['low', 'normal', 'high'] as const).map((res) => (
                              <button
                                key={res}
                                onClick={() => setExportResolution(res)}
                                className={`px-2 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${exportResolution === res ? 'bg-white shadow-md text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
                              >
                                {res}
                              </button>
                            ))}
                          </div>
                          <p className="text-[10px] text-zinc-400 mt-2 italic">
                            {exportResolution === 'low' ? 'Fast export, smallest size' : exportResolution === 'normal' ? 'Balanced quality and size' : 'Best quality, optimized < 2MB'}
                          </p>

                          <div className="h-px bg-zinc-100 my-4" />

                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-zinc-900">Realistic Mode</span>
                              <span className="text-[10px] text-zinc-400">Adds natural jitter & photo look</span>
                            </div>
                            <button 
                              onClick={() => setIsRealisticMode(!isRealisticMode)}
                              className={`w-10 h-5 rounded-full transition-all relative ${isRealisticMode ? 'bg-zinc-900' : 'bg-zinc-200'}`}
                            >
                              <motion.div 
                                animate={{ x: isRealisticMode ? 20 : 2 }}
                                className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                              />
                            </button>
                          </div>

                          <div className="flex items-center justify-between mt-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-zinc-900">Character Variance</span>
                              <span className="text-[10px] text-zinc-400">Makes same letters look different</span>
                            </div>
                            <button 
                              onClick={() => setIsCharVariance(!isCharVariance)}
                              className={`w-10 h-5 rounded-full transition-all relative ${isCharVariance ? 'bg-zinc-900' : 'bg-zinc-200'}`}
                            >
                              <motion.div 
                                animate={{ x: isCharVariance ? 20 : 2 }}
                                className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                              />
                            </button>
                          </div>
                        </div>
                        <div className="p-2">
                          <button 
                            onClick={downloadAsImage}
                            className="w-full px-4 py-4 text-left text-sm hover:bg-zinc-50 flex items-center gap-4 text-zinc-700 font-bold border-none bg-transparent cursor-pointer rounded-xl transition-colors"
                          >
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                              <ImagePlus size={20} />
                            </div>
                            <div className="flex flex-col">
                              <span>Download as Image</span>
                              <span className="text-[10px] font-medium text-zinc-400">High-quality JPEG format</span>
                            </div>
                          </button>
                          <button 
                            onClick={downloadAsPDF}
                            className="w-full px-4 py-4 text-left text-sm hover:bg-zinc-50 flex items-center gap-4 text-zinc-700 font-bold border-none bg-transparent cursor-pointer rounded-xl transition-colors"
                          >
                            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                              <FileText size={20} />
                            </div>
                            <div className="flex flex-col">
                              <span>Download as PDF</span>
                              <span className="text-[10px] font-medium text-zinc-400">Multi-page document</span>
                            </div>
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  </>
                )}
              </AnimatePresence>
              </div>
              <button 
                onClick={() => {
                  setBackgroundImage(null);
                  setTextBlocks([]);
                  setSelectedIds([]);
                  setBulkText('');
                  setPages([]);
                }}
                className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-600 transition-colors"
                title="Reset"
              >
                <RotateCcw size={18} />
              </button>
            </div>
        </header>

        <Toolbar 
          selectedBlock={effectiveSelectedBlock || null} 
          updateSelected={updateSelected} 
          moveMode={moveMode}
          setMoveMode={(mode) => {
            setMoveMode(mode);
            setSelectedIds([]); // Clear selection when mode changes as IDs will likely change
          }}
          isLoading={isLayoutLoading}
          className="relative z-10"
        />
      </div>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Layout Loading Overlay */}
        <AnimatePresence>
          {isLayoutLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[60] bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-4"
            >
              <div className="w-12 h-12 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
              <div className="flex flex-col items-center">
                <p className="text-zinc-900 font-bold text-sm">Applying Font Layout</p>
                <p className="text-zinc-500 text-xs">Measuring text for boundary alignment...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Left: Canvas Area */}
        <div 
          className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col items-center gap-6 md:gap-8" 
          {...getRootProps()}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActivePageIndex(null);
              setSelectedIds([]);
            }
          }}
        >
          <input {...getInputProps()} />
          
          {pages.length > 0 ? (
            pages.map((pageBlocks, idx) => (
              <div key={idx} className="w-full max-w-4xl canvas-container">
                <div className="mb-2 flex justify-between items-center px-4">
                  <span className="text-xs font-bold text-zinc-400 uppercase">Page {idx + 1}</span>
                </div>
                <Canvas 
                  backgroundImage={backgroundImage}
                  textBlocks={pageBlocks}
                  selectedIds={selectedIds}
                  isRealistic={isRealisticMode}
                  isCharVariance={isCharVariance}
                  onSelect={(id, multi) => {
                    if (!id) {
                      setSelectedIds([]);
                      return;
                    }
                    if (multi) {
                      setSelectedIds(prev => 
                        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
                      );
                    } else {
                      setSelectedIds([id]);
                    }
                  }}
                  onChange={(newBlocks) => {
                    const newPages = [...pages];
                    newPages[idx] = newBlocks;
                    setPages(newPages);
                  }}
                  stageRef={(el: any) => stageRefs.current[idx] = el}
                  margins={margins}
                  showMargins={showMargins}
                  boundary={boundary}
                  onBoundaryChange={setBoundary}
                  isCalibrating={isCalibrating}
                  moveMode={moveMode}
                  isExporting={isExporting}
                  isActive={activePageIndex === idx}
                  onActivate={() => setActivePageIndex(idx)}
                />
              </div>
            ))
          ) : (
              <div className="w-full max-w-4xl canvas-container">
                <Canvas 
                  backgroundImage={backgroundImage}
                  textBlocks={textBlocks}
                  selectedIds={selectedIds}
                  isRealistic={isRealisticMode}
                  onSelect={(id, multi) => {
                    if (!id) {
                      setSelectedIds([]);
                      return;
                    }
                    if (multi) {
                      setSelectedIds(prev => 
                        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
                      );
                    } else {
                      setSelectedIds([id]);
                    }
                  }}
                  onChange={setTextBlocks}
                  stageRef={(el: any) => stageRefs.current[0] = el}
                  margins={margins}
                  showMargins={showMargins}
                  boundary={boundary}
                  onBoundaryChange={setBoundary}
                  isCalibrating={isCalibrating}
                  moveMode={moveMode}
                  isExporting={isExporting}
                  isActive={activePageIndex === 0}
                  onActivate={() => setActivePageIndex(0)}
                />
              </div>
            )}
          
          {!backgroundImage && (
            <div className={`w-full max-w-4xl border-2 border-dashed rounded-2xl p-12 text-center transition-all ${isDragActive ? 'border-zinc-900 bg-zinc-100' : 'border-zinc-200 bg-white'}`}>
              <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-400">
                <ImageIcon size={32} />
              </div>
              <h3 className="text-lg font-semibold mb-2">Upload your page photo</h3>
              <p className="text-zinc-500 mb-6 max-w-xs mx-auto">Take a photo of a notebook page or a blank sheet and drop it here.</p>
              <button 
                onClick={open}
                className="bg-white border border-zinc-200 px-6 py-2 rounded-xl font-medium hover:bg-zinc-50 transition-all shadow-sm"
              >
                Select Photo
              </button>
            </div>
          )}
        </div>

        {/* Right: Sidebar Controls */}
        <aside className="w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l border-zinc-200 p-4 md:p-6 overflow-y-auto">
          <div className="space-y-6 md:space-y-8">
            {/* Mode Controls */}
            <div className="space-y-4">
              {backgroundImage && (
                <div className="grid grid-cols-1 gap-2">
                  <button 
                    onClick={() => setIsCalibrating(true)}
                    className="flex items-center justify-center gap-2 py-3 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
                  >
                    <Layout size={16} />
                    <span>Calibrate Page Boundary</span>
                  </button>
                  <button 
                    onClick={open}
                    className="flex items-center justify-center gap-2 py-3 bg-white border border-zinc-200 text-zinc-900 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-all shadow-sm"
                  >
                    <ImagePlus size={16} />
                    <span>Change Background</span>
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4 md:space-y-6">
              {/* Bulk Text Input */}
              <div className="space-y-2">
                <label className="text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-wider">Bulk Content</label>
                <textarea 
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none min-h-[120px] md:min-h-[200px] text-sm"
                  placeholder="Paste your long text here..."
                />
              </div>

              <div className="h-px bg-zinc-100" />

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                <button 
                  onClick={addTextBlock}
                  disabled={!backgroundImage}
                  className="flex items-center justify-center gap-2 bg-zinc-900 text-white p-2.5 md:p-3 rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all disabled:opacity-50"
                >
                  <Plus size={18} />
                  <span>Add Text</span>
                </button>
                <button 
                  onClick={deleteSelected}
                  disabled={selectedIds.length === 0}
                  className="flex items-center justify-center gap-2 bg-zinc-100 text-zinc-600 p-2.5 md:p-3 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-all disabled:opacity-50"
                >
                  <Trash2 size={18} />
                  <span>Delete</span>
                </button>
              </div>

              <AnimatePresence mode="wait">
                {(selectedIds.length > 0 || moveMode === 'all') && effectiveSelectedBlock ? (
                  <motion.div 
                    key="controls"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="space-y-6"
                  >
                    <div className="h-px bg-zinc-100" />
                    
                    {/* Text Input */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Content</label>
                      <textarea 
                        value={effectiveSelectedBlock.text}
                        onChange={(e) => updateSelected({ text: e.target.value })}
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none min-h-[150px] text-sm"
                        placeholder="Type your handwritten text..."
                      />
                      {selectedIds.length > 1 && (
                        <p className="text-[10px] text-zinc-400 italic">Editing {selectedIds.length} blocks simultaneously</p>
                      )}
                    </div>

                    <div className="h-px bg-zinc-100" />

                    {/* Rotation Slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tilt / Rotation</label>
                        <span className="text-xs font-mono text-zinc-500">{Math.round(effectiveSelectedBlock.rotation)}°</span>
                      </div>
                      <input 
                        type="range" 
                        min="-45" 
                        max="45" 
                        value={effectiveSelectedBlock.rotation}
                        onChange={(e) => updateSelected({ rotation: parseInt(e.target.value) })}
                        className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-zinc-900"
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-3 text-zinc-300">
                      <Type size={20} />
                    </div>
                    <p className="text-sm text-zinc-400 italic">Select a text block to edit its properties</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200 px-6 py-3 flex items-center justify-between text-[10px] text-zinc-400 font-medium uppercase tracking-widest">
        <div className="flex gap-4">
          <span>© 2026 Handify.ai</span>
          <span>Privacy</span>
          <span>Terms</span>
        </div>
        <div className="flex items-center gap-1">
          <span>Built for precision</span>
        </div>
      </footer>
    </div>
  );
}
