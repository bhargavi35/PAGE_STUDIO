import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ReleaseBump } from "@/types/page";

export type PublishStatus = "idle" | "pending" | "success" | "noop" | "error";

export interface PublishHistoryEntry {
  version: string;
  bump: ReleaseBump;
  changelog: string[];
  createdAt: string;
  publishedBy: string;
}

export interface PublishState {
  status: PublishStatus;
  lastError: string | null;
  history: PublishHistoryEntry[];
  /** "noop" outcome happens when publishing a draft that's structurally identical to the latest release */
  lastBump: ReleaseBump | null;
  lastVersion: string | null;
}

const initialState: PublishState = {
  status: "idle",
  lastError: null,
  history: [],
  lastBump: null,
  lastVersion: null,
};

export const publishSlice = createSlice({
  name: "publish",
  initialState,
  reducers: {
    publishPending(state) {
      state.status = "pending";
      state.lastError = null;
    },
    publishSuccess(state, action: PayloadAction<PublishHistoryEntry>) {
      state.status = "success";
      state.lastError = null;
      state.lastBump = action.payload.bump;
      state.lastVersion = action.payload.version;
      state.history.unshift(action.payload);
    },
    publishNoop(state) {
      state.status = "noop";
      state.lastBump = "none";
      state.lastError = null;
    },
    publishError(state, action: PayloadAction<string>) {
      state.status = "error";
      state.lastError = action.payload;
    },
    publishReset(state) {
      state.status = "idle";
      state.lastError = null;
    },
    hydrateHistory(state, action: PayloadAction<PublishHistoryEntry[]>) {
      state.history = action.payload;
      state.lastVersion = action.payload[0]?.version ?? null;
      state.lastBump = action.payload[0]?.bump ?? null;
    },
  },
});

export const {
  publishPending,
  publishSuccess,
  publishNoop,
  publishError,
  publishReset,
  hydrateHistory,
} = publishSlice.actions;
export default publishSlice.reducer;
