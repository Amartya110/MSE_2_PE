import { configureStore } from '@reduxjs/toolkit';
import compareReducer from './compareSlice.js';
import authReducer from './authSlice.js';
import userReducer from './userSlice.js';
import problemsetReducer from './problemsetSlice.js';
import editorReducer from './editorSlice.js';
import { observabilityMiddleware } from './observabilityMiddleware.js';

export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      user: userReducer,
      compare: compareReducer,
      problemset: problemsetReducer,
      editor: editorReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(observabilityMiddleware),
    devTools: process.env.NODE_ENV !== 'production',
  });
