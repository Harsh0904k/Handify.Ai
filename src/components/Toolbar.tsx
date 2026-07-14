import React from 'react';
import { createPortal } from 'react-dom';
import { 
  Type, 
  AlignCenter, 
  AlignLeft, 
  AlignRight, 
  ChevronDown,
  Minus,
  Plus,
  Palette,
  RotateCcw,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TextBlock, HANDWRITING_FONTS, INK_COLORS } from '../types';

interface ToolbarProps {
  selectedBlock: TextBlock | null;
  updateSelected: (updates: Partial<TextBlock>) => void;
  moveMode: 'single' | 'all' | 'words';
  setMoveMode: (mode: 'single' | 'all' | 'words') => void;
  isLoading?: boolean;
  isFullscreen?: boolean;
  className?: string;
}

const SliderControl = ({ 
  label, 
  value, 
  min, 
  max, 
  step, 
  onChange, 
  onReset,
  unit = "",
  isFullscreen
}: { 
  label: string; 
  value: number; 
  min: number; 
  max: number; 
  step: number; 
  onChange: (val: number) => void;
  onReset: () => void;
  unit?: string;
  isFullscreen?: boolean;
}) => (
  <div className={`flex flex-col gap-1 ${isFullscreen ? 'min-w-[90px]' : 'min-w-[110px]'}`}>
    <div className="flex items-center justify-between">
      <span className="text-[9px] font-bold text-surface-400 uppercase tracking-widest">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-[9px] font-mono font-bold text-surface-600 bg-surface-50 px-1 py-0.5 rounded border border-surface-100">{value.toFixed(1)}{unit}</span>
        <button 
          onClick={onReset}
          className="p-0.5 hover:bg-surface-100 rounded-md text-surface-300 hover:text-brand-600 transition-colors"
          title={`Reset ${label}`}
        >
          <RotateCcw size={8} />
        </button>
      </div>
    </div>
    <input 
      type="range" min={min} max={max} step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      className={`w-full h-3 sm:h-1.5 bg-surface-100 rounded-lg appearance-none cursor-pointer accent-[#2563eb] hover:accent-[#1d4ed8] transition-all touch-none`}
    />
  </div>
);

