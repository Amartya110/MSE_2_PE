import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiRequest } from './api.js';

export const compareProfiles = createAsyncThunk(
  'compare/compareProfiles',
  async ({ firstUsername, secondUsername }, { rejectWithValue }) => {
    try {
      const result = await apiRequest(
        `/api/users/${encodeURIComponent(firstUsername)}/compare/${encodeURIComponent(secondUsername)}`,
      );
      return result.users;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchHeadToHeadComparison = createAsyncThunk(
  'compare/fetchHeadToHeadComparison',
  async ({ platform, handle1, handle2 }, { rejectWithValue, signal }) => {
    try {
      const query = new URLSearchParams({ u1: handle1, u2: handle2 });
      const result = await apiRequest(
        `/api/compare/${encodeURIComponent(platform)}?${query.toString()}`,
        { signal },
      );
      return result.comparison;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

const compareSlice = createSlice({
  name: 'compare',
  initialState: {
    users: [],
    data: null,
    status: 'idle',
    error: null,
    mode: null,
    platform: null,
  },
  reducers: {
    clearComparison(state) {
      state.users = [];
      state.data = null;
      state.status = 'idle';
      state.error = null;
      state.mode = null;
      state.platform = null;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(compareProfiles.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.mode = 'tracker';
        state.platform = null;
      })
      .addCase(fetchHeadToHeadComparison.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.mode = 'public-platform';
        state.platform = action.meta.arg.platform;
      })
      .addCase(compareProfiles.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.users = action.payload;
        state.data = null;
      })
      .addCase(fetchHeadToHeadComparison.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
        state.users = [];
      })
      .addCase(compareProfiles.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? action.error.message;
      })
      .addCase(fetchHeadToHeadComparison.rejected, (state, action) => {
        if (action.meta.aborted) return;
        state.status = 'failed';
        state.error = action.payload ?? action.error.message;
      });
  },
});

export const { clearComparison } = compareSlice.actions;
export default compareSlice.reducer;
