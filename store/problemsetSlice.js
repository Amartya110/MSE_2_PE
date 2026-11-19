import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiRequest } from './api.js';

export const loadRecommendations = createAsyncThunk(
  'problemset/loadRecommendations',
  async (username, { rejectWithValue }) => {
    try {
      return await apiRequest(
        `/api/users/${encodeURIComponent(username)}/recommendations`,
      );
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

const problemsetSlice = createSlice({
  name: 'problemset',
  initialState: {
    data: null,
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(loadRecommendations.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadRecommendations.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(loadRecommendations.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? action.error.message;
      });
  },
});

export default problemsetSlice.reducer;
