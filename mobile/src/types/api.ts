/** Standard Learnova API response envelope */
export interface ApiResponse<T = unknown> {
  success: boolean;
  status: number;
  data: T;
  error: string | null;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export type ApiError = {
  message: string;
  status?: number;
  code?: string;
};