export default function Toolbar({ selectedBlock, updateSelected, moveMode, setMoveMode, isLoading, isFullscreen, className }: ToolbarProps) {
  const [activeDropdown, setActiveDropdown] = React.useState<'font' | 'secondaryFont' | 'color' | null>(null);
  const [isMobile, setIsMobile] = React.useState(false);
  const fontButtonRef = React.useRef<HTMLButtonElement>(null);
  const secondaryFontButtonRef = React.useRef<HTMLButtonElement>(null);
  const colorButtonRef = React.useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = React.useState({ top: 0, left: 0 });

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const updateDropdownPos = (ref: React.RefObject<HTMLButtonElement | null>) => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 8, left: rect.left });
    }
  };

  React.useEffect(() => {
    if (activeDropdown === 'font') updateDropdownPos(fontButtonRef);
    if (activeDropdown === 'secondaryFont') updateDropdownPos(secondaryFontButtonRef);
    if (activeDropdown === 'color') updateDropdownPos(colorButtonRef);
  }, [activeDropdown]);

  if (!selectedBlock) return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`min-h-[3.5rem] h-auto bg-white/80 backdrop-blur-md border-b border-surface-200 flex flex-wrap items-center px-6 text-surface-400 text-xs italic justify-between w-full py-2 gap-3 ${className || ''}`}
    >
      <div className="flex items-center gap-3">
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-surface-100 border-t-brand-600 rounded-full animate-spin" />
        ) : (
          <div className="p-1.5 bg-surface-50 rounded-lg">
            <Type size={14} className="text-surface-400" />
          </div>
        )}
        <span className="font-medium">{isLoading ? 'Recalculating layout...' : 'Select a text block to enable editing tools'}</span>
      </div>
      <div className="flex items-center gap-1 bg-surface-100 p-1 rounded-xl border border-surface-200 shadow-inner">
        <button 
          onClick={() => setMoveMode('single')}
          className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${moveMode === 'single' ? 'bg-white shadow-sm text-brand-600' : 'text-surface-400 hover:text-surface-600'}`}
        >
          Line
        </button>
        <button 
          onClick={() => setMoveMode('words')}
          className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${moveMode === 'words' ? 'bg-white shadow-sm text-brand-600' : 'text-surface-400 hover:text-surface-600'}`}
        >
          Words
        </button>
        <button 
          onClick={() => setMoveMode('all')}
          className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${moveMode === 'all' ? 'bg-white shadow-sm text-brand-600' : 'text-surface-400 hover:text-surface-600'}`}
        >
          Page
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className={`${isFullscreen ? 'min-h-[3.5rem]' : 'min-h-[4rem]'} h-auto bg-white/80 backdrop-blur-md border-b border-surface-200 shadow-sm relative z-[100] ${className || ''}`}>
      <div className={`flex items-center px-4 ${isFullscreen ? 'gap-3' : 'gap-4'} py-2 overflow-x-auto scroll-smooth w-full h-full`}>
        {/* Movement Mode Toggle */}
        <div className="flex items-center gap-1 bg-surface-100 border border-surface-200 rounded-xl p-1 shrink-0 shadow-inner">
        <button 
          onClick={() => setMoveMode('single')}
          className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all min-w-[60px] ${moveMode === 'single' ? 'bg-white shadow-md text-brand-600' : 'text-surface-500 hover:text-surface-700'}`}
          title="Move only selected line"
        >
          Line
        </button>
        <button 
          onClick={() => setMoveMode('words')}
          className={`${isFullscreen ? 'px-3 py-1.5' : 'px-4 py-2'} rounded-lg text-[10px] font-bold uppercase transition-all min-w-[50px] ${moveMode === 'words' ? 'bg-white shadow-md text-brand-600' : 'text-surface-500 hover:text-surface-700'}`}
          title="Move individual words"
        >
          Words
        </button>
        <button 
          onClick={() => setMoveMode('all')}
          className={`${isFullscreen ? 'px-3 py-1.5' : 'px-4 py-2'} rounded-lg text-[10px] font-bold uppercase transition-all min-w-[50px] ${moveMode === 'all' ? 'bg-white shadow-md text-brand-600' : 'text-surface-500 hover:text-surface-700'}`}
          title="Move all lines together"
        >
          Page
        </button>
      </div>

      <div className={`w-px ${isFullscreen ? 'h-6' : 'h-8'} bg-surface-200 mx-1 shrink-0`} />

      {/* Combined Font Toggle */}
      <div className="flex items-center gap-2 shrink-0">
        <button 
          onClick={() => updateSelected({ isCombinedFont: !selectedBlock.isCombinedFont })}
          className={`flex items-center gap-2 ${isFullscreen ? 'px-3 py-2' : 'px-4 py-3'} rounded-xl text-xs font-bold transition-all border ${selectedBlock.isCombinedFont ? 'bg-brand-50 border-brand-200 text-brand-600 shadow-sm' : 'bg-white border-surface-200 text-surface-600 hover:bg-surface-50'}`}
          title="Combine two fonts for natural variance"
        >
          <Layers size={14} />
          <span>{isFullscreen ? '' : 'Combine'}</span>
        </button>
      </div>

      {/* Font Family */}
      <div className="relative shrink-0">
        <button 
          ref={fontButtonRef}
          onClick={() => setActiveDropdown(activeDropdown === 'font' ? null : 'font')}
          disabled={isLoading}
          className={`flex items-center gap-2 ${isFullscreen ? 'px-3 py-2' : 'px-4 py-3'} hover:bg-surface-50 rounded-xl text-sm font-bold transition-all border border-surface-200 ${isFullscreen ? 'min-w-[130px]' : 'min-w-[160px]'} justify-between bg-white shadow-sm touch-manipulation cursor-pointer ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className={`${isFullscreen ? 'max-w-[90px]' : 'max-w-[110px]'} truncate`} style={{ fontFamily: selectedBlock.fontFamily }}>
            {HANDWRITING_FONTS.find(f => f.value === selectedBlock.fontFamily)?.name || 'Font 1'}
          </span>
          {isLoading ? (
            <div className="w-3 h-3 border-2 border-surface-100 border-t-brand-600 rounded-full animate-spin" />
          ) : (
            <ChevronDown size={14} className={`text-surface-400 transition-transform duration-300 ${activeDropdown === 'font' ? 'rotate-180' : ''}`} />
          )}
        </button>
        {activeDropdown === 'font' && createPortal(
          <AnimatePresence mode="wait">
            {isMobile ? (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setActiveDropdown(null)}
                  className="absolute inset-0 bg-surface-950/20 backdrop-blur-[2px]"
                />
                <motion.div 
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  style={{ willChange: 'transform, opacity' }}
                  className="relative w-full max-w-sm bg-white border border-surface-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] z-10"
                >
                  <div className="p-5 border-b border-surface-100 bg-surface-50/50 flex items-center justify-between">
                    <h3 className="font-bold text-surface-900 text-lg">Select Font 1</h3>
                    <button 
                      onClick={() => setActiveDropdown(null)}
                      className="p-1.5 hover:bg-surface-200 rounded-full text-surface-400 transition-colors"
                    >
                      <Plus size={20} className="rotate-45" />
                    </button>
                  </div>
                  <div className="overflow-y-auto p-3">
                    {HANDWRITING_FONTS.map(font => (
                      <button
                        key={font.value}
                        onClick={() => {
                          updateSelected({ fontFamily: font.value });
                          setActiveDropdown(null);
                        }}
                        className={`w-full text-left px-5 py-5 rounded-2xl hover:bg-surface-50 text-2xl transition-all flex items-center justify-between mb-2 ${selectedBlock.fontFamily === font.value ? 'bg-brand-50 text-brand-700 font-bold shadow-sm' : 'text-surface-600'}`}
                        style={{ fontFamily: font.value }}
                      >
                        <span>{font.name}</span>
                        {selectedBlock.fontFamily === font.value && <div className="w-2.5 h-2.5 bg-brand-600 rounded-full shadow-lg shadow-brand-200" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            ) : (
              <>
                <div className="fixed inset-0 z-[190]" onClick={() => setActiveDropdown(null)} />
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  style={{ top: dropdownPos.top, left: dropdownPos.left }}
                  className="fixed w-64 bg-white border border-surface-200 rounded-2xl shadow-xl z-[200] overflow-hidden flex flex-col max-h-[300px]"
                >
                  <div className="overflow-y-auto p-2">
                    {HANDWRITING_FONTS.map(font => (
                      <button
                        key={font.value}
                        onClick={() => {
                          updateSelected({ fontFamily: font.value });
                          setActiveDropdown(null);
                        }}
                        className={`w-full text-left px-4 py-3 rounded-xl hover:bg-surface-50 text-lg transition-all flex items-center justify-between mb-1 ${selectedBlock.fontFamily === font.value ? 'bg-brand-50 text-brand-700 font-bold' : 'text-surface-600'}`}
                        style={{ fontFamily: font.value }}
                      >
                        <span>{font.name}</span>
                        {selectedBlock.fontFamily === font.value && <div className="w-2 h-2 bg-brand-600 rounded-full" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
      </div>

      {/* Secondary Font Family (only if combined is active) */}
      {selectedBlock.isCombinedFont && (
        <div className="relative shrink-0">
          <button 
            ref={secondaryFontButtonRef}
            onClick={() => setActiveDropdown(activeDropdown === 'secondaryFont' ? null : 'secondaryFont')}
            disabled={isLoading}
            className={`flex items-center gap-2 ${isFullscreen ? 'px-3 py-2' : 'px-4 py-3'} hover:bg-surface-50 rounded-xl text-sm font-bold transition-all border border-brand-200 ${isFullscreen ? 'min-w-[130px]' : 'min-w-[160px]'} justify-between bg-brand-50/30 shadow-sm touch-manipulation cursor-pointer ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className={`${isFullscreen ? 'max-w-[90px]' : 'max-w-[110px]'} truncate`} style={{ fontFamily: selectedBlock.secondaryFontFamily || selectedBlock.fontFamily }}>
              {HANDWRITING_FONTS.find(f => f.value === (selectedBlock.secondaryFontFamily || selectedBlock.fontFamily))?.name || 'Font 2'}
            </span>
            {isLoading ? (
              <div className="w-3 h-3 border-2 border-surface-100 border-t-brand-600 rounded-full animate-spin" />
            ) : (
              <ChevronDown size={14} className={`text-brand-400 transition-transform duration-300 ${activeDropdown === 'secondaryFont' ? 'rotate-180' : ''}`} />
            )}
          </button>
          {activeDropdown === 'secondaryFont' && createPortal(
            <AnimatePresence mode="wait">
              {isMobile ? (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setActiveDropdown(null)}
                    className="absolute inset-0 bg-surface-950/20 backdrop-blur-[2px]"
                  />
                  <motion.div 
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    style={{ willChange: 'transform, opacity' }}
                    className="relative w-full max-w-sm bg-white border border-surface-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] z-10"
                  >
                    <div className="p-5 border-b border-surface-100 bg-surface-50/50 flex items-center justify-between">
                      <h3 className="font-bold text-surface-900 text-lg">Select Font 2</h3>
                      <button 
                        onClick={() => setActiveDropdown(null)}
                        className="p-1.5 hover:bg-surface-200 rounded-full text-surface-400 transition-colors"
                      >
                        <Plus size={20} className="rotate-45" />
                      </button>
                    </div>
                    <div className="overflow-y-auto p-3">
                      {HANDWRITING_FONTS.map(font => (
                        <button
                          key={font.value}
                          onClick={() => {
                            updateSelected({ secondaryFontFamily: font.value });
                            setActiveDropdown(null);
                          }}
                          className={`w-full text-left px-5 py-5 rounded-2xl hover:bg-surface-50 text-2xl transition-all flex items-center justify-between mb-2 ${selectedBlock.secondaryFontFamily === font.value ? 'bg-brand-50 text-brand-700 font-bold shadow-sm' : 'text-surface-600'}`}
                          style={{ fontFamily: font.value }}
                        >
                          <span>{font.name}</span>
                          {selectedBlock.secondaryFontFamily === font.value && <div className="w-2.5 h-2.5 bg-brand-600 rounded-full shadow-lg shadow-brand-200" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </div>
              ) : (
                <>
                  <div className="fixed inset-0 z-[190]" onClick={() => setActiveDropdown(null)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    style={{ top: dropdownPos.top, left: dropdownPos.left }}
                    className="fixed w-64 bg-white border border-surface-200 rounded-2xl shadow-xl z-[200] overflow-hidden flex flex-col max-h-[300px]"
                  >
                    <div className="overflow-y-auto p-2">
                      {HANDWRITING_FONTS.map(font => (
                        <button
                          key={font.value}
                          onClick={() => {
                            updateSelected({ secondaryFontFamily: font.value });
                            setActiveDropdown(null);
                          }}
                          className={`w-full text-left px-4 py-3 rounded-xl hover:bg-surface-50 text-lg transition-all flex items-center justify-between mb-1 ${selectedBlock.secondaryFontFamily === font.value ? 'bg-brand-50 text-brand-700 font-bold' : 'text-surface-600'}`}
                          style={{ fontFamily: font.value }}
                        >
                          <span>{font.name}</span>
                          {selectedBlock.secondaryFontFamily === font.value && <div className="w-2 h-2 bg-brand-600 rounded-full" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>,
            document.body
          )}
        </div>
      )}

      {/* Font Size */}
      <div className={`flex items-center bg-surface-50 border border-surface-200 rounded-xl ${isFullscreen ? 'p-0.5' : 'p-1'} shadow-sm shrink-0`}>
        <button 
          onClick={() => updateSelected({ fontSize: Math.max(8, selectedBlock.fontSize - 2) })}
          className={`${isFullscreen ? 'p-1.5' : 'p-2.5'} hover:bg-white hover:shadow-sm rounded-lg transition-all text-surface-600 ${isFullscreen ? 'min-w-[28px]' : 'min-w-[36px]'} flex justify-center`}
        >
          <Minus size={isFullscreen ? 14 : 16} />
        </button>
        <input 
          type="number" 
          value={Math.round(selectedBlock.fontSize)}
          onChange={(e) => updateSelected({ fontSize: parseInt(e.target.value) || 12 })}
          className={`${isFullscreen ? 'w-10' : 'w-12'} text-center bg-transparent text-sm font-black text-surface-900 focus:outline-none`}
        />
        <button 
          onClick={() => updateSelected({ fontSize: Math.min(200, selectedBlock.fontSize + 2) })}
          className={`${isFullscreen ? 'p-1.5' : 'p-2.5'} hover:bg-white hover:shadow-sm rounded-lg transition-all text-surface-600 ${isFullscreen ? 'min-w-[28px]' : 'min-w-[36px]'} flex justify-center`}
        >
          <Plus size={isFullscreen ? 14 : 16} />
        </button>
      </div>

      <div className={`w-px ${isFullscreen ? 'h-6' : 'h-8'} bg-surface-200 mx-1 shrink-0`} />

      {/* Alignment */}
      <div className={`flex items-center gap-1 bg-surface-50 border border-surface-200 rounded-xl ${isFullscreen ? 'p-0.5' : 'p-1'} shadow-sm shrink-0`}>
        {[
          { id: 'left', icon: AlignLeft },
          { id: 'center', icon: AlignCenter },
          { id: 'right', icon: AlignRight }
        ].map((item) => (
          <button 
            key={item.id}
            onClick={() => updateSelected({ align: item.id as any })}
            className={`${isFullscreen ? 'p-2' : 'p-3'} rounded-lg transition-all ${selectedBlock.align === item.id || (!selectedBlock.align && item.id === 'left') ? 'bg-white shadow-md text-brand-600' : 'text-surface-400 hover:text-surface-600'}`}
          >
            <item.icon size={isFullscreen ? 16 : 18} />
          </button>
        ))}
      </div>

      <div className={`w-px ${isFullscreen ? 'h-6' : 'h-8'} bg-surface-200 mx-1 shrink-0`} />

      {/* Color Picker */}
      <div className="relative shrink-0">
        <button 
          ref={colorButtonRef}
          onClick={() => setActiveDropdown(activeDropdown === 'color' ? null : 'color')}
          className={`flex items-center gap-2 ${isFullscreen ? 'px-3 py-2' : 'px-4 py-3'} hover:bg-surface-50 rounded-xl transition-all border border-surface-200 bg-white shadow-sm touch-manipulation cursor-pointer`}
        >
          <div className={`${isFullscreen ? 'w-4 h-4' : 'w-5 h-5'} rounded-full border border-surface-200 shadow-inner`} style={{ backgroundColor: selectedBlock.fill }} />
          <span className="text-sm font-bold text-surface-700">{isFullscreen ? '' : 'Ink'}</span>
          <ChevronDown size={14} className={`text-surface-400 transition-transform duration-300 ${activeDropdown === 'color' ? 'rotate-180' : ''}`} />
        </button>
        {activeDropdown === 'color' && createPortal(
          <AnimatePresence mode="wait">
            {isMobile ? (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setActiveDropdown(null)}
                  className="absolute inset-0 bg-surface-950/20 backdrop-blur-[2px]"
                />
                <motion.div 
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  style={{ willChange: 'transform, opacity' }}
                  className="relative w-full max-w-xs bg-white border border-surface-200 rounded-3xl shadow-2xl overflow-hidden z-10"
                >
                  <div className="p-5 border-b border-surface-100 bg-surface-50/50 flex items-center justify-between">
                    <h3 className="font-bold text-surface-900 text-lg">Select Ink Color</h3>
                    <button 
                      onClick={() => setActiveDropdown(null)}
                      className="p-1.5 hover:bg-surface-200 rounded-full text-surface-400 transition-colors"
                    >
                      <Plus size={20} className="rotate-45" />
                    </button>
                  </div>
                  <div className="p-6 grid grid-cols-4 gap-5">
                    {INK_COLORS.map(color => (
                      <button
                        key={color.value}
                        onClick={() => {
                          updateSelected({ fill: color.value });
                          setActiveDropdown(null);
                        }}
                        className={`w-full aspect-square rounded-full border-2 transition-all ${selectedBlock.fill === color.value ? 'border-brand-600 scale-125 shadow-xl shadow-brand-100' : 'border-transparent hover:border-surface-200'}`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </motion.div>
              </div>
            ) : (
              <>
                <div className="fixed inset-0 z-[190]" onClick={() => setActiveDropdown(null)} />
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  style={{ top: dropdownPos.top, left: dropdownPos.left }}
                  className="fixed w-48 bg-white border border-surface-200 rounded-2xl shadow-xl z-[200] p-4"
                >
                  <div className="grid grid-cols-4 gap-3">
                    {INK_COLORS.map(color => (
                      <button
                        key={color.value}
                        onClick={() => {
                          updateSelected({ fill: color.value });
                          setActiveDropdown(null);
                        }}
                        className={`w-full aspect-square rounded-full border-2 transition-all ${selectedBlock.fill === color.value ? 'border-brand-600 scale-110 shadow-md' : 'border-transparent hover:border-surface-200'}`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
      </div>

      <div className="w-px h-8 bg-surface-200 mx-1 shrink-0" />

      {/* Spacing Controls */}
      <div className={`flex items-center ${isFullscreen ? 'gap-4' : 'gap-8'} px-4 shrink-0`}>
        <SliderControl 
          label="Line" value={selectedBlock.lineHeight || 1.2} min={0.5} max={3} step={0.1}
          onChange={(val) => updateSelected({ lineHeight: val })}
          onReset={() => updateSelected({ lineHeight: 1.2 })}
          isFullscreen={isFullscreen}
        />
        <SliderControl 
          label="Letter" value={selectedBlock.letterSpacing || 0} min={-5} max={20} step={0.5}
          onChange={(val) => updateSelected({ letterSpacing: val })}
          onReset={() => updateSelected({ letterSpacing: 0 })}
          isFullscreen={isFullscreen}
        />
        <SliderControl 
          label="Word" value={selectedBlock.wordSpacing || 0} min={0} max={10} step={1}
          onChange={(val) => updateSelected({ wordSpacing: val })}
          onReset={() => updateSelected({ wordSpacing: 0 })}
          isFullscreen={isFullscreen}
        />
        <SliderControl 
          label="Tilt" value={selectedBlock.rotation || 0} min={-10} max={10} step={0.5} unit="°"
          onChange={(val) => updateSelected({ rotation: val })}
          onReset={() => updateSelected({ rotation: 0 })}
          isFullscreen={isFullscreen}
        />
        <SliderControl 
          label="Opacity" value={selectedBlock.opacity || 1} min={0.1} max={1} step={0.05}
          onChange={(val) => updateSelected({ opacity: val })}
          onReset={() => updateSelected({ opacity: 1 })}
          isFullscreen={isFullscreen}
        />
        </div>
      </div>
    </div>
  );
}
