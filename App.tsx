
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, useNavigate, Link, useLocation } from 'react-router-dom';
import { TEMPLATES, VISUAL_STYLES, COMPONENTS, INTEGRATIONS } from './constants.tsx';
import { ProjectState, SavedProject } from './types.ts';
import { gemini } from './services/geminiService.ts';
import { LiveAssistant } from './components/LiveAssistant.tsx';

const DRAFT_KEY = 'HERO45_PROJECT_DRAFT';
const LIST_KEY = 'HERO45_PROJECTS_LIST';

const DEFAULT_PROJECT_STATE: ProjectState = {
  objective: '',
  visualStyle: 'human',
  architecture: [],
  integrations: []
};

// --- Shared Components ---

const Sidebar: React.FC<{ onReset: () => void }> = ({ onReset }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="w-72 h-full flex flex-col bg-background-dark border-r border-white/5 shrink-0 z-20 hidden md:flex">
      <div className="p-8 pb-2">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-primary rounded-2xl size-12 flex items-center justify-center shadow-2xl shadow-primary/40">
            <span className="material-symbols-outlined text-white text-3xl">rocket_launch</span>
          </div>
          <h1 className="text-white text-2xl font-black tracking-tighter italic">HERO45</h1>
        </div>
        <nav className="flex flex-col gap-2">
          <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/') ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <span className="material-symbols-outlined">layers</span>
            <span className="text-sm font-bold">Mis Landings</span>
          </Link>
          <Link to="/create" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/create') ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <span className="material-symbols-outlined">add_circle</span>
            <span className="text-sm font-bold">Crear Landing</span>
          </Link>
          <div className="h-px bg-white/5 my-4 mx-4"></div>
          <div className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Recientes</div>
          {/* Placeholder para histórico rápido si fuera necesario */}
        </nav>
      </div>
      
      <div className="mt-auto p-8">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-surface-highlight to-transparent border border-white/5 mb-6">
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Motor de Conversión</p>
          <div className="flex items-center gap-2">
            <div className="size-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-bold text-white">IA Optimizada</span>
          </div>
        </div>
        <Link 
          to="/create" 
          onClick={onReset}
          className="w-full flex items-center justify-center gap-2 rounded-2xl h-14 bg-primary hover:bg-primary-dark text-white text-sm font-black transition-all shadow-2xl shadow-primary/30 active:scale-95"
        >
          <span className="material-symbols-outlined">magic_button</span>
          NUEVA LANDING
        </Link>
      </div>
    </aside>
  );
};

// --- Fast Creator Screen ---

