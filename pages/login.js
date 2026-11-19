import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AuthForm from '../components/AuthForm.js';
import { loginAccount } from '../store/authSlice.js';

export default function LoginPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { status, error, account } = useSelector((state) => state.auth);

  useEffect(() => {
    if (status === 'authenticated' && account?.username) {
      router.replace(`/profile/${encodeURIComponent(account.username)}`);
    }
  }, [account?.username, router, status]);

  const handleLogin = async (credentials) => {
    const result = await dispatch(loginAccount(credentials));
    if (loginAccount.fulfilled.match(result)) {
      router.replace(`/profile/${encodeURIComponent(result.payload.username)}`);
    }
  };

  return (
    <>
      <Head>
        <title>Sign in — DSPAA</title>
        <meta name="description" content="Sign in to your competitive programming and DSA tracker." />
      </Head>
      <main className="cf-auth-page">
        <section className="cf-auth-card">
          <p className="cf-profile-eyebrow">ACCOUNT</p>
          <h1>Sign in</h1>
          <p className="cf-muted">Link profiles, compare progress, and open the code workspace.</p>
          <AuthForm
            busy={status === 'authenticating'}
            error={error}
            mode="login"
            onSubmit={handleLogin}
          />
          <p className="cf-auth-switch">
            New here? <Link href="/register">Register</Link>
          </p>
          <p className="cf-muted">Your session uses a secure HTTP-only cookie.</p>
        </section>
      </main>
    </>
  );
}

LoginPage.useCodeforcesShell = true;
