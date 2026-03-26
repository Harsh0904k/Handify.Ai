import React from 'react';
import { 
  Type, 
  AlignCenter, 
  AlignLeft, 
  AlignRight, 
  ChevronDown,
  Minus,
  Plus,
  Palette,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TextBlock, HANDWRITING_FONTS, INK_COLORS } from '../types';

interface ToolbarProps {
  selectedBlock: TextBlock | null;
  updateSelected: (updates: Partial<TextBlock>) => void;
  moveMode: 'single' | 'all' | 'words';
  setMoveMode: (mode: 'single' | 'all' | 'words') => void;
  isLoading?: boolean;
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
  unit = "" 
}: { 
  label: string; 
  value: number; 
  min: number; 
  max: number; 
  step: number; 
  onChange: (val: number) => void;
  onReset: () => void;
  unit?: string;
}) => (
  <div className="flex flex-col gap-1 min-w-[100px]">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-mono text-zinc-500">{value.toFixed(1)}{unit}</span>
        <button 
          onClick={onReset}
          className="p-0.5 hover:bg-zinc-100 rounded text-zinc-300 hover:text-zinc-600 transition-colors"
          title={`Reset ${label}`}
        >
          <RotateCcw size={10} />
        </button>
      </div>
    </div>
    <input 
      type="range" min={min} max={max} step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900 hover:accent-zinc-700 transition-all"
    />
  </div>
);

