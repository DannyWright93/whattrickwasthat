import AsyncStorage from '@react-native-async-storage/async-storage';
import { TrickAnalysis } from '../services/claudeVision';

const STORAGE_KEY = 'WTWT_TRICK_HISTORY';

export interface TrickEntry {
  id: string;
  analysis: TrickAnalysis;
  thumbnailUri: string;
  videoUri: string;
  createdAt: string; // ISO 8601
}

async function readAll(): Promise<TrickEntry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as TrickEntry[];
}

async function writeAll(entries: TrickEntry[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export async function saveEntry(
  analysis: TrickAnalysis,
  thumbnailUri: string,
  videoUri: string
): Promise<TrickEntry> {
  const entries = await readAll();
  const newEntry: TrickEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    analysis,
    thumbnailUri,
    videoUri,
    createdAt: new Date().toISOString(),
  };
  await writeAll([newEntry, ...entries]);
  return newEntry;
}

export async function getHistory(): Promise<TrickEntry[]> {
  const entries = await readAll();
  // Already stored newest-first, but sort by date to be safe
  return entries.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function deleteEntry(id: string): Promise<void> {
  const entries = await readAll();
  await writeAll(entries.filter((e) => e.id !== id));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
