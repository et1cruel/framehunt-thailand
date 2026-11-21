import { useCallback, useEffect, useState } from "react";
import type { Board, BoardItem, LocalUser, Submission, SubmissionStatus } from "@/data/types";
import { uid } from "@/lib/utils";

const KEY = "framehunt:state:v1";

interface StoreState {
  favorites: string[];
  boards: Board[];
  user: LocalUser | null;
  adminOverrides: Record<string, { status?: string; note?: string }>;
  submissions: Submission[];
}

const initial: StoreState = { favorites: [], boards: [], user: null, adminOverrides: {}, submissions: [] };

function read(): StoreState {
  if (typeof window === "undefined") return initial;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return initial;
    return { ...initial, ...(JSON.parse(raw) as Partial<StoreState>) };
  } catch {
    return initial;
  }
}

let state: StoreState = read();
const listeners = new Set<() => void>();

function commit(next: StoreState) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage may be unavailable (private mode) */
  }
  listeners.forEach((l) => l());
}

export function useStore() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return state;
}

export const favorites = {
  toggle(locationId: string) {
    const has = state.favorites.includes(locationId);
    commit({
      ...state,
      favorites: has ? state.favorites.filter((id) => id !== locationId) : [...state.favorites, locationId],
    });
    return !has;
  },
  isFavorite(locationId: string) {
    return state.favorites.includes(locationId);
  },
};

export const boards = {
  create(title: string, description = ""): Board {
    const board: Board = {
      id: uid("board"),
      title,
      description,
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    commit({ ...state, boards: [board, ...state.boards] });
    return board;
  },
  update(id: string, patch: Partial<Omit<Board, "id" | "createdAt">>) {
    commit({
      ...state,
      boards: state.boards.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: new Date().toISOString() } : b)),
    });
  },
  remove(id: string) {
    commit({ ...state, boards: state.boards.filter((b) => b.id !== id) });
  },
  addItem(boardId: string, locationId: string, notes = ""): boolean {
    const board = state.boards.find((b) => b.id === boardId);
    if (!board) return false;
    if (board.items.some((i) => i.locationId === locationId)) return false;
    const item: BoardItem = { locationId, notes, priority: 2, addedAt: new Date().toISOString() };
    boards.update(boardId, {
      items: [...board.items, item],
      coverLocationId: board.coverLocationId ?? locationId,
    });
    return true;
  },
  removeItem(boardId: string, locationId: string) {
    const board = state.boards.find((b) => b.id === boardId);
    if (!board) return;
    boards.update(boardId, { items: board.items.filter((i) => i.locationId !== locationId) });
  },
  updateItem(boardId: string, locationId: string, patch: Partial<BoardItem>) {
    const board = state.boards.find((b) => b.id === boardId);
    if (!board) return;
    boards.update(boardId, {
      items: board.items.map((i) => (i.locationId === locationId ? { ...i, ...patch } : i)),
    });
  },
  find(id: string) {
    return state.boards.find((b) => b.id === id);
  },
};

export const auth = {
  signInLocal(email: string, name: string, role: LocalUser["role"] = "member") {
    const user: LocalUser = {
      id: uid("local"),
      email,
      name: name || email.split("@")[0],
      role,
      mode: "local",
    };
    commit({ ...state, user });
    return user;
  },
  signOut() {
    commit({ ...state, user: null });
  },
  setRole(role: LocalUser["role"]) {
    if (!state.user) return;
    commit({ ...state, user: { ...state.user, role } });
  },
};

export const admin = {
  setOverride(locationId: string, patch: { status?: string; note?: string }) {
    commit({
      ...state,
      adminOverrides: { ...state.adminOverrides, [locationId]: { ...state.adminOverrides[locationId], ...patch } },
    });
  },
  clearOverride(locationId: string) {
    const next = { ...state.adminOverrides };
    delete next[locationId];
    commit({ ...state, adminOverrides: next });
  },
};

export const submissions = {
  add(input: Omit<Submission, "id" | "createdAt" | "status">): Submission {
    const submission: Submission = {
      ...input,
      id: uid("sub"),
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    commit({ ...state, submissions: [submission, ...state.submissions].slice(0, 200) });
    return submission;
  },
  setStatus(id: string, status: SubmissionStatus) {
    commit({
      ...state,
      submissions: state.submissions.map((s) => (s.id === id ? { ...s, status } : s)),
    });
  },
  remove(id: string) {
    commit({ ...state, submissions: state.submissions.filter((s) => s.id !== id) });
  },
};

export function useFavorites() {
  const s = useStore();
  const toggle = useCallback((id: string) => favorites.toggle(id), []);
  return { favorites: s.favorites, toggle, isFavorite: (id: string) => s.favorites.includes(id) };
}

export function useBoards() {
  const s = useStore();
  return s.boards;
}
