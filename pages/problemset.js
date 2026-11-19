import Head from 'next/head';
import Link from 'next/link';
import PropTypes from 'prop-types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import WeeklyStudyPlanner from '../components/problemset/WeeklyStudyPlanner.js';
import RatingBadge from '../components/RatingBadge.js';
import { deriveWeakTags } from '../components/profile/profileMetrics.js';
import { problemCatalog } from '../data/problemCatalog.js';
import { loadProfile } from '../store/userSlice.js';
import { loadRecommendations } from '../store/problemsetSlice.js';

const PLATFORMS = [
  { key: 'codeforces', label: 'Codeforces' },
  { key: 'leetcode', label: 'LeetCode' },
  { key: 'codechef', label: 'CodeChef' },
  { key: 'atcoder', label: 'AtCoder' },
];

const problemKey = (problem) => `${problem.platform}:${problem.problemId}`;

const ProblemsetPage = ({ catalog }) => {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  const profileState = useSelector((state) => state.user);
  const problemset = useSelector((state) => state.problemset);
  const requestForUser = useRef('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [minRating, setMinRating] = useState('');
  const [maxRating, setMaxRating] = useState('');

  const username = auth.account?.username?.toLowerCase();
  const hasOwnProfile = profileState.user?.username?.toLowerCase() === username;
  const recommendationData =
    problemset.data?.username?.toLowerCase() === username
      ? problemset.data
      : null;

  useEffect(() => {
    if (!hasOwnProfile || !username) return;
    if (recommendationData) {
      requestForUser.current = username;
      return;
    }
    if (requestForUser.current !== username) {
      requestForUser.current = username;
      dispatch(loadRecommendations(username));
    }
  }, [dispatch, hasOwnProfile, recommendationData, username]);

  const problems = useMemo(() => {
    const merged = new Map(catalog.map((problem) => [problemKey(problem), problem]));
    (recommendationData?.problems ?? []).forEach((problem) => {
      const key = problemKey(problem);
      merged.set(key, {
        ...merged.get(key),
        ...problem,
        recommended: true,
      });
    });
    const solved = new Set(
      (profileState.user?.solvedProblems ?? [])
        .filter((problem) => problem.verdict === 'accepted')
        .map(problemKey),
    );

    return [...merged.values()]
      .filter((problem) => {
        const rating = Number(problem.rating);
        const hasRating =
          problem.rating !== null &&
          problem.rating !== undefined &&
          problem.rating !== '' &&
          Number.isFinite(rating);
        const platformMatches =
          platformFilter === 'all' || problem.platform === platformFilter;
        const tagMatches =
          tagFilter === 'all' || (problem.tags ?? []).includes(tagFilter);
        const minimumMatches =
          minRating === '' || (hasRating && rating >= Number(minRating));
        const maximumMatches =
          maxRating === '' || (hasRating && rating <= Number(maxRating));
        return (
          platformMatches &&
          tagMatches &&
          minimumMatches &&
          maximumMatches
        );
      })
      .map((problem) => ({
        ...problem,
        solvedByYou: solved.has(problemKey(problem)),
      }))
      .sort((left, right) => {
        if (Boolean(left.recommended) !== Boolean(right.recommended)) {
          return left.recommended ? -1 : 1;
        }
        const leftRating =
          left.rating === null || left.rating === undefined
            ? Number.POSITIVE_INFINITY
            : Number(left.rating);
        const rightRating =
          right.rating === null || right.rating === undefined
            ? Number.POSITIVE_INFINITY
            : Number(right.rating);
        const ratingDifference =
          leftRating - rightRating;
        return (
          ratingDifference ||
          left.platform.localeCompare(right.platform) ||
          left.problemId.localeCompare(right.problemId)
        );
      });
  }, [
    catalog,
    maxRating,
    minRating,
    platformFilter,
    profileState.user,
    recommendationData,
    tagFilter,
  ]);

  const tags = useMemo(
    () =>
      [
        ...new Set([
          ...catalog.flatMap((problem) => problem.tags ?? []),
          ...(recommendationData?.problems ?? []).flatMap(
            (problem) => problem.tags ?? [],
          ),
        ]),
      ].sort(),
    [catalog, recommendationData],
  );
  const weakTags = recommendationData?.weakTags ?? deriveWeakTags(profileState.user);

  const retryProfile = () => {
    if (username) dispatch(loadProfile(username));
  };
  const refreshRecommendations = () => {
    if (!username || !hasOwnProfile) return;
    requestForUser.current = username;
    dispatch(loadRecommendations(username));
  };

  return (
    <>
      <Head>
        <title>Problemset &amp; Weekly Planner — DSPAA</title>
        <meta name="description" content="Filter rated problems and build a weekly practice plan around weak topics." />
      </Head>
      <main className="cf-problemset-page">
        <h1 className="cf-page-title">Problemset &amp; weekly planner</h1>
        <WeeklyStudyPlanner
          enabled={auth.status === 'authenticated' && hasOwnProfile}
          problems={recommendationData?.problems ?? []}
          status={problemset.status}
          weakTags={weakTags}
        />

        <section className="cf-problemset-section">
          <div className="cf-problemset-heading">
            <div>
              <h2>Next problems to solve</h2>
              <p className="cf-muted">
                Up to 100 personalized MongoDB recommendations appear first; the curated catalog fills the remaining rows.
              </p>
            </div>
            <button
              className="cf-button"
              disabled={!hasOwnProfile || problemset.status === 'loading'}
              onClick={refreshRecommendations}
              type="button"
            >
              {problemset.status === 'loading' ? 'Refreshing…' : 'Refresh recommendations'}
            </button>
          </div>

          {!hasOwnProfile && auth.status === 'authenticated' && (
            <div className="cf-notice">
              {profileState.status === 'failed' ? (
                <>
                  Could not load your tracker profile.{' '}
                  <button className="cf-profile-text-button" onClick={retryProfile} type="button">
                    Retry
                  </button>
                  {' '}or <Link href={`/profile/${encodeURIComponent(username)}`}>sync it on your profile</Link>.
                </>
              ) : (
                <>Loading your profile before asking the recommender…</>
              )}
            </div>
          )}
          {auth.status !== 'authenticated' && (
            <div className="cf-notice">
              <Link href="/login">Sign in</Link> and sync a profile to get personalized recommendations.
            </div>
          )}
          {problemset.error && (
            <p className="cf-status-error" role="alert">
              {problemset.error}
              {problemset.error.includes('403') || problemset.error.includes('401')
                ? ' Sign in with the account that owns this profile.'
                : ''}
            </p>
          )}

          <div className="cf-problemset-filters">
            <label>
              <span>Platform</span>
              <select
                className="cf-input"
                onChange={(event) => setPlatformFilter(event.target.value)}
                value={platformFilter}
              >
                <option value="all">All platforms</option>
                {PLATFORMS.map((platform) => (
                  <option key={platform.key} value={platform.key}>{platform.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Tag</span>
              <select
                className="cf-input"
                onChange={(event) => setTagFilter(event.target.value)}
                value={tagFilter}
              >
                <option value="all">All tags</option>
                {tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
              </select>
            </label>
            <label>
              <span>Min rating</span>
              <input
                className="cf-input"
                min="0"
                onChange={(event) => setMinRating(event.target.value)}
                type="number"
                value={minRating}
              />
            </label>
            <label>
              <span>Max rating</span>
              <input
                className="cf-input"
                min="0"
                onChange={(event) => setMaxRating(event.target.value)}
                type="number"
                value={maxRating}
              />
            </label>
            <button
              className="cf-profile-text-button"
              onClick={() => {
                setPlatformFilter('all');
                setTagFilter('all');
                setMinRating('');
                setMaxRating('');
              }}
              type="button"
            >
              Reset
            </button>
          </div>

          <div className="cf-table-wrap">
            <table className="cf-table cf-problemset-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Platform</th>
                  <th>Problem name &amp; tags</th>
                  <th>Rating</th>
                  <th>Solved by you</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {problems.map((problem) => (
                  <tr key={problemKey(problem)}>
                    <td className="cf-mono">{problem.problemId}</td>
                    <td>{PLATFORMS.find((item) => item.key === problem.platform)?.label ?? problem.platform}</td>
                    <td>
                      <strong>{problem.title}</strong>
                      {problem.recommended && <span className="cf-recommended-label">Recommended</span>}
                      <div className="cf-problemset-tags">
                        {(problem.tags ?? []).map((tag) => <span className="cf-tag" key={tag}>{tag}</span>)}
                      </div>
                      {problem.reason && <small className="cf-muted">{problem.reason}</small>}
                    </td>
                    <td><RatingBadge rating={problem.rating} /></td>
                    <td className={problem.solvedByYou ? 'cf-solved' : 'cf-muted'}>
                      {problem.solvedByYou ? 'Solved' : '—'}
                    </td>
                    <td>
                      <Link
                        className="cf-button cf-solve-link"
                        href={`/solve/${encodeURIComponent(problem.platform)}/${encodeURIComponent(problem.problemId)}`}
                      >
                        Solve
                      </Link>
                    </td>
                  </tr>
                ))}
                {!problems.length && (
                  <tr>
                    <td className="cf-profile-empty-cell" colSpan="6">
                      No curated problems match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="cf-problemset-count">{problems.length} problems shown · static curated catalog plus synced recommendations</p>
        </section>
      </main>
    </>
  );
};

ProblemsetPage.useCodeforcesShell = true;
ProblemsetPage.propTypes = {
  catalog: PropTypes.arrayOf(
    PropTypes.shape({
      platform: PropTypes.string.isRequired,
      problemId: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      rating: PropTypes.number,
      difficulty: PropTypes.string,
      tags: PropTypes.arrayOf(PropTypes.string),
      url: PropTypes.string,
    }),
  ).isRequired,
};

export function getStaticProps() {
  return { props: { catalog: problemCatalog } };
}

export default ProblemsetPage;
