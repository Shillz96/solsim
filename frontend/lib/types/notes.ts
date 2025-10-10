// Add this to frontend/lib/types/backend.ts

export interface UserNote {
  id: string;
  userId: string;
  tokenAddress: string;
  tokenSymbol: string | null;
  tokenName: string | null;
  notes: string | null;
  entryPrice: string | null;
  entryMarketCap: string | null;
  solAmount: string | null;
  targetPrice: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteRequest {
  userId: string;
  tokenAddress: string;
  notes?: string;
  entryPrice?: string;
  entryMarketCap?: string;
  solAmount?: string;
  targetPrice?: string;
}

export interface UpdateNoteRequest {
  userId: string;
  notes?: string;
  entryPrice?: string;
  entryMarketCap?: string;
  solAmount?: string;
  targetPrice?: string;
}

export interface NotesResponse {
  notes: UserNote[];
}

export interface NoteResponse {
  success: boolean;
  note: UserNote;
}

export interface DeleteNoteResponse {
  success: boolean;
}