import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useDropzone } from 'react-dropzone';
import { logAnalyticsEvent, auth, db } from './firebase';
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
  ImagePlus,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  MessageSquare,
  Star,
  X,
  Loader2,
  HelpCircle,
  Sparkles,
  Monitor,
  Maximize,
  Minimize,
  Check,
  Minus,
  Palette,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast, Toaster } from 'sonner';
import { 
  collection, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut
} from 'firebase/auth';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import { TextBlock, HANDWRITING_FONTS, INK_COLORS, PAGE_BACKGROUNDS, Margins, Boundary, Point } from './types';
import { useDebounce } from './hooks/useDebounce';

// --- Firestore Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
// --------------------------------

function FeedbackSection({ user, onClose }: { user: User | null, onClose: () => void }) {
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [type, setType] = useState<'review' | 'suggestion'>('review');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim() || !email.trim()) return;

    setIsSubmitting(true);
    try {
      const path = 'feedback';
      const feedbackData: any = {
        content: feedback,
        type,
        createdAt: serverTimestamp(),
        email: email,
      };
      
      if (user?.uid) {
        feedbackData.uid = user.uid;
      }

      await addDoc(collection(db, path), feedbackData);
      setFeedback('');
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-white overflow-y-scroll"
    >
      <div className="min-h-full flex flex-col items-center justify-start md:justify-center p-6 md:p-12">
        <button 
          onClick={onClose}
          className="fixed top-6 right-6 md:top-8 md:right-8 p-3 bg-surface-100/80 backdrop-blur-md text-surface-500 rounded-2xl hover:bg-surface-200 transition-all z-[110]"
        >
          <X size={24} />
        </button>

        <div className="max-w-4xl w-full flex flex-col md:flex-row gap-12 items-start py-12 md:py-20">
        <div className="flex-1 space-y-6">
          <div className="w-16 h-16 bg-brand-600 text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-brand-200/50">
            <MessageSquare size={32} />
          </div>
          <div className="space-y-4">
            <h3 className="text-4xl font-bold text-surface-900 tracking-tight">Review & Suggestions</h3>
            <p className="text-lg text-surface-500 leading-relaxed max-w-sm">
              We're constantly evolving. Share your thoughts or suggest features you'd like to see in Handify.ai.
            </p>
          </div>
          
          {!user && (
            <div className="space-y-4">
              <p className="text-xs font-bold text-surface-400 uppercase tracking-widest">Or for convenience</p>
              <button 
                onClick={handleLogin}
                className="flex items-center gap-3 px-8 py-4 bg-white border border-surface-200 rounded-2xl text-base font-bold text-surface-700 hover:bg-surface-50 transition-all shadow-sm"
              >
                <LogIn size={20} />
                Sign in with Google
              </button>
            </div>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="flex-[1.5] w-full space-y-8">
          <div className="flex gap-3 p-2 bg-surface-100 rounded-2xl w-fit">
            {(['review', 'suggestion'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`px-8 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${type === t ? 'bg-white shadow-lg text-brand-600' : 'text-surface-500 hover:text-surface-700'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-surface-400 uppercase tracking-widest ml-1">Your Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address..."
              className="w-full p-5 bg-surface-50 border border-surface-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-base transition-all"
            />
          </div>
          
          <div className="relative group">
            <label className="text-xs font-bold text-surface-400 uppercase tracking-widest ml-1 mb-2 block">Your Message</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              required
              placeholder={type === 'review' ? "What do you think about the app?" : "What features should we add next?"}
              className="w-full p-6 bg-surface-50 border border-surface-200 rounded-3xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none min-h-[200px] text-lg transition-all resize-none group-hover:border-surface-300"
            />
            <AnimatePresence>
              {submitted && (
                <motion.div 
                  initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                  animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white/90 rounded-3xl flex flex-col items-center justify-center text-surface-900 gap-4"
                >
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-green-100"
                  >
                    <Star size={32} fill="currentColor" />
                  </motion.div>
                  <span className="font-bold text-xl">Feedback received! Thank you.</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={isSubmitting || !feedback.trim() || !email.trim()}
              className="px-12 py-5 bg-brand-600 text-white rounded-3xl text-lg font-bold hover:bg-brand-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-2xl shadow-brand-200/50"
            >
              {isSubmitting ? 'Sending...' : 'Submit Feedback'}
            </button>
            
            {user && (
              <div className="flex items-center gap-4">
                <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-full border-2 border-surface-100" referrerPolicy="no-referrer" />
                <button type="button" onClick={() => signOut(auth)} className="text-xs font-bold text-surface-400 hover:text-red-500 uppercase tracking-widest transition-colors">Sign Out</button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
    </motion.div>
  );
}

function HelpSection({ onClose }: { onClose: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-white overflow-y-scroll"
    >
      <div className="min-h-full flex flex-col items-center p-6 md:p-12">
        <button 
          onClick={onClose}
          className="fixed top-6 right-6 md:top-8 md:right-8 p-3 bg-surface-100/80 backdrop-blur-md text-surface-500 rounded-2xl hover:bg-surface-200 transition-all z-[110]"
        >
          <X size={24} />
        </button>

        <div className="max-w-5xl w-full py-12 md:py-20 space-y-20">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-600 rounded-full text-xs font-bold uppercase tracking-widest">
              <HelpCircle size={14} />
              User Guide
            </div>
            <h2 className="text-5xl md:text-7xl font-bold text-surface-900 tracking-tight">Mastering Handify.ai</h2>
            <p className="text-xl text-surface-500 max-w-2xl mx-auto leading-relaxed">
              Everything you need to know to create the most realistic digital handwriting ever.
            </p>
            <div className="mt-8 p-4 bg-brand-50 border border-brand-200 rounded-2xl max-w-2xl mx-auto flex items-center gap-3 text-brand-800">
              <div className="shrink-0 w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-600">
                <Sparkles size={16} />
              </div>
              <p className="text-sm font-medium text-left">
                <strong>Optimized for Mobile:</strong> Handify.ai is fully optimized for touch controls on Android and other mobile browsers!
              </p>
            </div>
          </div>

          {/* Core Workflow */}
          <section className="space-y-10">
            <h3 className="text-3xl font-bold text-surface-900 flex items-center gap-4">
              <span className="w-10 h-10 bg-surface-900 text-white rounded-xl flex items-center justify-center text-lg">01</span>
              The Core Workflow
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-8 bg-surface-50 rounded-[32px] border border-surface-100 space-y-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-brand-600">
                  <ImagePlus size={24} />
                </div>
                <h4 className="text-xl font-bold text-surface-900">1. Upload Paper</h4>
                <p className="text-surface-500 text-sm leading-relaxed">
                  Upload a photo of your notebook or any paper. The app uses this as the canvas to ensure your handwriting looks like it's actually on paper.
                </p>
              </div>
              <div className="p-8 bg-surface-50 rounded-[32px] border border-surface-100 space-y-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-brand-600">
                  <Type size={24} />
                </div>
                <h4 className="text-xl font-bold text-surface-900">2. Input Content</h4>
                <p className="text-surface-500 text-sm leading-relaxed">
                  Paste your text into the bulk editor. We automatically handle line breaks and page overflows based on your margin settings.
                </p>
              </div>
              <div className="p-8 bg-surface-50 rounded-[32px] border border-surface-100 space-y-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-brand-600">
                  <Download size={24} />
                </div>
                <h4 className="text-xl font-bold text-surface-900">3. Export Result</h4>
                <p className="text-surface-500 text-sm leading-relaxed">
                  Download as high-quality JPEG images or a multi-page PDF. Perfect for digital submissions or printing.
                </p>
              </div>
            </div>
          </section>

          {/* Detailed Controls */}
          <section className="space-y-10">
            <h3 className="text-3xl font-bold text-surface-900 flex items-center gap-4">
              <span className="w-10 h-10 bg-surface-900 text-white rounded-xl flex items-center justify-center text-lg">02</span>
              Precision Controls
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="space-y-3">
                  <h4 className="text-xl font-bold text-surface-900">Line & Word Spacing</h4>
                  <p className="text-surface-500 leading-relaxed">
                    Every notebook is different. Use the <strong>Line Height</strong> slider to align text with the lines on your paper. Use <strong>Word Spacing</strong> and <strong>Letter Spacing</strong> to mimic your natural writing rhythm.
                  </p>
                </div>
                <div className="space-y-3">
                  <h4 className="text-xl font-bold text-surface-900">Page Management</h4>
                  <p className="text-surface-500 leading-relaxed">
                    Long text? No problem. The app calculates how much text fits on one page. If it overflows, it creates a <strong>New Page</strong> automatically. You can navigate between pages using the pagination controls at the bottom.
                  </p>
                </div>
                <div className="space-y-3">
                  <h4 className="text-xl font-bold text-surface-900">Margins & Boundaries</h4>
                  <p className="text-surface-500 leading-relaxed">
                    Set the <strong>Top, Bottom, Left, and Right margins</strong> to define the writing area. This ensures text doesn't bleed off the paper or overlap with margins.
                  </p>
                </div>
              </div>
              <div className="space-y-8">
                <div className="space-y-3">
                  <h4 className="text-xl font-bold text-surface-900">Movement Modes</h4>
                  <ul className="space-y-4">
                    <li className="flex gap-4">
                      <div className="font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded text-xs h-fit">Single</div>
                      <p className="text-sm text-surface-500">Move one line at a time for fine adjustments.</p>
                    </li>
                    <li className="flex gap-4">
                      <div className="font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded text-xs h-fit">All</div>
                      <p className="text-sm text-surface-500">Move all lines on the current page together. Best for initial alignment.</p>
                    </li>
                    <li className="flex gap-4">
                      <div className="font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded text-xs h-fit">Words</div>
                      <p className="text-sm text-surface-500">Move individual words horizontally to create natural gaps or fix overlaps.</p>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Advanced Realism */}
          <section className="p-12 bg-surface-900 rounded-[48px] text-white space-y-12">
            <div className="space-y-4">
              <h3 className="text-4xl font-bold tracking-tight">Advanced Realism Features</h3>
              <p className="text-surface-400 text-lg">Go beyond simple fonts with our proprietary realism engine.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-brand-400">
                  <RotateCcw size={24} className="rotate-45" />
                </div>
                <h4 className="text-xl font-bold">Tilt (Rotation)</h4>
                <p className="text-surface-400 text-sm leading-relaxed">
                  Real handwriting isn't perfectly horizontal. Use the <strong>Tilt</strong> slider to add a slight rotation to each line, making it look more natural and less "digital."
                </p>
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-brand-400">
                  <Star size={24} />
                </div>
                <h4 className="text-xl font-bold">Character Variance</h4>
                <p className="text-surface-400 text-sm leading-relaxed">
                  When enabled, this feature subtly varies the size and position of individual characters, mimicking the slight inconsistencies of human writing.
                </p>
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-brand-400">
                  <Eye size={24} />
                </div>
                <h4 className="text-xl font-bold">Realistic Mode</h4>
                <p className="text-surface-400 text-sm leading-relaxed">
                  Our ultimate filter. It adds a subtle "photo" texture, slight blurring, and lighting adjustments to make the final export look like a real photograph of a paper.
                </p>
              </div>
            </div>
          </section>

          <div className="flex flex-col items-center gap-8 py-10 border-t border-surface-100">
            <p className="text-surface-500 font-medium">Ready to create your masterpiece?</p>
            <button 
              onClick={onClose}
              className="px-16 py-6 bg-brand-600 text-white rounded-[32px] font-bold text-xl hover:bg-brand-700 transition-all shadow-2xl shadow-brand-200/50 hover:scale-105 active:scale-95"
            >
              Start Writing Now
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function WelcomeModal({ onOpenHelp, onClose }: { onOpenHelp: () => void, onClose: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-surface-950/60 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-[40px] shadow-2xl max-w-lg w-full overflow-hidden border border-surface-100"
      >
        <div className="p-10 md:p-12 space-y-8 text-center">
          <div className="w-20 h-20 bg-brand-600 text-white rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-brand-200/50">
            <Star size={40} fill="currentColor" />
          </div>
          
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-surface-900 tracking-tight">Welcome to Handify.ai</h2>
            <p className="text-lg text-surface-500 leading-relaxed">
              Transform your digital text into hyper-realistic handwriting on real paper. Ready to start?
            </p>
            <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl flex items-center gap-3 text-brand-800 text-xs font-medium">
              <Sparkles size={14} className="shrink-0 text-brand-600" />
              <p className="text-left"><strong>Optimized for Mobile:</strong> Handify.ai is now fully optimized for Android & iOS mobile browsers!</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <button 
              onClick={onOpenHelp}
              className="w-full py-5 bg-brand-600 text-white rounded-2xl font-bold text-lg hover:bg-brand-700 transition-all shadow-xl shadow-brand-200/30 flex items-center justify-center gap-3"
            >
              <HelpCircle size={24} />
              See the Guide
            </button>
            <button 
              onClick={onClose}
              className="w-full py-5 bg-surface-100 text-surface-600 rounded-2xl font-bold text-lg hover:bg-surface-200 transition-all"
            >
              Skip for now
            </button>
          </div>
          
          <p className="text-[10px] text-surface-400 font-bold uppercase tracking-widest">
            Created with ❤️ by Flosy
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

const SidebarSliderControl = ({ 
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
  <div className="flex flex-col gap-1.5 py-1">
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-mono font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-100">{value.toFixed(1)}{unit}</span>
        <button 
          onClick={onReset}
          className="p-1 hover:bg-surface-100 rounded text-surface-400 hover:text-brand-600 transition-colors"
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
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      className="w-full h-2 bg-surface-100 rounded-lg appearance-none cursor-pointer accent-brand-600"
    />
  </div>
);

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
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
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
  const [blockOverrides, setBlockOverrides] = useState<{[key: string]: Partial<TextBlock>}>({});
  
  const debouncedBulkText = useDebounce(bulkText, 300);
  const debouncedMargins = useDebounce(margins, 200);
  const debouncedBoundary = useDebounce(boundary, 200);
  
  const stageRefs = useRef<any[]>([]);
  const templatesRef = useRef<HTMLDivElement>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exportResolution, setExportResolution] = useState<'low' | 'normal' | 'high'>('normal');
  const [isRealisticMode, setIsRealisticMode] = useState(false);
  const [isCharVariance, setIsCharVariance] = useState(false);
  const [isProcessingRealism, setIsProcessingRealism] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'canvas' | 'text' | 'settings'>('canvas');
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isTemplateLoading, setIsTemplateLoading] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pageOffsets, setPageOffsets] = useState<{[key: number]: Point}>({});
  const prevImageRef = useRef<string | null>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    if (prevImageRef.current && prevImageRef.current !== backgroundImage && prevImageRef.current.startsWith('blob:')) {
      // Small delay before revoking to ensure any components using the old URL have transitioned
      const toRevoke = prevImageRef.current;
      setTimeout(() => {
        URL.revokeObjectURL(toRevoke);
      }, 1000);
    }
    prevImageRef.current = backgroundImage;
  }, [backgroundImage]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    logAnalyticsEvent('app_load');
    
    // Show welcome popup every time for now
    setShowWelcome(true);
  }, []);

  const handleCloseWelcome = () => {
    setShowWelcome(false);
  };

  const handleOpenHelpFromWelcome = () => {
    setShowWelcome(false);
    setIsHelpOpen(true);
  };

  const handleImageLoad = useCallback((url: string, fileName: string = 'image', fileSize: number = 0) => {
    setIsImageLoading(true);
    setIsTemplateLoading(url);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    let retryCount = 0;
    const maxRetries = isMobile ? 3 : 1;

    const loadImage = (currentUrl: string) => {
      const img = new Image();
      if (!currentUrl.startsWith('data:') && !currentUrl.startsWith('blob:')) {
        img.crossOrigin = "anonymous";
      }
      
      const handleLoad = () => {
        setImageDimensions({ width: img.width, height: img.height });
        setBackgroundImage(currentUrl);
        
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
        setIsImageLoading(false);
        setIsTemplateLoading(null);
        toast.success("Background set successfully!");
        
        img.removeEventListener('load', handleLoad);
        img.removeEventListener('error', handleError);
      };

      const handleError = () => {
        if (retryCount < maxRetries) {
          retryCount++;
          console.warn(`Retrying image load (${retryCount}/${maxRetries}) for ${fileName}...`);
          setTimeout(() => loadImage(currentUrl), 800);
          return;
        }

        setIsImageLoading(false);
        setIsTemplateLoading(null);
        if (currentUrl.startsWith('blob:')) {
          URL.revokeObjectURL(currentUrl);
        }
        console.error("Failed to load image:", fileName, fileSize);
        toast.error("Failed to load image. Please try a different template or check your connection.");
        
        img.removeEventListener('load', handleLoad);
        img.removeEventListener('error', handleError);
      };

      img.addEventListener('load', handleLoad);
      img.addEventListener('error', handleError);

      const delay = isMobile ? 300 : 50;
      setTimeout(() => {
        img.src = currentUrl;
        
        if ('decode' in img) {
          (img as any).decode().catch((err: any) => {
            console.warn("Image decode failed, falling back to standard load:", err);
          });
        }
      }, delay);
    };

    loadImage(url);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please upload a valid image file.");
        return;
      }

      // Check file size (20MB limit)
      if (file.size > 20 * 1024 * 1024) {
        toast.error("File is too large. Please upload an image smaller than 20MB.");
        return;
      }

      logAnalyticsEvent('image_upload', {
        file_type: file.type,
        file_size: file.size
      });

      const imageUrl = URL.createObjectURL(file);
      handleImageLoad(imageUrl, file.name, file.size);
    }
  }, [handleImageLoad]);

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
      
      // Update blockOverrides for selected page blocks
      const overridesToUpdate: {[key: string]: Partial<TextBlock>} = {};
      pages.forEach(page => {
        page.forEach(b => {
          if (selectedIds.includes(b.id) && b.paragraphIndex !== undefined && b.lineIndex !== undefined) {
            const key = b.wordIndex !== undefined 
              ? `p${b.paragraphIndex}-l${b.lineIndex}-w${b.wordIndex}` 
              : `p${b.paragraphIndex}-l${b.lineIndex}`;
            overridesToUpdate[key] = {
              ...(blockOverrides[key] || {}),
              ...updates
            };
          }
        });
      });
      if (Object.keys(overridesToUpdate).length > 0) {
        setBlockOverrides(prev => ({ ...prev, ...overridesToUpdate }));
      }

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
    logAnalyticsEvent('download_image', {
      resolution: exportResolution,
      page_count: pages.length || 1,
      realistic_mode: isRealisticMode,
      char_variance: isCharVariance
    });
    setIsExporting(true);
    setIsExportMenuOpen(false);
    // Wait for render to hide UI elements and switch to high-res mode
    setTimeout(async () => {
      const stagesToDownload = pages.length > 0 ? stageRefs.current.slice(0, pages.length) : [stageRefs.current[0]];
      for (let i = 0; i < stagesToDownload.length; i++) {
        const stage = stagesToDownload[i];
        if (stage && stage.width() > 0) {
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
          // Small pause between multiple pages
          if (stagesToDownload.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      }
      // Finalizing phase to let UI settle
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsExporting(false);
    }, 800);
  };

  const downloadAsPDF = async () => {
    logAnalyticsEvent('download_pdf', {
      resolution: exportResolution,
      page_count: pages.length || 1,
      realistic_mode: isRealisticMode,
      char_variance: isCharVariance
    });
    const { jsPDF } = await import('jspdf');
    setIsExporting(true);
    setIsExportMenuOpen(false);
    
    // Wait for render to hide UI elements and switch to high-res mode
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
        if (stage && stage.width() > 0) {
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
      // Finalizing phase to let UI settle
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsExporting(false);
    }, 800);
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      
      if (pages.length > 1) {
        if (e.key === 'ArrowLeft') {
          setCurrentPageIndex(prev => Math.max(0, prev - 1));
        } else if (e.key === 'ArrowRight') {
          setCurrentPageIndex(prev => Math.min(pages.length - 1, prev + 1));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pages.length]);

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

        let paragraphIndex = 0;
        for (const para of paragraphs) {
          if (para.trim() === '') {
            currentY += lineHeightPx;
            if (currentY + lineHeightPx > usableHeight) {
              allPages.push(currentPageBlocks);
              currentPageBlocks = [];
              currentY = 0;
            }
            paragraphIndex++;
            continue;
          }

          const words = para.split(/\s+/);
          let currentLine = '';
          let lineIndexInPara = 0;

          for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const testLine = currentLine ? currentLine + ' ' + word : word;
            const metrics = ctx.measureText(testLine);
            const letterSpacingAdjustment = testLine.length * (template.letterSpacing || 0);
            const { width: availableWidth } = getLineInfoAtY(currentY);
            
            if (metrics.width + letterSpacingAdjustment > availableWidth && currentLine) {
              const { leftX, startY, width: lineWidthAtY } = getLineInfoAtY(currentY);
              
              if (moveMode === 'words') {
                const lineOverride = blockOverrides[`p${paragraphIndex}-l${lineIndexInPara}`] || {};
                const lineMergedTemplate = { ...template, ...lineOverride };
                const actualLineWidth = ctx.measureText(currentLine).width + (currentLine.length * (lineMergedTemplate.letterSpacing || 0));
                
                let lineX = leftX;
                if (lineMergedTemplate.align === 'center') lineX += (lineWidthAtY - actualLineWidth) / 2;
                else if (lineMergedTemplate.align === 'right') lineX += (lineWidthAtY - actualLineWidth);

                let dragDeltaX = 0;
                let dragDeltaY = 0;
                if (lineOverride.x !== undefined) {
                  const defaultLineX = lineX + (pageOffsets[allPages.length]?.x || 0);
                  dragDeltaX = lineOverride.x - defaultLineX;
                }
                if (lineOverride.y !== undefined) {
                  const defaultLineY = startY + (pageOffsets[allPages.length]?.y || 0);
                  dragDeltaY = lineOverride.y - defaultLineY;
                }

                const wordsInLine = currentLine.split(' ');
                let wordX = leftX;
                if (lineMergedTemplate.align === 'center') wordX += (lineWidthAtY - actualLineWidth) / 2;
                else if (lineMergedTemplate.align === 'right') wordX += (lineWidthAtY - actualLineWidth);

                wordsInLine.forEach((w, wIdx) => {
                  const wordOverride = blockOverrides[`p${paragraphIndex}-l${lineIndexInPara}-w${wIdx}`] || {};
                  const mergedWordTemplate = { ...lineMergedTemplate, ...wordOverride };
                  const wWidth = ctx.measureText(w).width + (w.length * (mergedWordTemplate.letterSpacing || 0));
                  
                  const defaultWordX = wordX + dragDeltaX + (pageOffsets[allPages.length]?.x || 0);
                  const defaultWordY = startY + dragDeltaY + (pageOffsets[allPages.length]?.y || 0);

                  currentPageBlocks.push({
                    ...mergedWordTemplate,
                    id: `page-${allPages.length}-word-${currentPageBlocks.length}`,
                    text: w,
                    x: wordOverride.x !== undefined ? wordOverride.x : defaultWordX,
                    y: wordOverride.y !== undefined ? wordOverride.y : defaultWordY,
                    width: wordOverride.width !== undefined ? wordOverride.width : wWidth,
                    rotation: wordOverride.rotation !== undefined ? wordOverride.rotation : (mergedWordTemplate.rotation || 0),
                    paragraphIndex,
                    lineIndex: lineIndexInPara,
                    wordIndex: wIdx,
                  } as TextBlock);
                  wordX += wWidth + spaceWidth;
                });
              } else {
                const lineOverride = blockOverrides[`p${paragraphIndex}-l${lineIndexInPara}`] || {};
                const mergedTemplate = { ...template, ...lineOverride };
                const actualLineWidth = ctx.measureText(currentLine).width + (currentLine.length * (mergedTemplate.letterSpacing || 0));
                
                let lineX = leftX;
                if (mergedTemplate.align === 'center') lineX += (lineWidthAtY - actualLineWidth) / 2;
                else if (mergedTemplate.align === 'right') lineX += (lineWidthAtY - actualLineWidth);

                const defaultX = lineX + (pageOffsets[allPages.length]?.x || 0);
                const defaultY = startY + (pageOffsets[allPages.length]?.y || 0);

                currentPageBlocks.push({
                  ...mergedTemplate,
                  id: `page-${allPages.length}-line-${currentPageBlocks.length}`,
                  text: currentLine,
                  x: lineOverride.x !== undefined ? lineOverride.x : defaultX,
                  y: lineOverride.y !== undefined ? lineOverride.y : defaultY,
                  width: actualLineWidth,
                  rotation: lineOverride.rotation !== undefined ? lineOverride.rotation : (mergedTemplate.rotation || 0),
                  paragraphIndex,
                  lineIndex: lineIndexInPara,
                } as TextBlock);
              }
              
              lineIndexInPara++;
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
              const lineOverride = blockOverrides[`p${paragraphIndex}-l${lineIndexInPara}`] || {};
              const lineMergedTemplate = { ...template, ...lineOverride };
              const actualLineWidth = ctx.measureText(currentLine).width + (currentLine.length * (lineMergedTemplate.letterSpacing || 0));
              
              let lineX = leftX;
              if (lineMergedTemplate.align === 'center') lineX += (lineWidthAtY - actualLineWidth) / 2;
              else if (lineMergedTemplate.align === 'right') lineX += (lineWidthAtY - actualLineWidth);

              let dragDeltaX = 0;
              let dragDeltaY = 0;
              if (lineOverride.x !== undefined) {
                const defaultLineX = lineX + (pageOffsets[allPages.length]?.x || 0);
                dragDeltaX = lineOverride.x - defaultLineX;
              }
              if (lineOverride.y !== undefined) {
                const defaultLineY = startY + (pageOffsets[allPages.length]?.y || 0);
                dragDeltaY = lineOverride.y - defaultLineY;
              }

              const wordsInLine = currentLine.split(' ');
              let wordX = leftX;
              if (lineMergedTemplate.align === 'center') wordX += (lineWidthAtY - actualLineWidth) / 2;
              else if (lineMergedTemplate.align === 'right') wordX += (lineWidthAtY - actualLineWidth);

              wordsInLine.forEach((w, wIdx) => {
                const wordOverride = blockOverrides[`p${paragraphIndex}-l${lineIndexInPara}-w${wIdx}`] || {};
                const mergedWordTemplate = { ...lineMergedTemplate, ...wordOverride };
                const wWidth = ctx.measureText(w).width + (w.length * (mergedWordTemplate.letterSpacing || 0));
                
                const defaultWordX = wordX + dragDeltaX + (pageOffsets[allPages.length]?.x || 0);
                const defaultWordY = startY + dragDeltaY + (pageOffsets[allPages.length]?.y || 0);

                currentPageBlocks.push({
                  ...mergedWordTemplate,
                  id: `page-${allPages.length}-word-${currentPageBlocks.length}`,
                  text: w,
                  x: wordOverride.x !== undefined ? wordOverride.x : defaultWordX,
                  y: wordOverride.y !== undefined ? wordOverride.y : defaultWordY,
                  width: wordOverride.width !== undefined ? wordOverride.width : wWidth,
                  rotation: wordOverride.rotation !== undefined ? wordOverride.rotation : (mergedWordTemplate.rotation || 0),
                  paragraphIndex,
                  lineIndex: lineIndexInPara,
                  wordIndex: wIdx,
                } as TextBlock);
                wordX += wWidth + spaceWidth;
              });
            } else {
              const lineOverride = blockOverrides[`p${paragraphIndex}-l${lineIndexInPara}`] || {};
              const mergedTemplate = { ...template, ...lineOverride };
              const actualLineWidth = ctx.measureText(currentLine).width + (currentLine.length * (mergedTemplate.letterSpacing || 0));
              
              let lineX = leftX;
              if (mergedTemplate.align === 'center') lineX += (lineWidthAtY - actualLineWidth) / 2;
              else if (mergedTemplate.align === 'right') lineX += (lineWidthAtY - actualLineWidth);

              const defaultX = lineX + (pageOffsets[allPages.length]?.x || 0);
              const defaultY = startY + (pageOffsets[allPages.length]?.y || 0);

              currentPageBlocks.push({
                ...mergedTemplate,
                id: `page-${allPages.length}-line-${currentPageBlocks.length}`,
                text: currentLine,
                x: lineOverride.x !== undefined ? lineOverride.x : defaultX,
                y: lineOverride.y !== undefined ? lineOverride.y : defaultY,
                width: actualLineWidth,
                rotation: lineOverride.rotation !== undefined ? lineOverride.rotation : (mergedTemplate.rotation || 0),
                paragraphIndex,
                lineIndex: lineIndexInPara,
              } as TextBlock);
            }
            lineIndexInPara++;
            currentY += lineHeightPx;
          }

          if (currentY + lineHeightPx > usableHeight) {
            allPages.push(currentPageBlocks);
            currentPageBlocks = [];
            currentY = 0;
          }
          
          paragraphIndex++;
        }

        if (currentPageBlocks.length > 0) {
          allPages.push(currentPageBlocks);
        }
        
        setPages(allPages);
        // Reset to first page when content changes significantly
        setCurrentPageIndex(0);
      } catch (err) {
        console.error('Error generating pages:', err);
      } finally {
        setIsLayoutLoading(false);
      }
    };

    generatePages();
  }, [debouncedBulkText, debouncedBoundary, backgroundImage, imageDimensions, layoutTemplate, moveMode === 'words', pageOffsets, blockOverrides]);

  const resetAll = () => {
    if (backgroundImage) {
      URL.revokeObjectURL(backgroundImage);
    }
    setBackgroundImage(null);
    setTextBlocks([]);
    setSelectedIds([]);
    setBulkText('');
    setPages([]);
    setPageOffsets({});
    setBlockOverrides({});
    toast.info("All progress cleared.");
  };

  return (
    <div className="h-screen bg-[#f8f9fa] flex flex-col overflow-hidden">
      <Toaster position="top-center" richColors />
      
      {/* Image Loading Overlay */}
      <AnimatePresence>
        {isImageLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center gap-4"
          >
            <div className="relative">
              <Loader2 size={48} className="text-brand-600 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 bg-brand-200 rounded-full animate-pulse" />
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-lg font-bold text-surface-900">Setting up your page...</p>
              <p className="text-xs text-surface-400 font-medium animate-pulse">This might take a moment on slower connections</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
            className="fixed inset-0 z-[100] bg-surface-900/95 sm:backdrop-blur-md flex flex-col items-center justify-center p-2 md:p-6"
          >
            <div className="w-full max-w-6xl flex flex-col gap-3 h-full max-h-[95vh]">
              <div className="flex items-center justify-between text-white px-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg hidden sm:block">
                    <Layout size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm md:text-base font-bold leading-tight">Calibrate Page Boundary</h2>
                    <p className="text-[9px] md:text-xs text-surface-400">Drag the red circles to the corners of the writing area.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={resetBoundary}
                    className="p-2 md:px-4 md:py-2 bg-surface-800 hover:bg-surface-700 rounded-lg text-xs font-bold transition-all flex items-center gap-2 text-surface-300"
                    title="Reset Dots"
                  >
                    <RotateCcw size={14} />
                    <span className="hidden md:inline">Reset</span>
                  </button>
                  <button 
                    onClick={() => setIsCalibrating(false)}
                    className="px-4 md:px-6 py-1.5 md:py-2 bg-white text-surface-900 rounded-lg text-xs font-bold hover:bg-surface-100 transition-all shadow-lg"
                  >
                    Done
                  </button>
                </div>
              </div>
              
              <div className="flex-1 min-h-0 bg-surface-800 rounded-2xl overflow-hidden relative border border-surface-700 shadow-2xl flex items-center justify-center">
                <Canvas 
                  backgroundImage={backgroundImage}
                  textBlocks={[]}
                  selectedIds={[]}
                  isRealistic={isRealisticMode}
                  isCharVariance={isCharVariance}
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

              <div className="grid grid-cols-4 gap-2 md:gap-4 text-surface-500 text-[8px] md:text-[10px] uppercase font-bold tracking-widest text-center px-2">
                <div className="bg-surface-800/50 py-1.5 md:py-2 rounded-lg border border-surface-700/50">Top Left</div>
                <div className="bg-surface-800/50 py-1.5 md:py-2 rounded-lg border border-surface-700/50">Top Right</div>
                <div className="bg-surface-800/50 py-1.5 md:py-2 rounded-lg border border-surface-700/50">Bottom Left</div>
                <div className="bg-surface-800/50 py-1.5 md:py-2 rounded-lg border border-surface-700/50">Bottom Right</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Top Bar Container */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-surface-200">
        {/* Header */}
        <header className={`px-3 md:px-6 ${isFullscreen ? 'py-1 md:py-2' : 'py-1.5 sm:py-3 md:py-4'} flex items-center justify-between relative z-20`}>
          <div className="flex items-center gap-2 md:gap-3">
            <div className={`${isFullscreen ? 'w-6 h-6 md:w-8 md:h-8' : 'w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10'} bg-surface-900 rounded-xl flex items-center justify-center text-white overflow-hidden shadow-lg shadow-surface-200`}>
              <img src="/logo_64.png" alt="Handify.ai Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div>
              <h1 className={`font-bold ${isFullscreen ? 'text-xs md:text-base' : 'text-sm sm:text-base md:text-lg'} tracking-tight text-surface-900 line-height-none`}>
                <span className="sm:hidden">Handify A.i</span>
                <span className="hidden sm:inline">Handify.ai - Text to Handwriting</span>
              </h1>
              {!isFullscreen && <p className="text-[10px] text-surface-500 font-bold uppercase tracking-widest hidden sm:block">Realistic Handwriting Converter</p>}
            </div>
          </div>

          {/* Hidden SEO Content for Search Engines */}
          <div className="sr-only" aria-hidden="true">
            <h2>The Best Text to Handwriting Converter Online</h2>
            <p>
              Handify.ai is the ultimate free online tool to convert digital text into realistic handwriting. 
              Our text to handwriting generator is designed to create natural-looking handwritten assignments, 
              letters, and notes with ease. If you are looking for a way to convert text to handwriting 
              that looks real, Handify.ai is your best choice.
            </p>
            <h3>Key Features of our Text to Handwriting Tool:</h3>
            <ul>
              <li>Convert text to handwriting with realistic cursive fonts.</li>
              <li>Upload custom paper backgrounds for a truly authentic look.</li>
              <li>Adjustable margins, line height, and letter spacing for perfect alignment.</li>
              <li>Export your text to handwriting results as high-quality PDF or Image.</li>
              <li>Completely free text to handwriting converter with no registration required.</li>
              <li>Support for multiple ink colors including blue, black, and red.</li>
            </ul>
            <p>
              Whether you are a student needing a text to handwriting tool for assignments or 
              someone who wants to send a personal handwritten letter, Handify.ai makes the 
              process simple and fast. Try our text to handwriting converter today!
            </p>
          </div>
          
            <div className="flex gap-1.5 md:gap-2">
              <div className="relative">
                <button 
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  className={`${isFullscreen ? 'px-2 py-1' : 'px-2.5 sm:px-3 md:px-5 py-1.5 sm:py-2'} bg-brand-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-brand-700 active:scale-95 transition-all shadow-lg shadow-brand-100 flex items-center gap-1 sm:gap-2 disabled:opacity-50 cursor-pointer touch-manipulation`}
                  disabled={isExporting || !backgroundImage || (bulkText && pages.length === 0)}
                >
                  <Download size={isFullscreen ? 14 : 16} />
                  {isExporting ? '...' : (pages.length > 0 ? (isFullscreen ? pages.length : `Export ${pages.length}`) : 'Export')}
                  <ChevronDown size={12} className={`transition-transform duration-300 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
              <button 
                onClick={() => setIsHelpOpen(true)}
                className={`${isFullscreen ? 'p-1' : 'p-1.5 sm:p-2.5'} hover:bg-surface-100 rounded-xl text-surface-500 transition-colors`}
                title="Help"
              >
                <HelpCircle size={isFullscreen ? 14 : 18} />
              </button>
              <button 
                onClick={toggleFullscreen}
                className={`hidden lg:flex ${isFullscreen ? 'p-1.5' : 'p-2.5'} hover:bg-surface-100 rounded-xl text-surface-500 transition-colors`}
                title={isFullscreen ? "Exit Full Screen" : "Full Screen"}
              >
                {isFullscreen ? <Minimize size={isFullscreen ? 16 : 18} /> : <Maximize size={isFullscreen ? 16 : 18} />}
              </button>
              <button 
                onClick={resetAll}
                className={`${isFullscreen ? 'p-1' : 'p-1.5 sm:p-2.5'} hover:bg-surface-100 rounded-xl text-surface-500 transition-colors`}
                title="Reset"
              >
                <RotateCcw size={isFullscreen ? 14 : 18} />
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
          isFullscreen={isFullscreen}
          className="relative z-10"
        />
      </div>

      <main className={`flex-1 flex flex-col lg:flex-row ${isFullscreen ? 'overflow-hidden' : 'overflow-y-scroll lg:overflow-hidden overflow-x-hidden'} relative lg:scrollbar-auto`}>
        {/* Layout & Export Loading Overlay */}
        <AnimatePresence>
          {(isLayoutLoading || isExporting) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[60] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center gap-6"
            >
              <div className="relative">
                <div className="w-16 h-16 border-4 border-surface-100 border-t-brand-600 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-brand-50 rounded-full animate-pulse" />
                </div>
              </div>
              <div className="flex flex-col items-center text-center px-6">
                <p className="text-surface-900 font-bold text-lg tracking-tight">
                  {isExporting ? 'Generating High-Res Document' : 'Applying Font Layout'}
                </p>
                <p className="text-surface-500 text-sm font-medium">
                  {isExporting 
                    ? 'This may take a moment. Please do not close the tab.' 
                    : 'Measuring text for boundary alignment...'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Left: Canvas Area */}
        <div 
          className={`flex-1 ${isFullscreen ? 'p-2 md:p-4 overflow-y-scroll' : 'p-4 md:p-6 lg:overflow-y-auto'} ${activeMobileTab === 'canvas' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'} items-center ${isFullscreen ? 'gap-4' : 'gap-6 md:gap-8'}`} 
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
            <div className="w-full flex flex-col items-center gap-6">
              {/* Page Navigation - Mobile Only */}
              {pages.length > 1 && (
                <div className="flex sm:hidden items-center gap-6 bg-white/80 backdrop-blur-md px-6 py-3 rounded-2xl shadow-xl shadow-surface-200/50 border border-surface-200 sticky top-4 z-40">
                  <button 
                    onClick={() => {
                      const nextIdx = Math.max(0, currentPageIndex - 1);
                      setCurrentPageIndex(nextIdx);
                      setActivePageIndex(nextIdx);
                    }}
                    disabled={currentPageIndex === 0}
                    className="p-2 hover:bg-surface-100 rounded-xl disabled:opacity-20 disabled:cursor-not-allowed transition-all hover:scale-110 active:scale-95 text-surface-600"
                    title="Previous Page"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  
                  <div className="flex flex-col items-center min-w-[100px]">
                    <span className="text-sm font-black text-surface-900 tracking-tight">PAGE {currentPageIndex + 1}</span>
                    <span className="text-[10px] text-surface-400 font-bold uppercase tracking-widest">of {pages.length}</span>
                  </div>

                  <button 
                    onClick={() => {
                      const nextIdx = Math.min(pages.length - 1, currentPageIndex + 1);
                      setCurrentPageIndex(nextIdx);
                      setActivePageIndex(nextIdx);
                    }}
                    disabled={currentPageIndex === pages.length - 1}
                    className="p-2 hover:bg-surface-100 rounded-xl disabled:opacity-20 disabled:cursor-not-allowed transition-all hover:scale-110 active:scale-95 text-surface-600"
                    title="Next Page"
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>
              )}

              <div className="w-full max-w-4xl flex flex-col items-center gap-6 md:gap-8">
                {pages.map((pageBlocks, idx) => (
                  <div 
                    key={idx} 
                    className={`w-full h-[60vh] sm:h-[75vh] md:h-[80vh] max-h-[850px] aspect-[1/1.4] sm:aspect-auto canvas-container transition-opacity duration-300 ${
                      (currentPageIndex === idx || isExporting) ? 'block opacity-100' : 'hidden sm:block opacity-0 sm:opacity-100'
                    }`}
                  >
                    <div className="mb-3 flex justify-between items-center px-4">
                      <span className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Page {idx + 1}</span>
                      <span className="hidden sm:inline text-[10px] font-bold text-surface-300 italic">Desktop View</span>
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
                      onChange={(newBlocks, delta) => {
                        const newPages = [...pages];
                        const oldBlocks = pages[idx] || [];
                        newPages[idx] = newBlocks;
                        setPages(newPages);
                        
                        // Save any position/transform changes to blockOverrides
                        const overridesToUpdate: {[key: string]: Partial<TextBlock>} = {};
                        newBlocks.forEach((b, bIdx) => {
                          if (b.paragraphIndex !== undefined && b.lineIndex !== undefined) {
                            const oldB = oldBlocks[bIdx];
                            if (!oldB || oldB.x !== b.x || oldB.y !== b.y || oldB.rotation !== b.rotation || oldB.fontSize !== b.fontSize || oldB.width !== b.width || oldB.fill !== b.fill || oldB.fontFamily !== b.fontFamily) {
                              const key = b.wordIndex !== undefined 
                                ? `p${b.paragraphIndex}-l${b.lineIndex}-w${b.wordIndex}` 
                                : `p${b.paragraphIndex}-l${b.lineIndex}`;
                              overridesToUpdate[key] = {
                                ...(blockOverrides[key] || {}),
                                x: b.x,
                                y: b.y,
                                rotation: b.rotation,
                                fontSize: b.fontSize,
                                width: b.width,
                                fill: b.fill,
                                fontFamily: b.fontFamily,
                                secondaryFontFamily: b.secondaryFontFamily,
                                isCombinedFont: b.isCombinedFont,
                                lineHeight: b.lineHeight,
                                letterSpacing: b.letterSpacing,
                                wordSpacing: b.wordSpacing,
                                opacity: b.opacity,
                                align: b.align,
                              };
                            }
                          }
                        });
                        if (Object.keys(overridesToUpdate).length > 0) {
                          setBlockOverrides(prev => ({
                            ...prev,
                            ...overridesToUpdate
                          }));
                        }
                        
                        if (delta) {
                          setPageOffsets(prev => ({
                            ...prev,
                            [idx]: {
                              x: (prev[idx]?.x || 0) + delta.x,
                              y: (prev[idx]?.y || 0) + delta.y
                            }
                          }));
                        }
                      }}
                      stageRef={(el: any) => stageRefs.current[idx] = el}
                      margins={margins}
                      showMargins={showMargins}
                      boundary={boundary}
                      onBoundaryChange={setBoundary}
                      isCalibrating={isCalibrating}
                      moveMode={moveMode}
                      isExporting={isExporting}
                      isActive={typeof window !== 'undefined' && window.innerWidth < 640 ? currentPageIndex === idx : activePageIndex === idx}
                      onActivate={() => {
                        setActivePageIndex(idx);
                        setCurrentPageIndex(idx);
                      }}
                      // Performance optimization: disable listening for non-visible pages on mobile
                      listening={currentPageIndex === idx || typeof window !== 'undefined' && window.innerWidth >= 640}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
              <div className="w-full h-[60vh] sm:h-[75vh] md:h-[80vh] max-h-[850px] aspect-[1/1.4] sm:aspect-auto canvas-container">
                  <Canvas 
                    backgroundImage={backgroundImage}
                    textBlocks={textBlocks}
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
                    onChange={setTextBlocks}
                    stageRef={(el: any) => stageRefs.current[0] = el}
                    margins={margins}
                    showMargins={showMargins}
                    boundary={boundary}
                    onBoundaryChange={setBoundary}
                    isCalibrating={isCalibrating}
                    moveMode={moveMode}
                    isExporting={isExporting}
                    isActive={typeof window !== 'undefined' && window.innerWidth < 640 ? true : activePageIndex === 0}
                    onActivate={() => setActivePageIndex(0)}
                  />
              </div>
            )}
          
          <div className="w-full max-w-4xl space-y-8 md:space-y-12">


            <div {...getRootProps()} className="hidden">
              <input {...getInputProps()} />
            </div>
            {!backgroundImage && (
              <div {...getRootProps()} className={`w-full border-2 border-dashed rounded-[32px] p-12 md:p-20 text-center transition-all cursor-pointer group ${isDragActive ? 'border-brand-500 bg-brand-50/30' : 'border-surface-200 bg-white hover:border-brand-300 hover:bg-surface-50'}`}>
                <input {...getInputProps()} />
                <div className="w-20 h-20 bg-brand-50 text-brand-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500 shadow-sm">
                  <ImageIcon size={40} />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-surface-900 tracking-tight">Upload your page photo</h3>
                <p className="text-surface-500 mb-8 max-w-sm mx-auto leading-relaxed">
                  Take a photo of your notebook or any paper. We'll use it as the canvas for your handwriting.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      open();
                    }}
                    className="w-full sm:w-auto px-8 py-4 bg-brand-600 text-white rounded-2xl font-bold text-base hover:bg-brand-700 transition-all shadow-xl shadow-brand-200/50"
                  >
                    Select from Device
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      templatesRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="w-full sm:w-auto px-8 py-4 bg-white border-2 border-brand-200 text-brand-600 rounded-2xl font-bold text-base hover:bg-brand-50 transition-all shadow-sm"
                  >
                    Select from Default Page
                  </button>
                </div>
                <span className="hidden sm:inline-block text-xs font-bold text-surface-400 uppercase tracking-widest mt-6">or drag & drop</span>
              </div>
            )}

            <div ref={templatesRef} className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-surface-200" />
                <h4 className="text-xs font-bold text-surface-400 uppercase tracking-widest">Page Templates</h4>
                <div className="h-px flex-1 bg-surface-200" />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {PAGE_BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.value}
                    disabled={isTemplateLoading === bg.value}
                    onClick={() => handleImageLoad(bg.value, bg.name)}
                    className={`group relative aspect-[4/3] rounded-[32px] overflow-hidden border-2 transition-all shadow-sm hover:shadow-2xl hover:shadow-brand-100/50 ${backgroundImage === bg.value ? 'border-brand-500 ring-4 ring-brand-50' : 'border-surface-200 hover:border-brand-500'} ${isTemplateLoading === bg.value ? 'opacity-80' : ''}`}
                  >
                    <img src={bg.value} alt={bg.name} className={`w-full h-full object-cover transition-all duration-700 ${isTemplateLoading === bg.value ? 'scale-105 blur-sm' : 'group-hover:scale-110'}`} referrerPolicy="no-referrer" />
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity ${backgroundImage === bg.value ? 'opacity-40' : 'opacity-60 group-hover:opacity-100'}`} />
                    
                    {isTemplateLoading === bg.value && (
                      <div className="absolute inset-0 flex items-center justify-center bg-brand-900/40 backdrop-blur-sm">
                        <Loader2 className="text-white animate-spin" size={32} />
                      </div>
                    )}

                    <div className="absolute inset-0 flex flex-col justify-end p-8">
                      <span className="text-white text-xl font-bold tracking-tight">{bg.name}</span>
                      <span className="text-white/60 text-xs font-medium uppercase tracking-widest mt-1">
                        {isTemplateLoading === bg.value ? 'Loading Template...' : 'Ready to use template'}
                      </span>
                    </div>
                    {backgroundImage === bg.value ? (
                      <div className="absolute top-6 right-6 w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center text-white shadow-lg">
                        <Check size={20} />
                      </div>
                    ) : !isTemplateLoading && (
                      <div className="absolute top-6 right-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                        <Plus size={20} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Highly Polished visible SEO & Feature Guide section for Google Ranking and User onboarding */}
            {!backgroundImage && (
              <div className="space-y-12 pt-12 border-t border-surface-200">
                {/* Introduction Header */}
                <div className="text-center space-y-4 max-w-2xl mx-auto">
                  <h2 className="text-3xl md:text-4xl font-black text-surface-900 tracking-tight">
                    The #1 Text to Handwriting AI Converter
                  </h2>
                  <p className="text-base md:text-lg text-surface-500 leading-relaxed">
                    Convert digital files, essays, and text documents into realistic handwriting instantly. Handify.ai uses intelligent layout rendering and organic font curves to mimic actual human penmanship perfectly.
                  </p>
                </div>

                {/* Features Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-8 bg-white border border-surface-200 rounded-[32px] hover:shadow-xl transition-all space-y-4">
                    <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center">
                      <Sparkles size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-surface-900">Advanced Handwriting AI</h3>
                    <p className="text-surface-500 text-sm leading-relaxed">
                      Our handwriting generator utilizes organic variation algorithms to guarantee that letter styling, spacing, and word rotation are subtly varied—making it completely indistinguishable from real handwriting.
                    </p>
                  </div>

                  <div className="p-8 bg-white border border-surface-200 rounded-[32px] hover:shadow-xl transition-all space-y-4">
                    <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center">
                      <Palette size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-surface-900">Custom Ink & Paper Styles</h3>
                    <p className="text-surface-500 text-sm leading-relaxed">
                      Choose from royal blue, dark blue, black, or red ink. Align your text exactly to any custom notebook photo background or select our pre-configured college ruled template sheets with ease.
                    </p>
                  </div>

                  <div className="p-8 bg-white border border-surface-200 rounded-[32px] hover:shadow-xl transition-all space-y-4">
                    <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center">
                      <Layers size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-surface-900">Multi-Page Bulk Conversions</h3>
                    <p className="text-surface-500 text-sm leading-relaxed">
                      Paste thousands of words at once. Our engine automatically splits paragraphs, manages line overflows, and creates continuous handwritten PDF pages without any cutoffs.
                    </p>
                  </div>

                  <div className="p-8 bg-white border border-surface-200 rounded-[32px] hover:shadow-xl transition-all space-y-4">
                    <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center">
                      <Download size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-surface-900">High-Resolution PDF Export</h3>
                    <p className="text-surface-500 text-sm leading-relaxed">
                      Export your assignments, creative journal writing, or letters directly to pristine PDF documents or high-fidelity JPG formats, completely optimized for digital submission.
                    </p>
                  </div>
                </div>

                {/* FAQ Section */}
                <div className="space-y-8 bg-surface-50 border border-surface-100 p-8 md:p-12 rounded-[40px]">
                  <h3 className="text-2xl font-black text-surface-900 tracking-tight text-center">
                    Frequently Asked Questions
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 pt-4">
                    <div className="space-y-2">
                      <h4 className="text-base font-bold text-surface-900">Is this the best text to handwriting AI?</h4>
                      <p className="text-sm text-surface-500 leading-relaxed">
                        Yes! Handify.ai is recognized as a leading <strong>text to handwriting AI</strong>. It uses custom natural-curve cursive fonts and spacing variations to make your converted digital text look exactly like authentic human penmanship.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-base font-bold text-surface-900">How does the handwriting generator vary the text?</h4>
                      <p className="text-sm text-surface-500 leading-relaxed">
                        To look like a real human wrote it, Handify.ai allows you to enable <strong>Character Variance</strong> and custom line <strong>Tilt / Rotation</strong>. This prevents identical characters (like 'e' or 'o') from looking completely identical, matching organic pen stroke variance.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-base font-bold text-surface-900">Can I upload my own notebook photo?</h4>
                      <p className="text-sm text-surface-500 leading-relaxed">
                        Absolutely. Take a high-quality picture of your actual notebook under good lighting, upload it as a custom background, and use our margin calibrator to align the generated ink with your paper's lines.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-base font-bold text-surface-900">Is this handwriting converter safe and free?</h4>
                      <p className="text-sm text-surface-500 leading-relaxed">
                        Yes, Handify.ai is 100% free and secure. All processing runs right inside your web browser or server-side sandbox, ensuring your data is private. There are no watermarks or hidden charges.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Sidebar Controls */}
        <aside className={`w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l border-surface-200 ${
          activeMobileTab === 'settings' ? 'block overflow-y-auto flex-1' : 'hidden lg:block lg:overflow-y-scroll'
        } ${isFullscreen ? 'p-3 md:p-4' : 'p-4 md:p-6'}`}>
          {(() => {
            const isEditingSelection = (selectedIds.length > 0 || moveMode === 'all') && effectiveSelectedBlock;
            const targetSettings = isEditingSelection ? effectiveSelectedBlock : layoutTemplate;
            const updateSettings = (updates: Partial<TextBlock>) => {
              if (isEditingSelection) {
                updateSelected(updates);
              } else {
                setLayoutTemplate(prev => ({ ...prev, ...updates }));
              }
            };

            return (
              <div className={`${isFullscreen ? 'space-y-4 md:space-y-5' : 'space-y-6 md:space-y-8'}`}>
                {/* Mode Controls */}
                <div className={`${isFullscreen ? 'space-y-2' : 'space-y-4'}`}>
                  {backgroundImage && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-2">
                        <button 
                          onClick={() => setIsCalibrating(true)}
                          className={`flex items-center justify-center gap-2 ${isFullscreen ? 'py-2' : 'py-3'} bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-200/50 cursor-pointer`}
                        >
                          <Layout size={16} />
                          <span>Calibrate Page Boundary</span>
                        </button>
                        <button 
                          onClick={open}
                          className={`flex items-center justify-center gap-2 ${isFullscreen ? 'py-2' : 'py-3'} bg-white border border-surface-200 text-surface-900 rounded-xl text-xs font-bold hover:bg-surface-50 transition-all shadow-sm cursor-pointer`}
                        >
                          <ImagePlus size={16} />
                          <span>Upload New Background</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className={`${isFullscreen ? 'space-y-3 md:space-y-4' : 'space-y-4 md:space-y-6'}`}>
                  {/* Bulk Text Input (Desktop Only) */}
                  <div className="space-y-2 hidden lg:block">
                    <label className="text-[10px] md:text-xs font-bold text-surface-400 uppercase tracking-wider">Bulk Content</label>
                    <textarea 
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      className={`w-full p-3 bg-surface-50 border border-surface-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none ${isFullscreen ? 'min-h-[100px] md:min-h-[150px]' : 'min-h-[120px] md:min-h-[200px]'} text-sm`}
                      placeholder="Paste your long text here..."
                    />
                  </div>

                  <div className="hidden lg:block h-px bg-surface-100" />

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 md:gap-3">
                    <button 
                      onClick={addTextBlock}
                      disabled={!backgroundImage}
                      className={`flex items-center justify-center gap-2 bg-brand-600 text-white ${isFullscreen ? 'p-2 md:p-2.5' : 'p-2.5 md:p-3'} rounded-xl text-sm font-medium hover:bg-brand-700 transition-all disabled:opacity-50 shadow-lg shadow-brand-200/30 cursor-pointer`}
                    >
                      <Plus size={18} />
                      <span>Add Text</span>
                    </button>
                    <button 
                      onClick={deleteSelected}
                      disabled={selectedIds.length === 0}
                      className={`flex items-center justify-center gap-2 bg-surface-100 text-surface-600 ${isFullscreen ? 'p-2 md:p-2.5' : 'p-2.5 md:p-3'} rounded-xl text-sm font-medium hover:bg-surface-200 transition-all disabled:opacity-50 cursor-pointer`}
                    >
                      <Trash2 size={18} />
                      <span>Delete</span>
                    </button>
                  </div>

                  <div className="h-px bg-surface-100" />

                  {/* Settings Title / Context */}
                  <div className="bg-surface-50 border border-surface-100 p-3 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-surface-400 uppercase tracking-widest">
                        {isEditingSelection ? 'Editing Selection' : 'Default Page Layout'}
                      </span>
                      <span className="text-[9px] font-bold text-brand-600 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {isEditingSelection ? 'Custom Block' : 'Global Presets'}
                      </span>
                    </div>
                    <p className="text-[11px] text-surface-500 mt-1 font-medium leading-relaxed">
                      {isEditingSelection 
                        ? 'Tweak parameters specifically for selected blocks.' 
                        : 'Newly split text pages immediately adopt these global parameters.'}
                    </p>
                  </div>

                  {/* Text Block Content Input (only when block selected) */}
                  {isEditingSelection && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-surface-400 uppercase tracking-wider">Content</label>
                      <textarea 
                        value={targetSettings.text || ''}
                        onChange={(e) => updateSettings({ text: e.target.value })}
                        className={`w-full p-3 bg-surface-50 border border-surface-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none ${isFullscreen ? 'min-h-[80px]' : 'min-h-[120px]'} text-sm`}
                        placeholder="Type your handwritten text..."
                      />
                      {selectedIds.length > 1 && (
                        <p className="text-[10px] text-surface-400 italic">Editing {selectedIds.length} blocks simultaneously</p>
                      )}
                    </div>
                  )}

                  {/* Font Family Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-surface-400 uppercase tracking-wider">Font Style</label>
                    <select 
                      value={targetSettings.fontFamily}
                      onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                      className="w-full p-3 bg-surface-50 border border-surface-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm font-bold text-surface-700"
                      style={{ fontFamily: targetSettings.fontFamily }}
                    >
                      {HANDWRITING_FONTS.map(font => (
                        <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                          {font.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Combined Font Mixture */}
                  <div className="flex items-center justify-between py-1.5 border-t border-b border-surface-100 my-1">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-surface-700">Combine Two Fonts</span>
                      <span className="text-[10px] text-surface-400">Blends fonts for ultra-natural look</span>
                    </div>
                    <button 
                      onClick={() => updateSettings({ isCombinedFont: !targetSettings.isCombinedFont })}
                      className={`w-10 h-5 rounded-full transition-all relative ${targetSettings.isCombinedFont ? 'bg-brand-600' : 'bg-surface-200'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all ${targetSettings.isCombinedFont ? 'left-5.5' : 'left-0.5'}`} />
                    </button>
                  </div>

                  {targetSettings.isCombinedFont && (
                    <div className="space-y-2 transition-all">
                      <label className="text-xs font-bold text-surface-400 uppercase tracking-wider">Secondary Font Style</label>
                      <select 
                        value={targetSettings.secondaryFontFamily || targetSettings.fontFamily}
                        onChange={(e) => updateSettings({ secondaryFontFamily: e.target.value })}
                        className="w-full p-3 bg-brand-50/50 border border-brand-200 text-brand-900 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm font-bold"
                        style={{ fontFamily: targetSettings.secondaryFontFamily || targetSettings.fontFamily }}
                      >
                        {HANDWRITING_FONTS.map(font => (
                          <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                            {font.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Ink Color Picker */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-surface-400 uppercase tracking-wider">Ink Color</label>
                    <div className="grid grid-cols-5 gap-2 bg-surface-50 border border-surface-200 p-2.5 rounded-xl">
                      {INK_COLORS.map(color => (
                        <button
                          key={color.value}
                          onClick={() => updateSettings({ fill: color.value })}
                          className={`aspect-square w-full rounded-full border-2 transition-all relative flex items-center justify-center ${targetSettings.fill === color.value ? 'border-brand-600 scale-105 shadow-md shadow-brand-100' : 'border-transparent hover:border-surface-200'} cursor-pointer`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        >
                          {targetSettings.fill === color.value && (
                            <div className="w-1.5 h-1.5 bg-white rounded-full shadow" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Size Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-surface-400 uppercase tracking-wider">Font Size</label>
                    <div className="flex items-center bg-surface-50 border border-surface-200 rounded-xl p-1 shadow-sm">
                      <button 
                        onClick={() => updateSettings({ fontSize: Math.max(8, (targetSettings.fontSize || 96) - 2) })}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-surface-600 min-w-[36px] flex justify-center border-none bg-transparent cursor-pointer"
                      >
                        <Minus size={16} />
                      </button>
                      <input 
                        type="number" 
                        value={Math.round(targetSettings.fontSize || 96)}
                        onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) || 12 })}
                        className="w-full text-center bg-transparent text-sm font-black text-surface-900 focus:outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button 
                        onClick={() => updateSettings({ fontSize: Math.min(200, (targetSettings.fontSize || 96) + 2) })}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-surface-600 min-w-[36px] flex justify-center border-none bg-transparent cursor-pointer"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Sliders for rotation, spacing, etc. */}
                  <div className="space-y-4">
                    {/* Rotation */}
                    <SidebarSliderControl 
                      label="Tilt / Rotation" 
                      value={targetSettings.rotation || 0} 
                      min={-15} 
                      max={15} 
                      step={0.5}
                      onChange={(val) => updateSettings({ rotation: val })}
                      onReset={() => updateSettings({ rotation: 0 })}
                      unit="°"
                    />

                    <SidebarSliderControl 
                      label="Line Height" 
                      value={targetSettings.lineHeight || 1.2} 
                      min={0.5} 
                      max={3.0} 
                      step={0.05}
                      onChange={(val) => updateSettings({ lineHeight: val })}
                      onReset={() => updateSettings({ lineHeight: 1.2 })}
                    />

                    <SidebarSliderControl 
                      label="Letter Spacing" 
                      value={targetSettings.letterSpacing || 0} 
                      min={-5} 
                      max={20} 
                      step={0.5}
                      onChange={(val) => updateSettings({ letterSpacing: val })}
                      onReset={() => updateSettings({ letterSpacing: 0 })}
                    />

                    <SidebarSliderControl 
                      label="Word Spacing" 
                      value={targetSettings.wordSpacing || 0} 
                      min={0} 
                      max={20} 
                      step={0.5}
                      onChange={(val) => updateSettings({ wordSpacing: val })}
                      onReset={() => updateSettings({ wordSpacing: 0 })}
                    />

                    <SidebarSliderControl 
                      label="Ink Opacity" 
                      value={targetSettings.opacity || 0.8} 
                      min={0.1} 
                      max={1.0} 
                      step={0.05}
                      onChange={(val) => updateSettings({ opacity: val })}
                      onReset={() => updateSettings({ opacity: 0.8 })}
                    />
                  </div>

                  {/* Horizontal Alignment */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-surface-400 uppercase tracking-wider">Text Alignment</label>
                    <div className="grid grid-cols-3 gap-1 bg-surface-100 p-1 rounded-xl">
                      {(['left', 'center', 'right'] as const).map((align) => (
                        <button
                          key={align}
                          onClick={() => updateSettings({ align })}
                          className={`py-2 rounded-lg text-xs font-bold capitalize transition-all border-none cursor-pointer ${targetSettings.align === align ? 'bg-white shadow-sm text-brand-600' : 'text-surface-500 hover:text-surface-700 bg-transparent'}`}
                        >
                          {align}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mobile Footer Inside Settings Tab */}
                  <div className="lg:hidden pt-8 pb-4 text-center text-[10px] text-surface-400 font-medium uppercase tracking-widest border-t border-surface-100 space-y-2">
                    <p>© 2026 Handify.ai</p>
                    <p>Created by Flosy</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </aside>

        {/* Mobile: Dedicated Full-Screen Text Editor Tab */}
        <div className={`lg:hidden w-full h-full p-6 overflow-y-auto flex-col gap-5 bg-white ${activeMobileTab === 'text' ? 'flex' : 'hidden'}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-surface-900 tracking-tight flex items-center gap-2">
              <FileText size={20} className="text-brand-600" />
              Edit Bulk Content
            </h3>
            <span className="text-xs font-bold text-surface-500 bg-brand-50 border border-brand-100 px-2.5 py-1 rounded-xl">
              {bulkText.length} characters
            </span>
          </div>
          <textarea 
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className="w-full flex-1 p-4 bg-surface-50 border border-surface-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-base min-h-[40vh] resize-none leading-relaxed"
            placeholder="Type or paste your text here to convert it to handwriting..."
          />
          <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 flex gap-3 items-start text-brand-800 text-xs">
            <Sparkles className="shrink-0 text-brand-600 mt-0.5" size={16} />
            <p className="leading-relaxed">
              <strong>Tip:</strong> Long texts are automatically split into multiple handwritten pages. You can preview them in the <strong>Canvas</strong> tab and adjust styling in the <strong>Settings</strong> tab.
            </p>
          </div>
          <button 
            onClick={() => setActiveMobileTab('canvas')}
            className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold text-base transition-all shadow-lg shadow-brand-200/50 flex items-center justify-center gap-2 cursor-pointer border-none"
          >
            <Eye size={18} />
            View Handwritten Canvas
          </button>
        </div>
      </main>

      <AnimatePresence>
        {isFeedbackOpen && (
          <FeedbackSection user={user} onClose={() => setIsFeedbackOpen(false)} />
        )}
        {isHelpOpen && (
          <HelpSection onClose={() => setIsHelpOpen(false)} />
        )}
        {showWelcome && (
          <WelcomeModal 
            onOpenHelp={handleOpenHelpFromWelcome} 
            onClose={handleCloseWelcome} 
          />
        )}
      </AnimatePresence>

      {/* Export Menu Portal */}
      {createPortal(
        <AnimatePresence>
          {isExportMenuOpen && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-surface-950/40 backdrop-blur-[4px]" 
                onClick={() => setIsExportMenuOpen(false)}
              />
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                style={{ willChange: 'transform, opacity' }}
                className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-surface-100 overflow-hidden z-10"
              >
                {/* Processing Overlay */}
                <AnimatePresence>
                  {isProcessingRealism && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-50 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center gap-4"
                    >
                      <div className="relative">
                        <div className="w-12 h-12 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Sparkles className="text-brand-600 animate-pulse" size={20} />
                        </div>
                      </div>
                      <div className="text-center px-6">
                        <h3 className="text-base font-bold text-surface-900">Applying Realism</h3>
                        <p className="text-xs text-surface-500 font-medium">Perfecting your handwriting look...</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="p-5 border-b border-surface-100 bg-surface-50/50">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-bold text-surface-900 text-lg">Export Options</h3>
                    <button 
                      onClick={() => setIsExportMenuOpen(false)}
                      className="p-1.5 hover:bg-surface-200 rounded-full text-surface-400 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-3">Resolution</p>
                  <div className="grid grid-cols-3 gap-1 bg-surface-100 p-1 rounded-xl">
                    {(['low', 'normal', 'high'] as const).map((res) => (
                      <button
                        key={res}
                        onClick={() => setExportResolution(res)}
                        className={`px-2 py-2.5 rounded-lg text-[10px] font-bold uppercase transition-all ${exportResolution === res ? 'bg-white shadow-sm text-brand-600' : 'text-surface-500 hover:text-surface-700'}`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-surface-400 mt-2.5 italic font-medium">
                    {exportResolution === 'low' ? 'Fast export, smallest size' : exportResolution === 'normal' ? 'Balanced quality and size' : 'Best quality, optimized < 2MB'}
                  </p>

                  <div className="h-px bg-surface-100 my-5" />

                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-surface-900">Realistic Mode</span>
                      <span className="text-[10px] text-surface-400 font-medium">Adds natural jitter & photo look</span>
                    </div>
                    <button 
                      onClick={() => {
                        const newValue = !isRealisticMode;
                        setIsProcessingRealism(true);
                        setTimeout(() => {
                          setIsRealisticMode(newValue);
                          setIsProcessingRealism(false);
                        }, 600);
                        logAnalyticsEvent('realistic_mode_toggle', { enabled: newValue });
                      }}
                      className={`w-11 h-6 rounded-full transition-all relative ${isRealisticMode ? 'bg-brand-600' : 'bg-surface-200'}`}
                    >
                      <motion.div 
                        animate={{ x: isRealisticMode ? 22 : 2 }}
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md"
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-surface-900">Character Variance</span>
                      <span className="text-[10px] text-surface-400 font-medium">Makes same letters look different</span>
                    </div>
                    <button 
                      onClick={() => {
                        const newValue = !isCharVariance;
                        setIsProcessingRealism(true);
                        setTimeout(() => {
                          setIsCharVariance(newValue);
                          setIsProcessingRealism(false);
                        }, 600);
                        logAnalyticsEvent('char_variance_toggle', { enabled: newValue });
                      }}
                      className={`w-11 h-6 rounded-full transition-all relative ${isCharVariance ? 'bg-brand-600' : 'bg-surface-200'}`}
                    >
                      <motion.div 
                        animate={{ x: isCharVariance ? 22 : 2 }}
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md"
                      />
                    </button>
                  </div>
                </div>
                <div className="p-3 space-y-1">
                  <button 
                    onClick={downloadAsImage}
                    className="w-full px-4 py-4 text-left text-sm hover:bg-surface-50 flex items-center gap-4 text-surface-700 font-bold border-none bg-transparent cursor-pointer rounded-2xl transition-colors"
                  >
                    <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center">
                      <ImagePlus size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span>Download as Image</span>
                      <span className="text-[10px] font-medium text-surface-400">High-quality JPEG format</span>
                    </div>
                  </button>
                  <button 
                    onClick={downloadAsPDF}
                    className="w-full px-4 py-4 text-left text-sm hover:bg-surface-50 flex items-center gap-4 text-surface-700 font-bold border-none bg-transparent cursor-pointer rounded-2xl transition-colors"
                  >
                    <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center">
                      <FileText size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span>Download as PDF</span>
                      <span className="text-[10px] font-medium text-surface-400">Multi-page document</span>
                    </div>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Floating Feedback Button */}
      <button 
        onClick={() => setIsFeedbackOpen(true)}
        className="fixed bottom-20 lg:bottom-8 right-4 lg:right-8 z-50 w-14 h-14 bg-brand-600 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-brand-200/50 hover:scale-110 transition-all active:scale-95 group"
      >
        <MessageSquare size={24} />
        <span className="absolute right-full mr-4 px-3 py-1.5 bg-surface-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap">
          Feedback
        </span>
      </button>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden shrink-0 bg-white border-t border-surface-200 flex items-center justify-around py-2 px-4 shadow-lg sticky bottom-0 z-[150]">
        <button
          onClick={() => setActiveMobileTab('canvas')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all border-none bg-transparent cursor-pointer ${
            activeMobileTab === 'canvas' ? 'text-brand-600 font-bold' : 'text-surface-400 hover:text-surface-600'
          }`}
        >
          <Eye size={20} className={activeMobileTab === 'canvas' ? 'text-brand-600' : 'text-surface-400'} />
          <span className="text-[10px] tracking-tight">Canvas</span>
        </button>

        <button
          onClick={() => setActiveMobileTab('text')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all border-none bg-transparent cursor-pointer ${
            activeMobileTab === 'text' ? 'text-brand-600 font-bold' : 'text-surface-400 hover:text-surface-600'
          }`}
        >
          <FileText size={20} className={activeMobileTab === 'text' ? 'text-brand-600' : 'text-surface-400'} />
          <span className="text-[10px] tracking-tight">Write Text</span>
        </button>

        <button
          onClick={() => setActiveMobileTab('settings')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all border-none bg-transparent cursor-pointer ${
            activeMobileTab === 'settings' ? 'text-brand-600 font-bold' : 'text-surface-400 hover:text-surface-600'
          }`}
        >
          <Settings2 size={20} className={activeMobileTab === 'settings' ? 'text-brand-600' : 'text-surface-400'} />
          <span className="text-[10px] tracking-tight">Settings</span>
        </button>
      </div>

      {/* Footer */}
      <footer className="hidden lg:flex bg-white border-t border-surface-200 px-6 py-3 flex items-center justify-between text-[10px] text-surface-400 font-medium uppercase tracking-widest">
        <div className="flex gap-4 items-center">
          <span>© 2026 Handify.ai</span>
          <span className="hidden sm:inline">•</span>
          <a href="https://flosy-global.web.app/" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 transition-colors">Created by Flosy</a>
        </div>
        <div className="flex gap-4">
          <span>Privacy</span>
          <span>Terms</span>
        </div>
      </footer>
    </div>
  );
}