export default function Toolbar({ selectedBlock, updateSelected, moveMode, setMoveMode, isLoading, className }: ToolbarProps) {
  const [activeDropdown, setActiveDropdown] = React.useState<'font' | 'color' | null>(null);

  if (!selectedBlock) return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`min-h-[3rem] h-auto bg-white border-b border-zinc-200 flex flex-wrap items-center px-6 text-zinc-400 text-xs italic justify-between w-full py-2 gap-2 ${className || ''}`}
    >
      <div className="flex items-center gap-2">
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
        ) : (
          <Type size={14} className="text-zinc-300" />
        )}
        <span>{isLoading ? 'Recalculating layout...' : 'Select a text block to enable editing tools'}</span>
      </div>
      <div className="flex items-center gap-2 bg-zinc-50 p-1 rounded-lg border border-zinc-200">
        <button 
          onClick={() => setMoveMode('single')}
          className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${moveMode === 'single' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
        >
          Line
        </button>
        <button 
          onClick={() => setMoveMode('words')}
          className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${moveMode === 'words' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
        >
          Words
        </button>
        <button 
          onClick={() => setMoveMode('all')}
          className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${moveMode === 'all' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
        >
          Page
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className={`min-h-[3.5rem] h-auto bg-white border-b border-zinc-200 flex items-center px-4 gap-3 py-2 shadow-sm relative overflow-x-auto no-scrollbar scroll-smooth ${className || ''}`}>
      {/* Movement Mode Toggle */}
      <div className="flex items-center gap-1 bg-zinc-100 border border-zinc-200 rounded-lg p-1 shrink-0">
        <button 
          onClick={() => setMoveMode('single')}
          className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all min-w-[50px] ${moveMode === 'single' ? 'bg-white shadow-md text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
          title="Move only selected line"
        >
          Line
        </button>
        <button 
          onClick={() => setMoveMode('words')}
          className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all min-w-[50px] ${moveMode === 'words' ? 'bg-white shadow-md text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
          title="Move individual words"
        >
          Words
        </button>
        <button 
          onClick={() => setMoveMode('all')}
          className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all min-w-[50px] ${moveMode === 'all' ? 'bg-white shadow-md text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
          title="Move all lines together"
        >
          Page
        </button>
      </div>

      <div className="w-px h-8 bg-zinc-200 mx-1 shrink-0" />

      {/* Font Family */}
      <div className="relative shrink-0">
        <button 
          onClick={() => setActiveDropdown(activeDropdown === 'font' ? null : 'font')}
          disabled={isLoading}
          className={`flex items-center gap-2 px-3 py-2.5 hover:bg-zinc-50 rounded-lg text-sm font-medium transition-all border border-zinc-200 min-w-[140px] justify-between bg-white shadow-sm ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className="truncate max-w-[100px]" style={{ fontFamily: selectedBlock.fontFamily }}>
            {HANDWRITING_FONTS.find(f => f.value === selectedBlock.fontFamily)?.name || 'Font'}
          </span>
          {isLoading ? (
            <div className="w-3 h-3 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
          ) : (
            <ChevronDown size={14} className={`text-zinc-400 transition-transform ${activeDropdown === 'font' ? 'rotate-180' : ''}`} />
          )}
        </button>
        <AnimatePresence>
          {activeDropdown === 'font' && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setActiveDropdown(null)}
                className="fixed inset-0 z-[110] bg-black/20 backdrop-blur-[2px]"
              />
              <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 pointer-events-none">
                <motion.div 
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  className="w-full max-w-sm bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto max-h-[80vh]"
                >
                  <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
                    <h3 className="font-bold text-zinc-900 text-sm">Select Font</h3>
                    <button 
                      onClick={() => setActiveDropdown(null)}
                      className="p-1 hover:bg-zinc-200 rounded-full text-zinc-400 transition-colors"
                    >
                      <Plus size={20} className="rotate-45" />
                    </button>
                  </div>
                  <div className="overflow-y-auto p-2">
                    {HANDWRITING_FONTS.map(font => (
                      <button
                        key={font.value}
                        onClick={() => {
                          updateSelected({ fontFamily: font.value });
                          setActiveDropdown(null);
                        }}
                        className={`w-full text-left px-4 py-4 rounded-xl hover:bg-zinc-50 text-xl transition-colors flex items-center justify-between mb-1 ${selectedBlock.fontFamily === font.value ? 'bg-zinc-100 text-zinc-900 font-bold' : 'text-zinc-600'}`}
                        style={{ fontFamily: font.value }}
                      >
                        <span>{font.name}</span>
                        {selectedBlock.fontFamily === font.value && <div className="w-2 h-2 bg-zinc-900 rounded-full" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Font Size */}
      <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-lg p-1 shadow-sm shrink-0">
        <button 
          onClick={() => updateSelected({ fontSize: Math.max(8, selectedBlock.fontSize - 2) })}
          className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-zinc-600 min-w-[32px] flex justify-center"
        >
          <Minus size={16} />
        </button>
        <input 
          type="number" 
          value={Math.round(selectedBlock.fontSize)}
          onChange={(e) => updateSelected({ fontSize: parseInt(e.target.value) || 12 })}
          className="w-10 text-center bg-transparent text-sm font-bold focus:outline-none"
        />
        <button 
          onClick={() => updateSelected({ fontSize: Math.min(200, selectedBlock.fontSize + 2) })}
          className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-zinc-600 min-w-[32px] flex justify-center"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="w-px h-8 bg-zinc-200 mx-1 shrink-0" />

      {/* Alignment */}
      <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-lg p-1 shadow-sm shrink-0">
        {[
          { id: 'left', icon: AlignLeft },
          { id: 'center', icon: AlignCenter },
          { id: 'right', icon: AlignRight }
        ].map((item) => (
          <button 
            key={item.id}
            onClick={() => updateSelected({ align: item.id as any })}
            className={`p-2.5 rounded-md transition-all ${selectedBlock.align === item.id || (!selectedBlock.align && item.id === 'left') ? 'bg-white shadow-md text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            <item.icon size={18} />
          </button>
        ))}
      </div>

      <div className="w-px h-8 bg-zinc-200 mx-1 shrink-0" />

      {/* Color Picker */}
      <div className="relative shrink-0">
        <button 
          onClick={() => setActiveDropdown(activeDropdown === 'color' ? null : 'color')}
          className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 rounded-lg transition-all border border-zinc-200 bg-white shadow-sm"
        >
          <div className="w-5 h-5 rounded-full border border-zinc-200 shadow-inner" style={{ backgroundColor: selectedBlock.fill }} />
          <span className="text-sm font-bold text-zinc-700">Ink</span>
          <ChevronDown size={14} className={`text-zinc-400 transition-transform ${activeDropdown === 'color' ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {activeDropdown === 'color' && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setActiveDropdown(null)}
                className="fixed inset-0 z-[110] bg-black/20 backdrop-blur-[2px]"
              />
              <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 pointer-events-none">
                <motion.div 
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  className="w-full max-w-xs bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
                >
                  <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
                    <h3 className="font-bold text-zinc-900 text-sm">Select Ink Color</h3>
                    <button 
                      onClick={() => setActiveDropdown(null)}
                      className="p-1 hover:bg-zinc-200 rounded-full text-zinc-400 transition-colors"
                    >
                      <Plus size={20} className="rotate-45" />
                    </button>
                  </div>
                  <div className="p-4 grid grid-cols-4 gap-4">
                    {INK_COLORS.map(color => (
                      <button
                        key={color.value}
                        onClick={() => {
                          updateSelected({ fill: color.value });
                          setActiveDropdown(null);
                        }}
                        className={`w-full aspect-square rounded-full border-2 transition-all ${selectedBlock.fill === color.value ? 'border-zinc-900 scale-110 shadow-lg' : 'border-transparent hover:border-zinc-200'}`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>
      </div>

      <div className="w-px h-8 bg-zinc-200 mx-1 shrink-0" />

      {/* Spacing Controls */}
      <div className="flex items-center gap-6 px-2 shrink-0">
        <SliderControl 
          label="Line" value={selectedBlock.lineHeight || 1.2} min={0.5} max={3} step={0.1}
          onChange={(val) => updateSelected({ lineHeight: val })}
          onReset={() => updateSelected({ lineHeight: 1.2 })}
        />
        <SliderControl 
          label="Letter" value={selectedBlock.letterSpacing || 0} min={-5} max={20} step={0.5}
          onChange={(val) => updateSelected({ letterSpacing: val })}
          onReset={() => updateSelected({ letterSpacing: 0 })}
        />
        <SliderControl 
          label="Word" value={selectedBlock.wordSpacing || 0} min={0} max={10} step={1}
          onChange={(val) => updateSelected({ wordSpacing: val })}
          onReset={() => updateSelected({ wordSpacing: 0 })}
        />
        <SliderControl 
          label="Tilt" value={selectedBlock.rotation || 0} min={-10} max={10} step={0.5} unit="°"
          onChange={(val) => updateSelected({ rotation: val })}
          onReset={() => updateSelected({ rotation: 0 })}
        />
        <SliderControl 
          label="Opacity" value={selectedBlock.opacity || 1} min={0.1} max={1} step={0.05}
          onChange={(val) => updateSelected({ opacity: val })}
          onReset={() => updateSelected({ opacity: 1 })}
        />
      </div>
    </div>
  );
}
