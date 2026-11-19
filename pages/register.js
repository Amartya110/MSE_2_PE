import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AuthForm from '../components/AuthForm.js';
import { registerAccount } from '../store/authSlice.js';

export default function RegisterPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { status, error, account } = useSelector((state) => state.auth);

  useEffect(() => {
    if (status === 'authenticated' && account?.username) {
      router.replace(`/profile/${encodeURIComponent(account.username)}`);
    }
  }, [account?.username, router, status]);

  const handleRegister = async (details) => {
    const result = await dispatch(registerAccount(details));
    if (registerAccount.fulfilled.match(result)) {
      router.replace(`/profile/${encodeURIComponent(result.payload.username)}`);
    }
  };

  return (
    <>
      <Head>
        <title>Create account — DSPAA</title>
        <meta name="description" content="Create your competitive programming and DSA tracker account." />
      </Head>
      <main className="cf-auth-page">
        <section className="cf-auth-card">
          <p className="cf-profile-eyebrow">ACCOUNT</p>
          <h1>Create account</h1>
          <p className="cf-muted">Choose a tracker username, then link your competitive profiles.</p>
          <AuthForm
            busy={status === 'authenticating'}
            error={error}
            mode="register"
            onSubmit={handleRegister}
          />
          <p className="cf-auth-switch">
            Already registered? <Link href="/login">Sign in</Link>
          </p>
          <p className="cf-muted">Passwords are hashed before they are stored.</p>
        </section>
      </main>
    </>
  );
}

RegisterPage.useCodeforcesShell = true;
