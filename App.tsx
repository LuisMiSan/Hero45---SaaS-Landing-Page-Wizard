
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, useNavigate, Link, useLocation, useParams } from 'react-router-dom';
import { TEMPLATES, VISUAL_STYLES, COMPONENTS, INTEGRATIONS } from './constants.tsx';
import { ProjectState, SavedProject } from './types.ts';
import { gemini } from './services/geminiService.ts';
import { LiveAssistant } from './components/LiveAssistant.tsx';

const LIST_KEY = 'HERO45_PROJECTS_LIST_V2'; // Versioned key to avoid conflicts

// --- PERSISTENCE LAYER ---
const StorageManager = {
  save: (data: SavedProject[]) => {
    const json = JSON.stringify(data);
    
    // Layer 1: Local Storage (Standard)
    try { localStorage.setItem(LIST_KEY, json); } catch(e) { console.error("LS Save fail", e); }
    
    // Layer 2: Session Storage (Survives refreshes better in dev envs)
    try { sessionStorage.setItem(LIST_KEY, json); } catch(e) { console.error("SS Save fail", e); }
    
    // Layer 3: Window Name (Survives domain redirects often)
    try { 
        // We use a safe wrapper to not nuke other window name data if it exists
        const currentData = window.name && window.name.startsWith('{') ? JSON.parse(window.name) : {};
        currentData[LIST_KEY] = data;
        window.name = JSON.stringify(currentData);
    } catch(e) {
        // Fallback simple write
        try { window.name = JSON.stringify({ [LIST_KEY]: data }); } catch(z){}
    }
  },

  load: (): SavedProject[] => {
    let candidates: SavedProject[][] = [];
    
    // Try Local Storage
    try {
        const ls = localStorage.getItem(LIST_KEY);
        if (ls) candidates.push(JSON.parse(ls));
    } catch(e){}

    // Try Session Storage
    try {
        const ss = sessionStorage.getItem(LIST_KEY);
        if (ss) candidates.push(JSON.parse(ss));
    } catch(e){}

    // Try Window Name
    try {
        const wn = window.name ? JSON.parse(window.name) : {};
        if (wn[LIST_KEY] && Array.isArray(wn[LIST_KEY])) {
            candidates.push(wn[LIST_KEY]);
        }
    } catch(e){}

    if (candidates.length === 0) return [];

    // Return the candidate with the most items (Safest bet against partial wipes)
    candidates.sort((a, b) => b.length - a.length);
    console.log(`Hero45: Recovered ${candidates[0].length} projects from storage.`);
    return candidates[0];
  }
};

const DEFAULT_PROJECT_STATE: ProjectState = {
  objective: '',
  visualStyle: 'human',
  architecture: [],
  integrations: []
};

// --- Shared Components ---

