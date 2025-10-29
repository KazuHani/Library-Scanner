
export interface Book {
  id: string; // ISBN
  title: string;
  authors: string[];
  coverUrl?: string;
}

export type View = 'library' | 'scanner';
