import Head from 'next/head';
import CodeWorkspace from '../../../components/CodeWorkspace.js';

const apiServer =
  process.env.API_SERVER_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'http://localhost:4000';

export default function SolveProblemPage({ problem, error }) {
  if (!problem) {
    return (
      <>
        <Head><title>Problem unavailable — DSPAA</title></Head>
        <main className="cf-workspace">
          <section className="cf-workspace-pane">
            <p className="cf-profile-eyebrow">SOLVE WORKSPACE</p>
            <h1>Problem unavailable</h1>
            <p>{error}</p>
            <a className="cf-button" href="/problemset">Back to problemset</a>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{problem.title} — DSPAA workspace</title>
        <meta name="description" content={`Practice ${problem.title} in the code workspace.`} />
      </Head>
      <CodeWorkspace problem={problem} />
    </>
  );
}

SolveProblemPage.useCodeforcesShell = true;

export async function getServerSideProps({ params }) {
  const { platform, problemId } = params;
  const platforms = ['codeforces', 'leetcode', 'codechef', 'atcoder'];
  if (
    !platforms.includes(platform) ||
    typeof problemId !== 'string' ||
    problemId.length < 1 ||
    problemId.length > 200
  ) {
    return { notFound: true };
  }

  try {
    const response = await fetch(
      `${apiServer.replace(/\/+$/, '')}/api/problems/${encodeURIComponent(platform)}/${encodeURIComponent(problemId)}`,
      { headers: { accept: 'application/json' } },
    );
    if (response.status === 404) return { notFound: true };
    if (!response.ok) {
      return {
        props: {
          problem: null,
          error: `Problem service returned HTTP ${response.status}.`,
        },
      };
    }
    const { problem } = await response.json();
    return { props: { problem: JSON.parse(JSON.stringify(problem)), error: null } };
  } catch (error) {
    return {
      props: {
        problem: null,
        error: `Problem service is unavailable: ${error.message}`,
      },
    };
  }
}
