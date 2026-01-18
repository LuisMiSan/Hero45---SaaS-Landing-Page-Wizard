
export interface ProjectState {
  objective: string;
  visualStyle: string;
  architecture: string[];
  integrations: string[];
}

export interface SavedProject extends ProjectState {
  id: string;
  title: string;
  createdAt: number;
  thumbnail?: string;
}
