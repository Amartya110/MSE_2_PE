import { createAsyncThunk, createSlice, nanoid } from '@reduxjs/toolkit';
import { apiRequest } from './api.js';

export const runCode = createAsyncThunk(
  'editor/run',
  async (_, { getState, rejectWithValue }) => {
    const { problem, language, codeByLanguage, testCases } =
      getState().editor;
    if (!problem) return rejectWithValue('Choose a problem before running code.');
    try {
      const response = await apiRequest('/api/executions/run', {
        method: 'POST',
        body: JSON.stringify({
          platform: problem.platform,
          problemId: problem.problemId,
          language,
          sourceCode: codeByLanguage[language],
          testCases,
        }),
      });
      return response.result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

const starterCode = {
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Read input and write output\n    return 0;\n}\n',
  python: 'def solve():\n    # Read input and write output\n    pass\n\nif __name__ == "__main__":\n    solve()\n',
  java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        // Read input and write output\n    }\n}\n',
  javascript: "const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim();\n// Read input and write output\nconsole.log(input);\n",
};

const initialState = {
  problem: null,
  language: 'cpp',
  codeByLanguage: { ...starterCode },
  testCases: [],
  execution: { status: 'idle', result: null, error: null },
};

const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    initializeProblem(state, action) {
      const { problem, initialLanguage = 'cpp' } = action.payload;
      state.problem = problem;
      state.language = initialLanguage;
      state.codeByLanguage = { ...starterCode };
      state.testCases = (problem.sampleTestCases ?? []).map((testCase) => ({
        id: nanoid(),
        input: testCase.input,
        expectedOutput: testCase.expectedOutput ?? '',
      }));
      if (state.testCases.length === 0) {
        state.testCases = [{ id: nanoid(), input: '', expectedOutput: '' }];
      }
      state.execution = { status: 'idle', result: null, error: null };
    },
    setLanguage(state, action) {
      if (Object.hasOwn(starterCode, action.payload)) {
        state.language = action.payload;
        state.execution = { status: 'idle', result: null, error: null };
      }
    },
    setSourceCode(state, action) {
      state.codeByLanguage[state.language] = action.payload;
      state.execution = { status: 'idle', result: null, error: null };
    },
    setTestCase(state, action) {
      const { id, field, value } = action.payload;
      if (!['input', 'expectedOutput'].includes(field)) return;
      const testCase = state.testCases.find((item) => item.id === id);
      if (testCase) {
        testCase[field] = value;
        state.execution = { status: 'idle', result: null, error: null };
      }
    },
    addTestCase(state) {
      if (state.testCases.length < 3) {
        state.testCases.push({ id: nanoid(), input: '', expectedOutput: '' });
      }
    },
    removeTestCase(state, action) {
      if (state.testCases.length > 1) {
        state.testCases = state.testCases.filter(
          (item) => item.id !== action.payload,
        );
      }
    },
    clearExecution(state) {
      state.execution = { status: 'idle', result: null, error: null };
    },
  },
  extraReducers(builder) {
    builder
      .addCase(runCode.pending, (state) => {
        state.execution = { status: 'running', result: null, error: null };
      })
      .addCase(runCode.fulfilled, (state, action) => {
        state.execution = { status: 'succeeded', result: action.payload, error: null };
      })
      .addCase(runCode.rejected, (state, action) => {
        state.execution = {
          status: 'failed',
          result: null,
          error: action.payload ?? action.error.message,
        };
      });
  },
});

export const {
  addTestCase,
  clearExecution,
  initializeProblem,
  removeTestCase,
  setLanguage,
  setSourceCode,
  setTestCase,
} = editorSlice.actions;

export default editorSlice.reducer;
