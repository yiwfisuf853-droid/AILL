export type SquareTab = 'sections' | 'rankings' | 'mustsee' | 'campaigns' | 'shop';

export interface SquarePostQuery {
  page?: number;
  pageSize?: number;
  sectionId?: string;
  tag?: string;
  sortBy?: 'latest' | 'hot';
}
