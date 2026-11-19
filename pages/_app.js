import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { makeStore } from '../store/store.js';
import '../styles/codeforces.css';
import CodeforcesShell from '../components/CodeforcesShell.js';

export default function App({ Component, pageProps }) {
  const store = useMemo(() => makeStore(), []);
  const page = <Component {...pageProps} />;
  return (
    <Provider store={store}>
      {Component.useCodeforcesShell ? (
        <CodeforcesShell>{page}</CodeforcesShell>
      ) : page}
    </Provider>
  );
}
