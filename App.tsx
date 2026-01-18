
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, useNavigate, Link, useLocation, useParams } from 'react-router-dom';
import { VISUAL_STYLES, COMPONENTS, INTEGRATIONS } from './constants.tsx';
import { ProjectState, SavedProject } from './types.ts';
import { gemini } from './services/geminiService.ts';
import { dbService } from './services/db.ts';
import { LiveAssistant } from './components/LiveAssistant.tsx';

// --- Shared Components ---

const Sidebar: React.FC<{ onReset: () => void, onBackup: () => void }> = ({ onReset, onBackup }) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentFilter = searchParams.get('filter');
  const isActive = (path: string) => location.pathname === path && !location.search;

  const isFilterActive = (filter: string) => currentFilter === filter;

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
          <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/') ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <span className="material-symbols-outlined">grid_view</span>
            <span className="text-sm font-bold">Librería</span>
          </Link>
          
          <Link to="/?filter=landings" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isFilterActive('landings') ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <span className="material-symbols-outlined">web</span>
            <span className="text-sm font-bold">Landing Pages</span>
          </Link>

          <Link to="/create" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname === '/create' ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <span className="material-symbols-outlined">auto_awesome</span>
            <span className="text-sm font-bold">Generador IA</span>
          </Link>

          {/* New Tags Section */}
          <div className="mt-6 px-4 mb-2">
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Etiquetas</span>
          </div>
          <div className="flex flex-col gap-1">
             <Link to="/?filter=saas" className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${isFilterActive('saas') ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
                <span className="text-xs font-bold text-primary">#</span>
                <span className="text-xs font-bold">SaaS</span>
             </Link>
             <Link to="/?filter=app" className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${isFilterActive('app') ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
                <span className="text-xs font-bold text-blue-400">#</span>
                <span className="text-xs font-bold">App</span>
             </Link>
             <Link to="/?filter=portfolio" className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${isFilterActive('portfolio') ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
                <span className="text-xs font-bold text-purple-400">#</span>
                <span className="text-xs font-bold">Portfolio</span>
             </Link>
          </div>

          <Link to="/admin" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all mt-6 border-t border-white/5 ${location.pathname === '/admin' ? 'bg-white/5 text-white' : 'text-slate-500 hover:text-white'}`}>
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
  const location = useLocation();
  // Initialize prompt from navigation state if available
  const [prompt, setPrompt] = useState((location.state as any)?.initialPrompt || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string>('');
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
        arch = COMPONENTS.filter(c => selectedComponents.includes(c.id)).map(c => c.id);
      } else {
        // 1. Suggest architecture (AI Mode)
        arch = await gemini.suggestArchitecture(prompt);
      }

      // 2. Pick a style (User Selected OR Random)
      const style = selectedStyle || VISUAL_STYLES[Math.floor(Math.random() * VISUAL_STYLES.length)].id;
      
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
      <div className="max-w-4xl w-full flex flex-col gap-10">
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
            
            {/* Style Selector */}
            <div className="mt-4 border-t border-white/5 pt-6">
                <div className="flex items-center justify-between mb-4">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                       <span className="material-symbols-outlined text-sm">palette</span> 
                       Estética Visual <span className={selectedStyle ? "text-primary" : "text-slate-600"}>({selectedStyle ? VISUAL_STYLES.find(s=>s.id === selectedStyle)?.name : 'Aleatorio'})</span>
                    </label>
                    {selectedStyle && (
                        <button onClick={() => setSelectedStyle('')} className="text-[10px] text-primary hover:text-white transition-colors font-bold uppercase">
                            Restaurar Aleatorio
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                   {VISUAL_STYLES.map(s => (
                     <button 
                        key={s.id}
                        onClick={() => setSelectedStyle(s.id === selectedStyle ? '' : s.id)}
                        disabled={isGenerating}
                        className={`relative group overflow-hidden rounded-xl border text-left transition-all h-24 ${selectedStyle === s.id ? 'border-primary ring-2 ring-primary/50' : 'border-white/10 hover:border-white/30'}`}
                     >
                       <div className="absolute inset-0">
                          <img src={s.img} className="w-full h-full object-cover opacity-50 group-hover:scale-110 transition-transform duration-700" alt={s.name}/>
                          <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent ${selectedStyle === s.id ? 'opacity-90' : 'opacity-100'}`} />
                       </div>
                       <div className="relative p-3 h-full flex flex-col justify-end">
                          <span className={`text-xs font-black ${selectedStyle === s.id ? 'text-white' : 'text-slate-200'}`}>{s.name}</span>
                          <span className="text-[10px] text-slate-400 leading-tight line-clamp-1">{s.desc}</span>
                       </div>
                       {s.recommended && !selectedStyle && (
                         <div className="absolute top-2 right-2 bg-primary text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-lg">Top</div>
                       )}
                     </button>
                   ))}
                </div>
            </div>

            {/* Component Selector */}
            <div className="mt-6 border-t border-white/5 pt-6 pb-2">
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
              { t: 'Database Local', d: 'Persistencia IndexedDB de alta capacidad.' }
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attempt to find in props first (fastest)
    const found = projects.find(p => p.id === id);
    if (found) {
      setProject(found);
      setTitle(found.title);
      setObjective(found.objective);
      setVisualStyle(found.visualStyle);
      setArchitecture(found.architecture);
      setLoading(false);
    } else {
        // Fallback to fetching entire DB if deep linked or reload
        dbService.getAllProjects().then(all => {
             const freshFound = all.find(p => p.id === id);
             if (freshFound) {
                setProject(freshFound);
                setTitle(freshFound.title);
                setObjective(freshFound.objective);
                setVisualStyle(freshFound.visualStyle);
                setArchitecture(freshFound.architecture);
             } else {
                 navigate('/');
             }
             setLoading(false);
        });
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

  if (loading) return <div className="flex h-full items-center justify-center text-white">Cargando proyecto...</div>;
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
    // Async fetching before export to ensure we have EVERYTHING from DB
    dbService.getAllProjects().then(allProjects => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allProjects, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `hero45_backup_${new Date().toISOString().slice(0,10)}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });
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

        const repairedProjects: SavedProject[] = candidates.map((p, index) => {
            const isProjectLike = p.objective || p.architecture || p.visualStyle || p.title || p.id;
            if (!isProjectLike) return null;

            return {
                id: p.id || `restored_${Date.now()}_${index}`,
                title: p.title || (p.objective ? p.objective.slice(0, 20) + '...' : `Proyecto Importado ${index + 1}`),
                objective: p.objective || '',
                visualStyle: p.visualStyle || 'human',
                architecture: Array.isArray(p.architecture) ? p.architecture : [],
                integrations: Array.isArray(p.integrations) ? p.integrations : [],
                createdAt: p.createdAt || Date.now(),
                thumbnail: p.thumbnail || '' 
            } as SavedProject;
        }).filter(Boolean) as SavedProject[];

        if (repairedProjects.length === 0) {
            alert("El archivo no contiene proyectos válidos de Hero45.");
            return;
        }

        onImport(repairedProjects);
        
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

  // New manual sync/recover handler
  const handleForceSync = async () => {
     try {
         const recovered = await dbService.getAllProjects();
         setProjects(recovered);
         alert(`Sincronización forzada completada. Se encontraron ${recovered.length} registros.`);
     } catch(e) {
         alert("Error al sincronizar");
     }
  }

  return (
    <div className="flex-1 flex flex-col bg-background-dark p-10 overflow-y-auto print:hidden">
        <h2 className="text-3xl font-black text-white mb-2">Administrador de Base de Datos</h2>
        <p className="text-slate-400 mb-8">Gestiona, respalda y restaura tus proyectos (IndexedDB + Mirror).</p>

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

            <div className="bg-surface-dark border border-white/5 p-6 rounded-2xl flex flex-col gap-4">
                <div className="size-12 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500">
                    <span className="material-symbols-outlined">sync</span>
                </div>
                <div>
                    <h3 className="text-white font-bold">Sincronización Forzada</h3>
                    <p className="text-xs text-slate-500 mt-1">Intenta recuperar datos perdidos del almacenamiento espejo.</p>
                </div>
                <button onClick={handleForceSync} className="mt-auto w-full py-3 bg-yellow-500/10 hover:bg-yellow-500 hover:text-white rounded-xl text-xs font-black text-yellow-500 uppercase tracking-widest transition-colors">
                    Recuperar Datos
                </button>
            </div>
            
            <div className="bg-surface-dark border border-red-500/10 p-6 rounded-2xl flex flex-col gap-4">
                <div className="size-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                    <span className="material-symbols-outlined">delete_forever</span>
                </div>
                <div>
                    <h3 className="text-white font-bold">Purga Total</h3>
                    <p className="text-xs text-slate-500 mt-1">Elimina todos los registros (DB + Mirror).</p>
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
  const [techSpec, setTechSpec] = useState('');
  const [loadingSpec, setLoadingSpec] = useState(false);

  useEffect(() => {
    if (!project) {
        navigate('/'); 
    }
  }, [project, navigate]);

  const handleGenerateSpec = async () => {
    if(!project) return;
    setLoadingSpec(true);
    try {
        const spec = await gemini.generateBase44Prompt(project);
        setTechSpec(spec || '');
    } catch(e) {
        console.error(e);
    }
    setLoadingSpec(false);
  }

  const handleExportJSON = () => {
    if (!project) return;
    // Include techSpec in the export if available
    const exportData = { ...project, techSpec };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${project.title.replace(/\s+/g, '_').toLowerCase()}_hero45.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleExportMarkdown = () => {
    if (!project) return;
    
    const archList = project.architecture.map(id => {
       const comp = COMPONENTS.find(c => c.id === id);
       return `- ${comp?.name || id} (${comp?.group || 'Module'})`;
    }).join('\n');

    const mdContent = `# ${project.title}
**ID:** ${project.id}
**Fecha:** ${new Date(project.createdAt).toLocaleDateString()}
**Estilo Visual:** ${project.visualStyle}

## Objetivo
${project.objective}

## Arquitectura del Sitio
${archList}

## Especificación Técnica (Base44)
\`\`\`
${techSpec || "// No generada aún"}
\`\`\`

---
Generated by Hero45 AI
`;

    const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(mdContent);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${project.title.replace(/\s+/g, '_').toLowerCase()}.md`);
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
           <pre>${techSpec || "// Technical specifications not generated yet."}</pre>
        </div>
        
        <div class="footer">Generated by Hero45 AI Engine</div>
      </body>
      </html>
    `;

    doc.open();
    doc.write(content);
    doc.close();

    const doPrint = () => {
        try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
        } catch (e) {
            console.error("Print error:", e);
            alert("Error al intentar imprimir. Usa Ctrl+P.");
        }
        setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        }, 3000); 
    };

    if (project.thumbnail) {
        const img = new Image();
        img.src = project.thumbnail;
        img.onload = () => setTimeout(doPrint, 500);
        img.onerror = () => setTimeout(doPrint, 500);
    } else {
        setTimeout(doPrint, 500);
    }
  };

  if (!project) return null;

  return (
    <div className="flex-1 flex flex-col bg-background-dark p-8 overflow-y-auto print:hidden">
       <div className="max-w-4xl mx-auto w-full space-y-8">
          <div className="text-center space-y-4">
             <div className="inline-flex items-center justify-center p-4 rounded-full bg-green-500/20 text-green-500 mb-4">
                <span className="material-symbols-outlined text-4xl">check_circle</span>
             </div>
             <h1 className="text-4xl font-black text-white">¡Proyecto Generado!</h1>
             <p className="text-slate-400">Tu blueprint está listo para producción.</p>
          </div>

          <div className="bg-surface-dark border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
             {project.thumbnail && (
                 <div className="w-full h-64 bg-black relative">
                     <img src={project.thumbnail} className="w-full h-full object-cover opacity-80" alt="Preview" />
                     <div className="absolute inset-0 bg-gradient-to-t from-surface-dark to-transparent"></div>
                     <div className="absolute bottom-6 left-6">
                        <h2 className="text-3xl font-black text-white">{project.title}</h2>
                        <span className="text-xs font-bold text-primary uppercase tracking-widest">{project.visualStyle} Style</span>
                     </div>
                 </div>
             )}
             
             <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">Arquitectura</h3>
                    <div className="flex flex-wrap gap-2">
                        {project.architecture.map(arch => {
                            const comp = COMPONENTS.find(c => c.id === arch);
                            return (
                                <span key={arch} className="px-3 py-1.5 rounded-lg bg-white/5 text-xs font-bold text-slate-300 border border-white/5">
                                    {comp?.name || arch}
                                </span>
                            )
                        })}
                    </div>
                 </div>
                 
                 <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">Integraciones</h3>
                     <div className="flex flex-wrap gap-2">
                        {project.integrations.map(intId => {
                            const integration = INTEGRATIONS.find(i => i.id === intId);
                            return (
                                <span key={intId} className="px-3 py-1.5 rounded-lg bg-white/5 text-xs font-bold text-slate-300 border border-white/5 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">{integration?.icon || 'extension'}</span>
                                    {integration?.name || intId}
                                </span>
                            )
                        })}
                        {project.integrations.length === 0 && <span className="text-slate-600 text-xs italic">Sin integraciones externas.</span>}
                    </div>
                 </div>
             </div>

             <div className="p-8 border-t border-white/5 bg-black/20">
                <div className="flex items-center justify-between mb-4">
                     <h3 className="text-sm font-black text-white uppercase tracking-widest">Especificación Técnica (Base44)</h3>
                     {!techSpec && (
                        <button 
                            onClick={handleGenerateSpec} 
                            disabled={loadingSpec}
                            className="text-[10px] font-black text-primary uppercase hover:text-white transition-colors flex items-center gap-2"
                        >
                            {loadingSpec ? 'Generando...' : 'Generar Spec con Gemini'}
                            <span className="material-symbols-outlined text-sm">auto_awesome</span>
                        </button>
                     )}
                </div>
                
                {techSpec ? (
                    <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                        <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap">{techSpec}</pre>
                    </div>
                ) : (
                    <div className="h-32 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-slate-600 text-xs font-medium">
                        Genera la documentación técnica para desarrolladores.
                    </div>
                )}
             </div>
          </div>

          <div className="flex flex-wrap gap-4 justify-center mt-8 pt-8 border-t border-white/5 w-full max-w-2xl mx-auto">
             <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all shadow-lg">
                <span className="material-symbols-outlined text-lg">picture_as_pdf</span> Imprimir PDF
             </button>
             <div className="flex bg-white/5 rounded-xl border border-white/10 p-1">
                 <button onClick={handleExportJSON} className="px-5 py-2 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">data_object</span> JSON
                 </button>
                 <div className="w-px bg-white/10 my-1"></div>
                 <button onClick={handleExportMarkdown} className="px-5 py-2 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">markdown</span> Markdown
                 </button>
             </div>
          </div>
          
          <div className="flex gap-4 justify-center">
             <button onClick={() => navigate('/')} className="px-8 py-4 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                Volver al Dashboard
             </button>
             <button onClick={() => navigate(`/edit/${project.id}`)} className="px-8 py-4 rounded-xl bg-primary text-white font-black shadow-xl hover:scale-105 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined">edit</span>
                Editar Proyecto
             </button>
          </div>
       </div>
    </div>
  );
};

