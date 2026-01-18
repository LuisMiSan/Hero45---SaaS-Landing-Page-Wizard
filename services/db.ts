
import { SavedProject } from '../types';

const DB_NAME = 'Hero45_Database';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

class DatabaseService {
  private db: IDBDatabase | null = null;

  constructor() {
    this.initPersistence();
  }

  // Request persistent storage to prevent browser eviction
  private async initPersistence() {
    if (navigator.storage && navigator.storage.persist) {
      try {
        const isPersisted = await navigator.storage.persist();
        console.log(`Storage Persistence Granted: ${isPersisted}`);
      } catch (e) {
        console.warn("Persistence request failed", e);
      }
    }
  }

  private async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error("IndexedDB Open Error:", (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  // Internal: Fetch purely from IDB
  private async getFromIDB(): Promise<SavedProject[]> {
    try {
        const db = await this.open();
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_NAME, 'readonly');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.getAll();

          request.onsuccess = () => {
            const results = request.result as SavedProject[];
            resolve(results || []);
          };
          request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("Internal IDB Fetch Error", e);
        return [];
    }
  }

  // Public: Fetch with Auto-Recovery strategy
  async getAllProjects(): Promise<SavedProject[]> {
    // 1. Try IndexedDB
    let items = await this.getFromIDB();
    
    // 2. If empty, check LocalStorage Mirror (Safety Net)
    if (items.length === 0) {
        const mirror = localStorage.getItem('hero45_mirror');
        if (mirror) {
            try {
                const recovered = JSON.parse(mirror);
                if (Array.isArray(recovered) && recovered.length > 0) {
                    console.warn("⚠️ IndexedDB was empty. Recovering data from LocalStorage Mirror.");
                    
                    // Re-populate IndexedDB immediately
                    await this.importBulk(recovered);
                    return recovered.sort((a, b) => b.createdAt - a.createdAt);
                }
            } catch (e) {
                console.error("Mirror recovery failed", e);
            }
        }
    }

    // 3. Always update LocalStorage Mirror with what we found (if we found something new in IDB that wasn't in LS)
    if (items.length > 0) {
        this.updateMirror(items);
    }

    return items.sort((a, b) => b.createdAt - a.createdAt);
  }

  private updateMirror(projects: SavedProject[]) {
      try {
          localStorage.setItem('hero45_mirror', JSON.stringify(projects));
      } catch (e) {
          // If quota exceeded, try removing thumbnails
          try {
              const lean = projects.map(p => ({ ...p, thumbnail: '' }));
              localStorage.setItem('hero45_mirror', JSON.stringify(lean));
              console.warn("LocalStorage full, saved lean mirror (no images).");
          } catch (e2) {
              console.error("LocalStorage completely full", e2);
          }
      }
  }

  async saveProject(project: SavedProject): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(project);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Sync to mirror
    const all = await this.getFromIDB();
    this.updateMirror(all);
  }

  async deleteProject(id: string): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Sync to mirror
    const all = await this.getFromIDB();
    this.updateMirror(all);
  }

  async clearDatabase(): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Clear mirror
    localStorage.removeItem('hero45_mirror');
  }
  
  async importBulk(projects: SavedProject[]): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);

        projects.forEach(project => {
            store.put(project);
        });
    });

    // Update mirror
    this.updateMirror(projects);
  }
}

export const dbService = new DatabaseService();