const FastCreator: React.FC<{ onFinalize: (p: ProjectState, thumb: string) => void }> = ({ onFinalize }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    
    const steps = [
      "Definiendo propuesta de valor...",
      "Estructurando secciones de conversión...",
      "Generando diseño visual de alto impacto...",
      "Inyectando lógica de negocio...",
      "Finalizando Landing Page..."
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      setStatus(steps[currentStep]);
      currentStep++;
      if (currentStep >= steps.length) clearInterval(interval);
    }, 1200);

    try {
      const arch = await gemini.suggestArchitecture(prompt);
      const style = VISUAL_STYLES[Math.floor(Math.random() * VISUAL_STYLES.length)].id;
      const thumb = await gemini.generateStylePreview(style, prompt);
      
      const project: ProjectState = {
        objective: prompt,
        visualStyle: style,
        architecture: arch,
        integrations: arch.includes('pricing') ? ['stripe'] : []
      };

      setTimeout(() => {
        onFinalize(project, thumb || '');
        navigate('/success');
      }, 1000);

    } catch (e) {
      console.error(e);
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-grid-pattern overflow-y-auto">
      <div className="max-w-3xl w-full flex flex-col gap-10">
        <div className="text-center flex flex-col gap-4">
          <h1 className="text-6xl font-black text-white tracking-tighter leading-tight">Generador de <span className="text-primary italic">Landings</span></h1>
          <p className="text-text-secondary text-xl">Describe tu idea en una frase. Nosotros creamos una Landing Page de alto nivel.</p>
        </div>

        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-surface-darker rounded-[2rem] border border-white/5 p-8 shadow-2xl">
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
              className="w-full min-h-[160px] bg-transparent border-none text-white text-2xl font-medium focus:ring-0 placeholder:text-slate-700 resize-none no-scrollbar"
              placeholder="Ej: Una landing page para vender un curso de cocina mediterránea con fotos brillantes y veraniegas..."
            />
            
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
              <div className="flex gap-2">
                {['Negocio', 'SaaS', 'Producto'].map(tag => (
                  <button 
                    key={tag}
                    onClick={() => setPrompt(prev => prev + ` ${tag}`)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-primary hover:bg-primary/10 transition-all"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
              <button 
                onClick={handleGenerate}
                disabled={!prompt || isGenerating}
                className="bg-primary px-10 py-4 rounded-2xl font-black text-white shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-3"
              >
                {isGenerating ? (
                  <><div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> {status}</>
                ) : (
                  <><span className="material-symbols-outlined">rocket_launch</span> CONSTRUIR LANDING</>
                )}
              </button>
            </div>
          </div>
        </div>

        {!isGenerating && (
          <div className="grid grid-cols-3 gap-6 opacity-40 hover:opacity-100 transition-opacity">
            {[
              { t: 'CRO Optimizado', d: 'Estructura pensada para maximizar ventas.' },
              { t: 'Diseño Único', d: 'Visuales generados a medida por IA.' },
              { t: 'Listo para Exportar', d: 'Copia el prompt técnico y despliega.' }
            ].map(f => (
              <div key={f.t} className="flex flex-col gap-1 p-4 rounded-2xl border border-white/5 bg-surface-dark/40">
                <span className="text-[10px] font-black text-primary uppercase">{f.t}</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Success Screen ---

const SuccessScreen: React.FC<{ project: SavedProject | null }> = ({ project }) => {
  const navigate = useNavigate();
  const [fullPrompt, setFullPrompt] = useState('');

  useEffect(() => {
    if (project) {
      gemini.generateBase44Prompt(project).then(res => setFullPrompt(res || ''));
    }
  }, [project]);

  if (!project) return null;

  return (
    <div className="flex-1 flex flex-col items-center py-16 px-8 bg-background-dark overflow-y-auto">
      <div className="max-w-5xl w-full flex flex-col gap-12">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-3">
            <div className="bg-primary/20 text-primary px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-primary/20 w-fit">Landing Generada</div>
            <h1 className="text-5xl font-black text-white">{project.title}</h1>
          </div>
          <button onClick={() => navigate('/')} className="bg-white text-black px-8 py-3 rounded-xl font-black text-sm hover:bg-slate-200 transition-all">Mis Landings</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 flex flex-col gap-6">
             <div className="aspect-video rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl relative group bg-surface-dark">
                <img src={project.thumbnail} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-10">
                   <p className="text-white text-sm font-bold opacity-60">Concepto visual finalizado por el motor Gemini</p>
                </div>
             </div>
             <div className="bg-surface-darker rounded-[2rem] border border-white/5 p-8 flex flex-col gap-4">
                <h3 className="text-primary font-black text-xs uppercase tracking-widest flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">terminal</span> Especificaciones Base44
                </h3>
                <textarea 
                  readOnly 
                  className="w-full h-64 bg-transparent border-none focus:ring-0 text-slate-400 font-mono text-xs leading-relaxed" 
                  value={fullPrompt || "// Generando blueprint técnico..."}
                />
             </div>
          </div>
          
          <div className="flex flex-col gap-8">
            <div className="bg-surface-dark p-8 rounded-[2rem] border border-white/5 space-y-6 shadow-xl">
               <h4 className="text-white font-black text-lg">Estructura Sugerida</h4>
               <div className="space-y-4">
                  {project.architecture.map(id => (
                    <div key={id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                       <span className="material-symbols-outlined text-primary text-sm">{COMPONENTS.find(c => c.id === id)?.icon || 'view_module'}</span>
                       <span className="text-xs font-bold text-slate-300">{COMPONENTS.find(c => c.id === id)?.name || id}</span>
                    </div>
                  ))}
               </div>
            </div>
            
            <div className="bg-primary/10 border border-primary/20 p-8 rounded-[2rem] space-y-4">
               <h4 className="text-primary font-black text-lg">Próximos Pasos</h4>
               <p className="text-xs text-slate-400 leading-relaxed">Esta landing se ha guardado en tu librería. Puedes volver a ella en cualquier momento o copiar el código para tu editor.</p>
               <button className="w-full py-4 bg-primary rounded-xl font-black text-xs text-white uppercase tracking-widest shadow-xl">Copiar Blueprint</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Dashboard ---

const DashboardScreen: React.FC<{ projects: SavedProject[], onOpenProject: (p: SavedProject) => void, onDeleteProject: (id: string) => void }> = ({ projects, onOpenProject, onDeleteProject }) => {
  const navigate = useNavigate();
  return (
    <main className="flex-1 flex flex-col h-full bg-background-dark overflow-hidden relative">
      <header className="px-10 py-8 flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-white/5 z-10">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter">Mis Landings</h2>
          <p className="text-text-secondary text-sm font-medium">Gestión y archivos de Landing Pages de alta conversión</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-surface-dark px-4 py-2 rounded-xl border border-white/5 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">database</span>
            <span className="font-bold text-white uppercase">{projects.length} Landings</span>
          </div>
          <button onClick={() => navigate('/create')} className="bg-primary px-6 py-2.5 rounded-xl font-black text-xs text-white shadow-lg hover:scale-105 transition-all">NUEVA LANDING</button>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto px-10 pb-20 pt-10 no-scrollbar">
        {projects.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-8 py-20">
             <div className="size-32 bg-white/5 rounded-full flex items-center justify-center border border-white/10 opacity-30">
                <span className="material-symbols-outlined text-6xl">web</span>
             </div>
             <div className="text-center flex flex-col gap-2">
               <h3 className="text-2xl font-black text-slate-400">Librería de Landings vacía</h3>
               <p className="text-slate-600 font-medium">Empieza creando una Landing Page potente ahora mismo.</p>
             </div>
             <button onClick={() => navigate('/create')} className="bg-white text-black px-10 py-4 rounded-2xl font-black text-sm shadow-2xl">Crear mi primera Landing</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
            {projects.map(p => (
              <div key={p.id} className="group/card flex flex-col gap-4">
                <div className="relative aspect-[16/10] rounded-[2.5rem] overflow-hidden bg-surface-dark border border-white/5 transition-all hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/30 cursor-pointer" onClick={() => onOpenProject(p)}>
                  {p.thumbnail ? (
                    <img src={p.thumbnail} className="w-full h-full object-cover opacity-60 group-hover/card:opacity-100 transition-opacity duration-500" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent flex items-center justify-center">
                       <span className="material-symbols-outlined text-4xl text-primary/30">web</span>
                    </div>
                  )}
                  <div className="absolute top-5 left-5 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black text-white uppercase tracking-[0.2em] border border-white/10">LANDING PAGE</div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id); }}
                    className="absolute top-5 right-5 size-10 rounded-full bg-red-500/20 text-red-500 opacity-0 group-hover/card:opacity-100 transition-all flex items-center justify-center hover:bg-red-500 hover:text-white"
                  >
                    <span className="material-symbols-outlined text-xl">delete</span>
                  </button>
                </div>
                <div className="px-2">
                  <h4 className="text-white font-black text-xl truncate">{p.title}</h4>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                     <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">grid_view</span> {p.architecture.length} MÓDULOS</span>
                     <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

// --- App Root ---

const App: React.FC = () => {
  const [lastGenerated, setLastGenerated] = useState<SavedProject | null>(null);
  const [projects, setProjects] = useState<SavedProject[]>(() => {
    try {
      const saved = localStorage.getItem(LIST_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  useEffect(() => {
    localStorage.setItem(LIST_KEY, JSON.stringify(projects));
  }, [projects]);

  const handleFinalize = (state: ProjectState, thumb: string) => {
    const newProject: SavedProject = {
      ...state,
      id: crypto.randomUUID(),
      title: state.objective.split(' ').slice(0, 4).join(' ') || "Nueva Landing",
      createdAt: Date.now(),
      thumbnail: thumb
    };
    setProjects(prev => [newProject, ...prev]);
    setLastGenerated(newProject);
  };

  const deleteProject = (id: string) => {
    if(confirm("¿Eliminar permanentemente esta Landing Page de la base de datos?")) {
      setProjects(prev => prev.filter(p => p.id !== id));
    }
  };

  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden bg-background-dark text-white font-display">
        <Sidebar onReset={() => {}} />
        <div className="flex-1 flex flex-col min-w-0">
          <Routes>
            <Route path="/" element={
              <DashboardScreen 
                projects={projects} 
                onOpenProject={(p) => { setLastGenerated(p); window.location.hash = "#/success"; }}
                onDeleteProject={deleteProject}
              />
            } />
            <Route path="/create" element={<FastCreator onFinalize={handleFinalize} />} />
            <Route path="/success" element={<SuccessScreen project={lastGenerated} />} />
          </Routes>
        </div>
      </div>
      <LiveAssistant />
    </HashRouter>
  );
};

export default App;
