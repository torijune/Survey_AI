// lib/types.ts
export interface News {
  id: string;
  title: string;
  link?: string | null;
  date?: string | null;
  content: string;
  company: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarketCondition {
  id: string;
  date: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Embedding {
  id: string;
  resourceId: string;
  content: string;
  embedding: number[];
}
