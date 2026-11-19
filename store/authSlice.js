import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiRequest } from './api.js';

const authRequest = (path, body) =>
  apiRequest(path, { method: 'POST', body: JSON.stringify(body) });

export const registerAccount = createAsyncThunk(
  'auth/register',
  async (details, { rejectWithValue }) => {
    try {
      const result = await authRequest('/api/auth/register', details);
      return result.account;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const loginAccount = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const result = await authRequest('/api/auth/login', credentials);
      return result.account;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const loadSession = createAsyncThunk(
  'auth/loadSession',
  async (_, { rejectWithValue }) => {
    try {
      const result = await apiRequest('/api/auth/me');
      return result.account;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const logoutAccount = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authRequest('/api/auth/logout', {});
      return true;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState: { account: null, status: 'checking', error: null },
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(loadSession.pending, (state) => {
        state.status = 'checking';
      })
      .addCase(loadSession.fulfilled, (state, action) => {
        state.status = 'authenticated';
        state.account = action.payload;
        state.error = null;
      })
      .addCase(loadSession.rejected, (state) => {
        state.status = 'anonymous';
        state.account = null;
      })
      .addCase(registerAccount.pending, (state) => {
        state.status = 'authenticating';
        state.error = null;
      })
      .addCase(loginAccount.pending, (state) => {
        state.status = 'authenticating';
        state.error = null;
      })
      .addCase(logoutAccount.fulfilled, (state) => {
        state.status = 'anonymous';
        state.account = null;
        state.error = null;
      })
      .addCase(logoutAccount.rejected, (state, action) => {
        state.error = action.payload ?? action.error.message;
      })
      .addMatcher(
        (action) =>
          registerAccount.fulfilled.match(action) ||
          loginAccount.fulfilled.match(action),
        (state, action) => {
          state.status = 'authenticated';
          state.account = action.payload;
          state.error = null;
        },
      )
      .addMatcher(
        (action) =>
          registerAccount.rejected.match(action) ||
          loginAccount.rejected.match(action),
        (state, action) => {
          state.status = 'anonymous';
          state.error = action.payload ?? action.error.message;
        },
      );
  },
});

export default authSlice.reducer;
