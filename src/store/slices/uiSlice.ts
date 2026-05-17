import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/**
 * Editor-shell UI state. Kept separate from draftPage so transient UI
 * (which section is highlighted, what loading flag is active) doesn't get
 * persisted into a snapshot.
 */
export interface UiState {
  activeSectionId: string | null;
  loading: boolean;
  errorMessage: string | null;
}

const initialState: UiState = {
  activeSectionId: null,
  loading: false,
  errorMessage: null,
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setActiveSection(state, action: PayloadAction<string | null>) {
      state.activeSectionId = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.errorMessage = action.payload;
    },
  },
});

export const { setActiveSection, setLoading, setError } = uiSlice.actions;
export default uiSlice.reducer;
