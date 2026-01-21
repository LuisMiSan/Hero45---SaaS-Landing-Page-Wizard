
import { SavedProject } from '../types';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy,
  writeBatch,
  enableIndexedDbPersistence
} from 'firebase/firestore';

// --- IMPORTANTE: CONFIGURACIÓN DE FIREBASE ---
// Si ves errores en la consola, es probable que no hayas sustituido estos valores.
// 1. Ve a https://console.firebase.google.com
// 2. Crea un proyecto > Configuración del proyecto > General > Tus aplicaciones > SDK setup y configuración
// 3. Copia el objeto `firebaseConfig` y reemplaza el de abajo.

const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROYECTO.firebasestorage.app",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

// Inicialización
let db: any = null;

try {
  // Validación simple para evitar errores confusos si el usuario no ha configurado Firebase
  if (firebaseConfig.apiKey === "TU_API_KEY_AQUI") {
      console.warn("⚠️ HERO45 WARNING: Firebase no está configurado. La base de datos no funcionará hasta que edites 'services/db.ts' con tus credenciales reales.");
  } else {
      const app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      
      // Intentar habilitar persistencia offline (puede fallar si hay múltiples pestañas abiertas)
      enableIndexedDbPersistence(db).catch((err) => {
          if (err.code === 'failed-precondition') {
              console.warn("Firebase Persistence: Multiple tabs open, persistence can only be enabled in one tab at a a time.");
          } else if (err.code === 'unimplemented') {
              console.warn("Firebase Persistence: The current browser does not support all of the features required to enable persistence");
          }
      });
      console.log("✅ Firebase Connected Successfully");
  }
} catch (e) {
  console.error("🔥 Error initializing Firebase:", e);
}

const COLLECTION_NAME = 'projects';

class DatabaseService {
  
  // Fetch from Firestore Cloud
  async getAllProjects(): Promise<SavedProject[]> {
    if (!db) {
        console.warn("DB not initialized. Returning empty list.");
        return [];
    }
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as SavedProject);
    } catch (e) {
      console.error("Firebase Read Error:", e);
      return [];
    }
  }

  // Save to Firestore Cloud
  async saveProject(project: SavedProject): Promise<void> {
    if (!db) {
        alert("Error: Firebase no está configurado. No se pueden guardar datos.");
        return;
    }
    try {
      // Use setDoc with merge to create or update
      await setDoc(doc(db, COLLECTION_NAME, project.id), project, { merge: true });
    } catch (e) {
      console.error("Firebase Save Error:", e);
      throw e;
    }
  }

  // Delete from Firestore Cloud
  async deleteProject(id: string): Promise<void> {
    if (!db) return;
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (e) {
      console.error("Firebase Delete Error:", e);
      throw e;
    }
  }

  // Batch delete (Clear DB)
  async clearDatabase(): Promise<void> {
    if (!db) return;
    try {
        const q = query(collection(db, COLLECTION_NAME));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        
        snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        });

        await batch.commit();
    } catch(e) {
        console.error("Firebase Clear Error", e);
    }
  }
  
  // Batch import
  async importBulk(projects: SavedProject[]): Promise<void> {
    if (!db) return;
    try {
        const batch = writeBatch(db);
        
        projects.forEach(project => {
        const ref = doc(db, COLLECTION_NAME, project.id);
        batch.set(ref, project);
        });

        await batch.commit();
    } catch(e) {
        console.error("Firebase Import Error", e);
    }
  }
}

export const dbService = new DatabaseService();
