import Head from 'next/head';
import Link from 'next/link';

const NotFoundPage = () => (
  <>
    <Head><title>Page not found — DSPAA</title></Head>
    <main className="cf-error-page">
      <p className="cf-profile-eyebrow">404 / PAGE NOT FOUND</p>
      <h1>That page does not exist.</h1>
      <p className="cf-muted">Use the main navigation or return to the problemset.</p>
      <Link className="cf-button" href="/problemset">Open problemset</Link>
    </main>
  </>
);

NotFoundPage.useCodeforcesShell = true;

export default NotFoundPage;
