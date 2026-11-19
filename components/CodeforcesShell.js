import Link from 'next/link';
import { useRouter } from 'next/router';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loadSession, logoutAccount } from '../store/authSlice.js';
import { deriveWeakTags } from './profile/profileMetrics.js';
import { loadProfile } from '../store/userSlice.js';

const HANDLE_PATTERN = /^[A-Za-z0-9_.-]{1,50}$/;

export const SidebarBox = ({ title, children }) => (
  <section className="cf-sidebar-box">
    <h2 className="cf-sidebar-title">{title}</h2>
    {children}
  </section>
);

SidebarBox.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

const QuickUserSearch = () => {
  const router = useRouter();
  const [handle, setHandle] = useState('');
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    const normalizedHandle = handle.trim();
    if (!HANDLE_PATTERN.test(normalizedHandle)) {
      setError('Use 1–50 letters, numbers, dots, underscores or hyphens.');
      return;
    }
    setError('');
    router.push(`/profile/${encodeURIComponent(normalizedHandle)}`);
  };

  return (
    <SidebarBox title="Find user">
      <form className="cf-search-form" onSubmit={submit}>
        <input
          aria-label="Tracker username"
          autoComplete="off"
          onChange={(event) => {
            setHandle(event.target.value);
            setError('');
          }}
          placeholder="Tracker username"
          value={handle}
        />
        <button className="cf-button" type="submit">Open profile</button>
      </form>
      {error && <p className="cf-search-error" role="alert">{error}</p>}
    </SidebarBox>
  );
};

const LinkedHandlesBox = ({ profile, syncStatus }) => {
  const platforms = [
    ['codeforces', 'Codeforces'],
    ['leetcode', 'LeetCode'],
    ['codechef', 'CodeChef'],
    ['atcoder', 'AtCoder'],
  ];
  const handles =
    profile?.platformHandles instanceof Map
      ? Object.fromEntries(profile.platformHandles)
      : profile?.platformHandles ?? {};
  const statusText = {
    idle: 'Not synced',
    loading: 'Syncing…',
    succeeded: 'Sync complete',
    partial: 'Partially synced',
    failed: 'Sync failed',
  }[syncStatus] ?? 'Not synced';

  return (
    <SidebarBox title="Linked handles">
      <ul className="cf-status-list">
        {platforms.map(([key, label]) => (
          <li className="cf-status-row" key={key}>
            <span className="cf-status-label">{label}</span>
            {handles[key] ? (
              <span className="cf-status-connected">{handles[key]}</span>
            ) : (
              <span className="cf-status-missing">not linked</span>
            )}
          </li>
        ))}
        <li className="cf-status-row">
          <span className="cf-status-label">Sync</span>
          <span className="cf-muted">{statusText}</span>
        </li>
      </ul>
    </SidebarBox>
  );
};

LinkedHandlesBox.propTypes = {
  profile: PropTypes.shape({
    platformHandles: PropTypes.objectOf(PropTypes.string),
  }),
  syncStatus: PropTypes.string,
};

LinkedHandlesBox.defaultProps = {
  profile: null,
  syncStatus: 'idle',
};

const WeakTagsBox = ({ tags }) => (
  <SidebarBox title="Top weak tags">
    {tags.length ? (
      <ul className="cf-tag-list">
        {tags.slice(0, 8).map((tag) => (
          <li className="cf-tag" key={tag.tag}>{tag.tag}</li>
        ))}
      </ul>
    ) : (
      <p className="cf-muted">Sync problem history to calculate weak tags.</p>
    )}
  </SidebarBox>
);

WeakTagsBox.propTypes = {
  tags: PropTypes.arrayOf(
    PropTypes.shape({ tag: PropTypes.string.isRequired }),
  ),
};

WeakTagsBox.defaultProps = { tags: [] };

const NAV_ITEMS = [
  { label: 'PROFILE', key: 'profile' },
  { label: 'COMPARE', key: 'compare' },
  { label: 'PROBLEMSET & PLANNER', key: 'problemset' },
  { label: 'WORKSPACE', key: 'workspace' },
];

const NAV_PREFIXES = {
  profile: '/profile/',
  compare: '/compare',
  problemset: '/problemset',
  workspace: '/solve/',
};

const CodeforcesShell = ({ children }) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const auth = useSelector((state) => state.auth);
  const profileState = useSelector((state) => state.user);
  const [logoutError, setLogoutError] = useState('');
  const username = auth.account?.username;
  const recommendationWeakTags = useSelector(
    (state) => {
      const data = state.problemset.data;
      return data &&
        state.user.user &&
        data.username?.toLowerCase() ===
          state.user.user.username?.toLowerCase()
        ? data.weakTags
        : null;
    },
  );
  const weakTags = recommendationWeakTags?.length
    ? recommendationWeakTags
    : deriveWeakTags(profileState.user);
  const viewedHandle =
    typeof router.query.handle === 'string' ? router.query.handle : null;
  const profilePath = username
    ? `/profile/${encodeURIComponent(username)}`
    : viewedHandle
      ? `/profile/${encodeURIComponent(viewedHandle)}`
      : '/login';

  useEffect(() => {
    if (auth.status === 'checking') dispatch(loadSession());
  }, [auth.status, dispatch]);

  useEffect(() => {
    if (
      auth.status === 'authenticated' &&
      username &&
      !router.pathname.startsWith('/profile/') &&
      profileState.requestedUsername !== username.toLowerCase() &&
      profileState.status !== 'loading'
    ) {
      dispatch(loadProfile(username));
    }
  }, [
    auth.status,
    dispatch,
    profileState.requestedUsername,
    profileState.status,
    router.pathname,
    username,
  ]);

  const signOut = async () => {
    const result = await dispatch(logoutAccount());
    if (logoutAccount.fulfilled.match(result)) {
      router.push('/login');
    } else {
      setLogoutError(result.payload ?? 'Could not sign out.');
    }
  };

  const navPaths = {
    profile: profilePath,
    compare: '/compare',
    problemset: '/problemset',
    workspace: '/solve/codeforces/4A',
  };

  return (
    <div className="cf-shell">
      <header className="cf-header">
        <div className="cf-header-inner">
          <Link className="cf-brand" href={profilePath}>DSPAA</Link>
          <nav aria-label="Main navigation" className="cf-nav">
            {NAV_ITEMS.map((item) => {
              const isActive = router.pathname.startsWith(NAV_PREFIXES[item.key]);
              return (
                <Link
                  aria-current={isActive ? 'page' : undefined}
                  className={`cf-nav-link${isActive ? ' cf-nav-link-active' : ''}`}
                  href={navPaths[item.key]}
                  key={item.key}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="cf-auth-links">
            {auth.status === 'authenticated' ? (
              <>
                <span>{username}</span>
                <button onClick={signOut} type="button">Logout</button>
              </>
            ) : (
              <>
                <Link href="/login">Login</Link>
                <Link href="/register">Register</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <div className="cf-layout">
        <main className="cf-main">
          {logoutError && <p className="cf-status-error" role="alert">{logoutError}</p>}
          {children}
        </main>
        <aside aria-label="Profile tools" className="cf-sidebar">
          <QuickUserSearch />
          <LinkedHandlesBox
            profile={profileState.user}
            syncStatus={profileState.syncStatus}
          />
          <WeakTagsBox tags={weakTags} />
        </aside>
      </div>
    </div>
  );
};

CodeforcesShell.propTypes = {
  children: PropTypes.node.isRequired,
};

export default CodeforcesShell;
