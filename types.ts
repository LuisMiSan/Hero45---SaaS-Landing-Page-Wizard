
export interface Template {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  icon: string;
  category: string;
}

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

export enum WizardStep {
  Objective = 1,
  Architecture = 2,
  VisualStyle = 3,
  Functionality = 4,
  Summary = 5
}