const Sidebar: React.FC<{ onReset: () => void, onBackup: () => void }> = ({ onReset, onBackup }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="w-72 h-full flex flex-col bg-background-dark border-r border-white/5 shrink-0 z-20 hidden md:flex print:hidden no-print">
      <div className="p-8 pb-2">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-primary rounded-2xl size-12 flex items-center justify-center shadow-2xl shadow-primary/40">
            <span className="material-symbols-outlined text-white text-3xl">bolt</span>
          </div>
          <h1 className="text-white text-2xl font-black tracking-tighter italic">HERO45</h1>
        </div>
        <nav className="flex flex-col gap-2">
          <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/') && !location.search ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <span className="material-symbols-outlined">grid_view</span>
            <span className="text-sm font-bold">Librería</span>
          </Link>
          
          <Link to="/?filter=landings" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.search.includes('landings') ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <span className="material-symbols-outlined">web</span>
            <span className="text-sm font-bold">Landing Pages</span>
          </Link>

          <Link to="/create" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/create') ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <span className="material-symbols-outlined">auto_awesome</span>
            <span className="text-sm font-bold">Generador IA</span>
          </Link>

          <Link to="/admin" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all mt-4 border-t border-white/5 ${isActive('/admin') ? 'bg-white/5 text-white' : 'text-slate-500 hover:text-white'}`}>
             <span className="material-symbols-outlined">admin_panel_settings</span>
             <span className="text-sm font-bold">Admin / DB</span>
          </Link>
        </nav>
      </div>
      
      <div className="mt-auto p-8">
        <button 
          onClick={onBackup}
          className="w-full flex items-center gap-3 px-4 py-3 mb-4 rounded-xl bg-surface-highlight border border-white/5 text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-all"
        >
           <span className="material-symbols-outlined text-sm">save</span>
           BACKUP JSON
        </button>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-surface-highlight to-transparent border border-white/5 mb-6">
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Estado del Motor</p>
          <div className="flex items-center gap-2">
            <div className="size-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-bold text-white">Gemini 3 Pro Active</span>
          </div>
        </div>
        <Link 
          to="/create" 
          onClick={onReset}
          className="w-full flex items-center justify-center gap-2 rounded-2xl h-14 bg-primary hover:bg-primary-dark text-white text-sm font-black transition-all shadow-2xl shadow-primary/30 active:scale-95"
        >
          <span className="material-symbols-outlined">add</span>
          NUEVO PROYECTO
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
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const navigate = useNavigate();

  const toggleComponent = (id: string) => {
    setSelectedComponents(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    
    const steps = [
      "Analizando directrices de negocio...",
      "Estructurando Blueprint de conversión...",
      "Sintetizando identidad visual...",
      "Configurando módulos de datos...",
      "Compilando DNA del proyecto..."
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      setStatus(steps[currentStep]);
      currentStep++;
      if (currentStep >= steps.length) clearInterval(interval);
    }, 1200);

    try {
      let arch: string[] = [];
      
      // Decision Logic: Manual override vs AI Suggestion
      if (selectedComponents.length > 0) {
        // Use user selection, but sort it by the global component list order
        // This ensures the layout structure remains logical (e.g. Hero first, Footer last) 
        // regardless of the order the user clicked them.
        arch = COMPONENTS.filter(c => selectedComponents.includes(c.id)).map(c => c.id);
      } else {
        // 1. Suggest architecture (AI Mode)
        arch = await gemini.suggestArchitecture(prompt);
      }

      // 2. Pick a style
      const style = VISUAL_STYLES[Math.floor(Math.random() * VISUAL_STYLES.length)].id;
      // 3. Generate thumbnail
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
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-grid-pattern overflow-y-auto print:hidden">
      <div className="max-w-3xl w-full flex flex-col gap-10">
        <div className="text-center flex flex-col gap-4">
          <h1 className="text-6xl font-black text-white tracking-tighter leading-tight">Generación <span className="text-primary italic">Instantánea</span></h1>
          <p className="text-text-secondary text-xl">Danos una directriz mínima. Nosotros construimos la potencia.</p>
        </div>

        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-surface-darker rounded-[2rem] border border-white/5 p-8 shadow-2xl">
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
              className="w-full min-h-[120px] bg-transparent border-none text-white text-2xl font-medium focus:ring-0 placeholder:text-slate-700 resize-none no-scrollbar"
              placeholder="Ej: Una landing para un SaaS de gestión de flotas con tono profesional y oscuro..."
            />
            
            {/* Component Selector */}
            <div className="mt-4 border-t border-white/5 pt-6 pb-2">
                <div className="flex items-center justify-between mb-4">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                       <span className="material-symbols-outlined text-sm">tune</span> 
                       Blueprint IA <span className={selectedComponents.length > 0 ? "text-primary" : "text-slate-600"}>({selectedComponents.length > 0 ? 'Manual' : 'Automático'})</span>
                    </label>
                    {selectedComponents.length > 0 && (
                        <button onClick={() => setSelectedComponents([])} className="text-[10px] text-primary hover:text-white transition-colors font-bold uppercase">
                            Restaurar Automático
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {COMPONENTS.map(c => (
                        <button
                            key={c.id}
                            onClick={() => toggleComponent(c.id)}
                            disabled={isGenerating}
                            className={`text-left px-3 py-2 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-2 disabled:opacity-50 ${
                                selectedComponents.includes(c.id)
                                ? 'bg-primary/20 border-primary text-white'
                                : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10 hover:text-slate-300'
                            }`}
                        >
                            <span className="material-symbols-outlined text-sm">{c.icon}</span>
                            {c.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
              <div className="flex gap-2">
                {['SaaS', 'App', 'Portfolio'].map(tag => (
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
                  <><span className="material-symbols-outlined">rocket_launch</span> GENERAR AHORA</>
                )}
              </button>
            </div>
          </div>
        </div>

        {!isGenerating && (
          <div className="grid grid-cols-3 gap-6 opacity-40 hover:opacity-100 transition-opacity">
            {[
              { t: 'Compilación Automática', d: 'Arquitectura sugerida por Gemini Pro.' },
              { t: 'DNA Visual', d: 'Estética generada por Imagen 3.' },
              { t: 'Ready to Deploy', d: 'Exportación a Base44 en un click.' }
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

// --- Editor Screen ---

const EditorScreen: React.FC<{ projects: SavedProject[], onUpdate: (p: SavedProject) => void }> = ({ projects, onUpdate }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<SavedProject | null>(null);
  
  // State for form fields
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [visualStyle, setVisualStyle] = useState('');
  const [architecture, setArchitecture] = useState<string[]>([]);

  useEffect(() => {
    const found = projects.find(p => p.id === id);
    if (found) {
      setProject(found);
      setTitle(found.title);
      setObjective(found.objective);
      setVisualStyle(found.visualStyle);
      setArchitecture(found.architecture);
    } else {
      // If project not found in current state, try loading from StorageManager directly as fallback before redirecting
      // This helps if deep linking into edit page after a hard refresh
      const freshData = StorageManager.load();
      const freshFound = freshData.find(p => p.id === id);
      if (freshFound) {
          setProject(freshFound);
          setTitle(freshFound.title);
          setObjective(freshFound.objective);
          setVisualStyle(freshFound.visualStyle);
          setArchitecture(freshFound.architecture);
      } else {
          navigate('/');
      }
    }
  }, [id, projects, navigate]);

  const handleSave = () => {
    if (project) {
      onUpdate({
        ...project,
        title,
        objective,
        visualStyle,
        architecture
      });
      navigate('/success'); // Go back to viewer
    }
  };

  const toggleComponent = (compId: string) => {
    setArchitecture(prev => 
      prev.includes(compId) ? prev.filter(c => c !== compId) : [...prev, compId]
    );
  };

  if (!project) return null;

  return (
    <div className="flex-1 flex flex-col bg-background-dark overflow-hidden print:hidden">
      <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Editar Proyecto</h2>
          <p className="text-xs text-slate-500 font-mono">{project.id}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate(-1)} className="px-6 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-white/5">Cancelar</button>
          <button onClick={handleSave} className="px-6 py-2 rounded-xl bg-primary text-white text-xs font-black shadow-lg hover:bg-primary-dark">GUARDAR CAMBIOS</button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Main Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-primary uppercase tracking-widest">Nombre del Proyecto</label>
              <input 
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-surface-dark border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:border-primary focus:ring-0"
              />
            </div>
             <div className="space-y-4">
              <label className="text-[10px] font-black text-primary uppercase tracking-widest">Estilo Visual</label>
              <select 
                value={visualStyle} 
                onChange={e => setVisualStyle(e.target.value)}
                className="w-full bg-surface-dark border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:border-primary focus:ring-0"
              >
                {VISUAL_STYLES.map(style => (
                  <option key={style.id} value={style.id}>{style.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
             <label className="text-[10px] font-black text-primary uppercase tracking-widest">Objetivo (Prompt Original)</label>
             <textarea 
                value={objective}
                onChange={e => setObjective(e.target.value)}
                className="w-full h-32 bg-surface-dark border border-white/5 rounded-xl px-4 py-3 text-slate-300 text-sm leading-relaxed focus:border-primary focus:ring-0 resize-none"
             />
          </div>

          {/* Architecture Builder */}
          <div className="space-y-6 pt-6 border-t border-white/5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-white">Arquitectura & Módulos</h3>
              <span className="text-xs text-slate-500">{architecture.length} módulos activos</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {COMPONENTS.map(comp => {
                const isActive = architecture.includes(comp.id);
                return (
                  <button
                    key={comp.id}
                    onClick={() => toggleComponent(comp.id)}
                    className={`p-4 rounded-xl border flex flex-col items-start gap-3 transition-all ${
                      isActive 
                        ? 'bg-primary/20 border-primary text-white shadow-lg shadow-primary/10' 
                        : 'bg-surface-dark border-white/5 text-slate-500 hover:border-white/20 hover:text-slate-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-2xl">{comp.icon}</span>
                    <div className="text-left">
                      <div className="text-xs font-black">{comp.name}</div>
                      <div className="text-[10px] opacity-60 uppercase tracking-wider">{comp.group}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// --- Admin / Database Screen ---

const AdminScreen: React.FC<{ projects: SavedProject[], setProjects: React.Dispatch<React.SetStateAction<SavedProject[]>>, onClear: () => void, onImport: (d: SavedProject[]) => void }> = ({ projects, setProjects, onClear, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportDB = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projects, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `hero45_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset to allow re-selection
        fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let json;
        try {
            json = JSON.parse(content);
        } catch (parseErr) {
            alert("El archivo seleccionado no es un JSON válido.");
            return;
        }
        
        // 1. Normalize input to Array
        let candidates: any[] = [];
        if (Array.isArray(json)) {
            candidates = json;
        } else if (typeof json === 'object' && json !== null) {
            candidates = [json];
        }

        if (candidates.length === 0) {
            alert("No se encontraron datos en el archivo.");
            return;
        }

        // 2. Auto-repair and validate projects
        const repairedProjects: SavedProject[] = candidates.map((p, index) => {
            // Heuristic: Must have at least one meaningful field to be considered a project
            const isProjectLike = p.objective || p.architecture || p.visualStyle || p.title || p.id;
            
            if (!isProjectLike) return null;

            // Restore/Default missing fields
            return {
                id: p.id || `restored_${Date.now()}_${index}`,
                title: p.title || (p.objective ? p.objective.slice(0, 20) + '...' : `Proyecto Importado ${index + 1}`),
                objective: p.objective || '',
                visualStyle: p.visualStyle || 'human',
                architecture: Array.isArray(p.architecture) ? p.architecture : [],
                integrations: Array.isArray(p.integrations) ? p.integrations : [],
                createdAt: p.createdAt || Date.now(),
                thumbnail: p.thumbnail || '' // Allowed to be empty
            } as SavedProject;
        }).filter(Boolean) as SavedProject[];

        if (repairedProjects.length === 0) {
            alert("El archivo no contiene proyectos válidos de Hero45.");
            return;
        }

        // 3. Merge Logic (Add new, skip duplicates by ID)
        const currentIds = new Set(projects.map(p => p.id));
        const newProjects = repairedProjects.filter(p => !currentIds.has(p.id));

        if (newProjects.length === 0) {
            alert("Todos los proyectos del archivo ya existen en tu librería.");
            return;
        }

        const updatedList = [...newProjects, ...projects];
        onImport(updatedList);
        alert(`Éxito: Se han importado ${newProjects.length} proyectos a tu librería.`);
        
      } catch (err: any) {
        console.error(err);
        alert("Error crítico al procesar el archivo: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleClearDB = () => {
    if(confirm("¡PELIGRO! ¿Estás seguro de que quieres borrar TODOS los proyectos? Esta acción no se puede deshacer.")) {
        onClear();
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-background-dark p-10 overflow-y-auto print:hidden">
        <h2 className="text-3xl font-black text-white mb-2">Administrador de Base de Datos</h2>
        <p className="text-slate-400 mb-8">Gestiona, respalda y restaura tus proyectos generados.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-surface-dark border border-white/5 p-6 rounded-2xl flex flex-col gap-4">
                <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">download</span>
                </div>
                <div>
                    <h3 className="text-white font-bold">Exportar Backup</h3>
                    <p className="text-xs text-slate-500 mt-1">Descarga un archivo .json con todos tus proyectos.</p>
                </div>
                <button onClick={handleExportDB} className="mt-auto w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black text-white uppercase tracking-widest transition-colors">
                    Descargar DB
                </button>
            </div>

            <div className="bg-surface-dark border border-white/5 p-6 rounded-2xl flex flex-col gap-4 relative">
                <div className="size-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                    <span className="material-symbols-outlined">upload</span>
                </div>
                <div>
                    <h3 className="text-white font-bold">Importar / Restaurar</h3>
                    <p className="text-xs text-slate-500 mt-1">Sube un backup .json o un proyecto individual.</p>
                </div>
                
                {/* Visual hidden input ensuring accessibility and functionality */}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept=".json" 
                    style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
                />
                <button 
                    onClick={handleImportClick} 
                    className="mt-auto w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black text-white uppercase tracking-widest transition-colors cursor-pointer"
                >
                    Subir Archivo
                </button>
            </div>

            <div className="bg-surface-dark border border-red-500/10 p-6 rounded-2xl flex flex-col gap-4">
                <div className="size-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                    <span className="material-symbols-outlined">delete_forever</span>
                </div>
                <div>
                    <h3 className="text-white font-bold">Purga Total</h3>
                    <p className="text-xs text-slate-500 mt-1">Elimina todos los registros de la memoria del navegador.</p>
                </div>
                <button onClick={handleClearDB} className="mt-auto w-full py-3 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-xl text-xs font-black text-red-500 uppercase tracking-widest transition-colors">
                    Borrar Todo
                </button>
            </div>
        </div>

        <h3 className="text-xl font-black text-white mb-6">Registro de Datos ({projects.length})</h3>
        <div className="bg-surface-dark border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <tr>
                        <th className="p-4">ID</th>
                        <th className="p-4">Proyecto</th>
                        <th className="p-4">Fecha</th>
                        <th className="p-4">Estilo</th>
                        <th className="p-4">Módulos</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {projects.map(p => (
                        <tr key={p.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-4 text-xs font-mono text-slate-500">{p.id.slice(0, 8)}...</td>
                            <td className="p-4 text-sm font-bold text-white">{p.title}</td>
                            <td className="p-4 text-xs text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                            <td className="p-4 text-xs text-slate-400 capitalize">{p.visualStyle}</td>
                            <td className="p-4 text-xs text-slate-400">{p.architecture.length}</td>
                        </tr>
                    ))}
                    {projects.length === 0 && (
                        <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-500 text-sm">Base de datos vacía.</td>
                        </tr>
                    )}
                </tbody>
            </table>
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

  const handleExportJSON = () => {
    if (!project) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${project.title.replace(/\s+/g, '_').toLowerCase()}_hero45.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleDownloadPDF = () => {
    if (!project) return;

    // Remove existing if any (clean start)
    const existing = document.getElementById('print_iframe');
    if (existing) document.body.removeChild(existing);

    // Create an invisible iframe for printing
    const iframe = document.createElement('iframe');
    iframe.id = 'print_iframe';
    // Use fixed/opacity method to ensure visibility for print engines but hidden from user
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px'; 
    iframe.style.top = '0px';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.opacity = '0.01'; 
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    // Get architecture names
    const archList = project.architecture.map(id => {
       const comp = COMPONENTS.find(c => c.id === id);
       return comp ? `<div class="tag">${comp.icon} ${comp.name}</div>` : '';
    }).join('');

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hero45 - ${project.title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Fira+Code&family=Material+Symbols+Outlined" rel="stylesheet"/>
        <style>
          @page { margin: 2cm; size: A4; }
          body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; color: #000; background: #fff; max-width: 800px; margin: 0 auto; }
          h1 { font-size: 36px; font-weight: 900; margin-bottom: 5px; letter-spacing: -0.05em; text-transform: uppercase; }
          .meta { font-size: 12px; color: #666; margin-bottom: 30px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; }
          
          .image-container { margin-bottom: 30px; border-radius: 12px; overflow: hidden; border: 1px solid #ddd; }
          img { width: 100%; height: auto; display: block; }
          
          .section { margin-bottom: 40px; }
          h2 { font-size: 16px; font-weight: 900; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; text-transform: uppercase; }
          
          .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
          .tag { border: 1px solid #ddd; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 8px; background: #f9f9f9; }
          
          pre { background: #f4f4f5; padding: 20px; border-radius: 8px; font-family: 'Fira Code', monospace; font-size: 11px; white-space: pre-wrap; line-height: 1.5; border: 1px solid #e4e4e7; }
          
          .footer { margin-top: 50px; pt: 20px; border-top: 1px solid #eee; font-size: 10px; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <div class="meta">Hero45 Generated Report • ${new Date().toLocaleDateString()}</div>
        <h1>${project.title}</h1>
        <div class="meta">ID: ${project.id}</div>
        
        <div class="image-container">
          <img src="${project.thumbnail}" alt="Thumbnail" />
        </div>

        <div class="section">
           <h2>Blueprint Architecture</h2>
           <div class="grid">
              ${archList}
           </div>
        </div>

        <div class="section">
           <h2>Technical Specification (Base44)</h2>
           <pre>${fullPrompt || "// Loading specifications..."}</pre>
        </div>
        
        <div class="footer">Generated by Hero45 AI Engine</div>
      </body>
      </html>
    `;

    doc.open();
    doc.write(content);
    doc.close();

    // TRIGGER PRINT LOGIC
    // We use a dual trigger strategy: wait for load, but also force timeout
    // This solves cases where external resources (fonts) hang or where browsers 
    // block 'load' events on hidden iframes.
    
    let isPrinted = false;

    const doPrint = () => {
        if (isPrinted) return;
        isPrinted = true;
        
        try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
        } catch (e) {
            console.error("Print error:", e);
            alert("No se pudo iniciar la impresión automática. Por favor intenta de nuevo o usa Ctrl+P.");
        }

        // Cleanup after delay
        setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        }, 3000); // Give time for the print dialog to register
    };

    iframe.onload = () => {
        // Add small delay to ensure rendering is complete
        setTimeout(doPrint, 300);
    };

    // Fallback trigger if onload hangs (e.g. font timeout)
    setTimeout(doPrint, 2000);
  };

  if (!project) return null;

  return (
    <div className="flex-1 flex flex-col items-center py-16 px-8 bg-background-dark overflow-y-auto">
      <div id="printable-content" className="max-w-5xl w-full flex flex-col gap-12">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-3">
            <div className="bg-primary/20 text-primary px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-primary/20 w-fit">Resultado Final</div>
            <h1 className="text-5xl font-black text-white">{project.title}</h1>
          </div>
          <button onClick={() => navigate('/')} className="bg-white text-black px-8 py-3 rounded-xl font-black text-sm hover:bg-slate-200 transition-all no-print">Ir a la Librería</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 flex flex-col gap-6">
             <div className="aspect-video rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl relative group bg-surface-dark">
                <img src={project.thumbnail} className="w-full h-full object-cover" />
             </div>
             <div className="bg-surface-darker rounded-[2rem] border border-white/5 p-8 flex flex-col gap-4">
                <h3 className="text-primary font-black text-xs uppercase tracking-widest flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">terminal</span> Prompt Técnico Base44
                </h3>
                
                <textarea 
                  readOnly 
                  className="w-full h-64 bg-transparent border-none focus:ring-0 text-slate-400 font-mono text-xs leading-relaxed resize-none" 
                  value={fullPrompt || "// Generando especificaciones técnicas..."}
                />
             </div>
          </div>
          
          <div className="flex flex-col gap-8">
            <div className="bg-surface-dark p-8 rounded-[2rem] border border-white/5 space-y-6 shadow-xl">
               <div className="flex items-center justify-between">
                  <h4 className="text-white font-black text-lg">Blueprint IA</h4>
               </div>
               <div className="space-y-4">
                  {project.architecture.map(id => (
                    <div key={id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                       <span className="material-symbols-outlined text-primary text-sm">{COMPONENTS.find(c => c.id === id)?.icon || 'view_module'}</span>
                       <span className="text-xs font-bold text-slate-300">{COMPONENTS.find(c => c.id === id)?.name || id}</span>
                    </div>
                  ))}
               </div>
            </div>
            
            <div className="bg-primary/10 border border-primary/20 p-8 rounded-[2rem] space-y-4 no-print">
               <h4 className="text-primary font-black text-lg">¿Qué sigue?</h4>
               <p className="text-xs text-slate-400 leading-relaxed">Este proyecto ha sido inyectado en tu base de datos local. Puedes clonarlo, editarlo o exportar el JSON para integrarlo en tu flujo de desarrollo.</p>
               <div className="grid grid-cols-2 gap-2">
                 <button onClick={() => navigate(`/edit/${project.id}`)} className="col-span-2 py-3 bg-white/5 border border-white/10 rounded-xl font-black text-xs text-white uppercase tracking-widest hover:bg-white/10 transition-colors">
                    Editar
                 </button>
                 <button onClick={handleExportJSON} className="py-3 bg-primary rounded-xl font-black text-xs text-white uppercase tracking-widest shadow-xl hover:bg-primary-dark transition-colors flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-sm">javascript</span> JSON
                 </button>
                 <button onClick={handleDownloadPDF} className="py-3 bg-white text-black rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-sm">picture_as_pdf</span> IMPRIMIR / PDF
                 </button>
               </div>
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
    <main className="flex-1 flex flex-col h-full bg-background-dark overflow-hidden relative print:hidden">
      <header className="px-10 py-8 flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-white/5 z-10">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter">Mi Librería</h2>
          <p className="text-text-secondary text-sm font-medium">Gestión de Proyectos Potenciados por IA</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-surface-dark px-4 py-2 rounded-xl border border-white/5 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">database</span>
            <span className="font-bold text-white">{projects.length} REGISTROS</span>
          </div>
          <button onClick={() => navigate('/create')} className="bg-primary px-6 py-2.5 rounded-xl font-black text-xs text-white shadow-lg hover:scale-105 transition-all">NUEVA GENERACIÓN</button>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto px-10 pb-20 pt-10 no-scrollbar">
        {projects.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-8 py-20">
             <div className="size-32 bg-white/5 rounded-full flex items-center justify-center border border-white/10 opacity-30">
                <span className="material-symbols-outlined text-6xl">rocket</span>
             </div>
             <div className="text-center flex flex-col gap-2">
               <h3 className="text-2xl font-black text-slate-400">Sin proyectos generados</h3>
               <p className="text-slate-600 font-medium">Usa el Generador IA para crear tu primera landing potente.</p>
             </div>
             <button onClick={() => navigate('/create')} className="bg-white text-black px-10 py-4 rounded-2xl font-black text-sm shadow-2xl">Empezar Ahora</button>
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
                       <span className="material-symbols-outlined text-4xl text-primary/30">auto_awesome</span>
                    </div>
                  )}
                  <div className="absolute top-5 left-5 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black text-white uppercase tracking-[0.2em] border border-white/10">POWER GEN</div>
                  
                  <div className="absolute top-5 right-5 flex gap-2 opacity-0 group-hover/card:opacity-100 transition-all">
                     <button 
                      onClick={(e) => { e.stopPropagation(); navigate(`/edit/${p.id}`); }}
                      className="size-10 rounded-full bg-white/10 text-white backdrop-blur-md flex items-center justify-center hover:bg-white hover:text-black transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id); }}
                      className="size-10 rounded-full bg-red-500/20 text-red-500 backdrop-blur-md flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>
                <div className="px-2">
                  <h4 className="text-white font-black text-xl truncate">{p.title}</h4>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                     <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">view_module</span> {p.architecture.length} SECCIONES</span>
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
  const [isLoaded, setIsLoaded] = useState(false);
  const isManualClearRef = useRef(false); // FLAG: Tracks if the user *explicitly* requested data deletion
  
  const [projects, setProjects] = useState<SavedProject[]>(() => {
     return StorageManager.load();
  });

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // BULLETPROOF SAVE SYSTEM
  useEffect(() => {
    if (!isLoaded) return; 
    
    // GUARD: If trying to save an empty array, check if we are about to overwrite existing data accidentally.
    if (projects.length === 0 && !isManualClearRef.current) {
        // Double check against storage directly
        const stored = StorageManager.load();
        if (stored.length > 0) {
            console.warn("Hero45 Safety: Detected potential data wipe. Restoring data instead of saving empty.");
            setProjects(stored); // Restore data
            return; // Abort save
        }
    }

    // Reset flag after successful intended save (if it was a clear)
    if (projects.length === 0 && isManualClearRef.current) {
        isManualClearRef.current = false;
    }
    
    StorageManager.save(projects);
  }, [projects, isLoaded]);

  const handleFinalize = (state: ProjectState, thumb: string) => {
    const newProject: SavedProject = {
      ...state,
      id: crypto.randomUUID(),
      title: state.objective.split(' ').slice(0, 4).join(' ') || "Nuevo Proyecto",
      createdAt: Date.now(),
      thumbnail: thumb
    };
    setProjects(prev => [newProject, ...prev]);
    setLastGenerated(newProject);
  };

  const updateProject = (updated: SavedProject) => {
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
    setLastGenerated(updated);
  };

  const deleteProject = (id: string) => {
    if(confirm("¿Eliminar permanentemente este registro de la base de datos?")) {
      setProjects(prev => {
        const next = prev.filter(p => p.id !== id);
        if (next.length === 0) isManualClearRef.current = true; // Flag intention to empty DB
        return next;
      });
      if (lastGenerated?.id === id) setLastGenerated(null);
    }
  };
  
  const clearDB = () => {
    isManualClearRef.current = true; // Flag intention
    setProjects([]);
    localStorage.removeItem(LIST_KEY);
    sessionStorage.removeItem(LIST_KEY);
  };

  const importDB = (imported: SavedProject[]) => {
    setProjects(imported);
  };

  const manualBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projects, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `hero45_full_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden bg-background-dark text-white font-display print:overflow-visible print:h-auto print:block">
        <Sidebar onReset={() => {}} onBackup={manualBackup} />
        <div className="flex-1 flex flex-col min-w-0 print:h-auto print:overflow-visible print:block">
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
            <Route path="/edit/:id" element={<EditorScreen projects={projects} onUpdate={updateProject} />} />
            <Route path="/admin" element={
              <AdminScreen 
                projects={projects} 
                setProjects={setProjects} 
                onClear={clearDB}
                onImport={importDB}
              />
            } />
          </Routes>
        </div>
      </div>
      <LiveAssistant />
    </HashRouter>
  );
};

export default App;
