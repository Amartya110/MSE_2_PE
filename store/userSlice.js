import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiRequest } from './api.js';

export const syncProfiles = createAsyncThunk(
  'user/syncProfiles',
  async (handles, { rejectWithValue, getState }) => {
    try {
      const username = getState().auth.account?.username;
      if (!username) return rejectWithValue('Sign in before syncing profiles.');
      const result = await apiRequest('/api/sync-all', {
        method: 'POST',
        body: JSON.stringify({ handles }),
      });
      const profileResponse = await apiRequest(
        `/api/users/${encodeURIComponent(username)}`,
      );
      return {
        user: profileResponse.user,
        results: result.results,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const loadProfile = createAsyncThunk(
  'user/loadProfile',
  async (username, { rejectWithValue }) => {
    try {
      const result = await apiRequest(`/api/users/${encodeURIComponent(username)}`);
      return result.user;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

const userSlice = createSlice({
  name: 'user',
  initialState: {
    user: null,
    status: 'idle',
    requestedUsername: null,
    syncStatus: 'idle',
    error: null,
    syncResults: [],
  },
  reducers: {
    clearProfileError(state) {
      state.error = null;
    },
    hydrateProfile(state, action) {
      state.user = action.payload ?? null;
      state.status = action.payload ? 'succeeded' : 'idle';
      state.requestedUsername = action.payload?.username?.toLowerCase() ?? null;
      state.error = null;
      state.syncResults = [];
    },
  },
  extraReducers(builder) {
    builder
      .addCase(syncProfiles.pending, (state) => {
        state.syncStatus = 'loading';
        state.error = null;
        state.syncResults = [];
      })
      .addCase(syncProfiles.fulfilled, (state, action) => {
        const succeeded = action.payload.results.filter((result) => result.ok).length;
        state.syncStatus =
          succeeded === 0
            ? 'failed'
            : succeeded === action.payload.results.length
              ? 'succeeded'
              : 'partial';
        state.error =
          succeeded === 0
            ? 'Handles saved, but all platform profile syncs failed.'
            : null;
        state.user = action.payload.user;
        state.requestedUsername =
          action.payload.user?.username?.toLowerCase() ?? null;
        state.syncResults = action.payload.results;
      })
      .addCase(syncProfiles.rejected, (state, action) => {
        state.syncStatus = 'failed';
        state.error = action.payload ?? action.error.message;
      })
      .addCase(loadProfile.pending, (state, action) => {
        state.status = 'loading';
        state.requestedUsername = String(action.meta.arg).toLowerCase();
        state.error = null;
      })
      .addCase(loadProfile.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
        state.requestedUsername = action.payload?.username?.toLowerCase() ?? null;
      })
      .addCase(loadProfile.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? action.error.message;
      });
  },
});

export const { clearProfileError, hydrateProfile } = userSlice.actions;
export default userSlice.reducer;