// --- Dashboard ---

const DashboardScreen: React.FC<{ projects: SavedProject[], onOpenProject: (p: SavedProject) => void, onDeleteProject: (id: string) => void, loading: boolean }> = ({ projects, onOpenProject, onDeleteProject, loading }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const filter = query.get('filter');
  const [quickPrompt, setQuickPrompt] = useState('');

  const filteredProjects = projects.filter(p => {
    if (!filter) return true;
    if (filter === 'landings') return p.title.toLowerCase().includes('landing') || p.objective.toLowerCase().includes('landing');
    
    const term = filter.toLowerCase();
    // Simple naive search in title and objective string
    return p.title.toLowerCase().includes(term) || p.objective.toLowerCase().includes(term);
  });

  const handleQuickStart = () => {
    if (!quickPrompt.trim()) return;
    navigate('/create', { state: { initialPrompt: quickPrompt } });
  };

  return (
    <main className="flex-1 flex flex-col h-full bg-background-dark overflow-hidden relative print:hidden">
      <header className="px-10 py-8 flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-white/5 z-10">
        <div>
          <div className="flex items-center gap-3">
             <h2 className="text-4xl font-black text-white tracking-tighter">Mi Librería</h2>
             {filter && (
                <span className="bg-primary/20 text-primary border border-primary/20 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                    #{filter}
                </span>
             )}
          </div>
          <p className="text-text-secondary text-sm font-medium">Gestión de Proyectos Potenciados por IA (IndexedDB + Mirror)</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-surface-dark px-4 py-2 rounded-xl border border-white/5 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">database</span>
            {filter ? (
                <span className="font-bold text-white"><span className="text-slate-400">{filteredProjects.length} de</span> {projects.length} REGISTROS</span>
            ) : (
                <span className="font-bold text-white">{projects.length} REGISTROS</span>
            )}
          </div>
          <button onClick={() => navigate('/create')} className="bg-primary px-6 py-2.5 rounded-xl font-black text-xs text-white shadow-lg hover:scale-105 transition-all">NUEVA GENERACIÓN</button>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto px-10 pb-20 pt-10 no-scrollbar">
        {/* NEW INPUT WINDOW - QUICK CREATOR */}
        <div className="mb-10 bg-gradient-to-br from-surface-darker to-surface-dark border border-white/5 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
             <div className="relative z-10">
                 <h2 className="text-2xl font-black text-white mb-2">¿Qué quieres crear hoy?</h2>
                 <p className="text-slate-400 text-sm mb-6">Describe tu idea (Landing, SaaS, Portfolio...) y la Inteligencia Artificial generará la estructura por ti.</p>
                 <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                    <div className="relative">
                        <textarea 
                            value={quickPrompt}
                            onChange={(e) => setQuickPrompt(e.target.value)}
                            placeholder="Ej: Una landing page moderna para una app de fitness con modo oscuro..."
                            className="w-full bg-background-dark border border-white/10 rounded-xl p-5 text-lg font-medium text-white placeholder:text-slate-600 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none shadow-inner h-32"
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleQuickStart(); } }}
                        />
                        <button 
                            onClick={handleQuickStart}
                            disabled={!quickPrompt.trim()}
                            className="absolute bottom-4 right-4 bg-primary hover:bg-primary-dark text-white p-2.5 rounded-xl transition-all shadow-lg hover:scale-110 disabled:opacity-50 disabled:hover:scale-100"
                        >
                            <span className="material-symbols-outlined">auto_awesome</span>
                        </button>
                    </div>
                 </div>
                 <div className="flex gap-3 mt-4 overflow-x-auto no-scrollbar">
                    {['#SaaS', '#Landing Page', '#Portfolio', '#E-commerce', '#Mobile App'].map(tag => (
                         <button 
                            key={tag}
                            onClick={() => setQuickPrompt(prev => prev ? `${prev} ${tag}` : tag)} 
                            className="px-4 py-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 text-xs font-bold text-slate-400 hover:text-white transition-all whitespace-nowrap"
                         >
                            {tag}
                         </button>
                    ))}
                 </div>
             </div>
        </div>

        {loading ? (
           <div className="h-full flex flex-col items-center justify-center">
              <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Cargando Base de Datos...</p>
           </div>
        ) : filteredProjects.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-8 py-20">
             <div className="size-32 bg-white/5 rounded-full flex items-center justify-center border border-white/10 opacity-30">
                <span className="material-symbols-outlined text-6xl">filter_alt_off</span>
             </div>
             <div className="text-center flex flex-col gap-2">
               <h3 className="text-2xl font-black text-slate-400">Sin coincidencias</h3>
               <p className="text-slate-600 font-medium">No hay proyectos que coincidan con el filtro "{filter}".</p>
               {projects.length > 0 && (
                   <p className="text-slate-600 text-xs">Tienes otros {projects.length} proyectos guardados en tu librería.</p>
               )}
             </div>
             <div className="flex gap-4">
                 <button onClick={() => navigate('/')} className="px-6 py-3 rounded-xl border border-white/10 text-white font-bold text-xs hover:bg-white/5">Limpiar Filtros</button>
             </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
            {filteredProjects.map(p => (
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
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [loading, setLoading] = useState(true);

  // Load from DB on mount
  useEffect(() => {
    dbService.getAllProjects().then((data) => {
        setProjects(data);
        setLoading(false);
    }).catch(err => {
        console.error("Failed to load DB", err);
        setLoading(false);
    });
  }, []);

  const handleFinalize = async (state: ProjectState, thumb: string) => {
    const newProject: SavedProject = {
      ...state,
      id: crypto.randomUUID(),
      title: state.objective.split(' ').slice(0, 4).join(' ') || "Nuevo Proyecto",
      createdAt: Date.now(),
      thumbnail: thumb
    };
    
    // Save to DB first, then update UI
    await dbService.saveProject(newProject);
    setProjects(prev => [newProject, ...prev]);
    setLastGenerated(newProject);
  };

  const updateProject = async (updated: SavedProject) => {
    await dbService.saveProject(updated);
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
    setLastGenerated(updated);
  };

  const deleteProject = async (id: string) => {
    if(confirm("¿Eliminar permanentemente este registro de la base de datos?")) {
      await dbService.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      if (lastGenerated?.id === id) setLastGenerated(null);
    }
  };
  
  const clearDB = async () => {
    await dbService.clearDatabase();
    setProjects([]);
  };

  const importDB = async (imported: SavedProject[]) => {
    // Save all to DB
    await dbService.importBulk(imported);
    // Reload state to ensure UI matches DB sort order/state
    const freshData = await dbService.getAllProjects();
    setProjects(freshData);
  };

  const manualBackup = () => {
    // This is just a UI trigger helper passed to sidebar
    // The actual implementation is in AdminScreen usually, but we can quick trigger
    dbService.getAllProjects().then(all => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(all, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `hero45_full_backup_${new Date().toISOString().slice(0,10)}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });
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
                loading={loading}
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
