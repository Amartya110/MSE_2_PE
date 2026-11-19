import Head from 'next/head';
import Link from 'next/link';
import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import HandleLinkForm from '../../components/profile/HandleLinkForm.js';
import PlatformStatsTable from '../../components/profile/PlatformStatsTable.js';
import ProfileHeaderBox from '../../components/profile/ProfileHeaderBox.js';
import SubmissionsTable from '../../components/profile/SubmissionsTable.js';
import TagMasteryTable from '../../components/profile/TagMasteryTable.js';
import { buildProfileMetrics } from '../../components/profile/profileMetrics.js';
import {
  clearProfileError,
  hydrateProfile,
  syncProfiles,
} from '../../store/userSlice.js';

const apiServer =
  process.env.API_SERVER_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'http://localhost:4000';
const HANDLE_PATTERN = /^[A-Za-z0-9_.-]{1,50}$/;

const makeSerializable = (value) => {
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Map) {
    return Object.fromEntries(
      [...value.entries()].map(([key, item]) => [key, makeSerializable(item)]),
    );
  }
  if (Array.isArray(value)) return value.map(makeSerializable);
  if (value && typeof value === 'object') {
    if (typeof value.toJSON === 'function') {
      return makeSerializable(value.toJSON());
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, makeSerializable(item)]),
    );
  }
  return value;
};

const ProfilePage = ({ initialProfile, profileError, requestedHandle }) => {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  const profileState = useSelector((state) => state.user);
  const [linkFormOpen, setLinkFormOpen] = useState(false);
  const handle = initialProfile?.username ?? requestedHandle;
  const currentProfile =
    profileState.user?.username?.toLowerCase() === requestedHandle.toLowerCase()
      ? profileState.user
      : initialProfile;
  const metrics = useMemo(
    () => buildProfileMetrics(currentProfile),
    [currentProfile],
  );
  const canSync =
    auth.status === 'authenticated' &&
    auth.account?.username?.toLowerCase() === requestedHandle.toLowerCase();
  const syncFailures = profileState.syncResults.filter((result) => !result.ok);

  useEffect(() => {
    dispatch(hydrateProfile(initialProfile));
  }, [dispatch, initialProfile, requestedHandle]);

  const syncNow = () => {
    dispatch(clearProfileError());
    setLinkFormOpen(true);
  };

  const submitHandles = async (handles) => {
    const result = await dispatch(syncProfiles(handles));
    if (syncProfiles.fulfilled.match(result)) setLinkFormOpen(false);
  };

  return (
    <>
      <Head>
        <title>{handle} — DSPAA profile</title>
        <meta
          name="description"
          content={`Competitive programming ratings, DSA topics and recent submissions for ${handle}.`}
        />
      </Head>
      <main className="cf-profile-page">
        <div className="cf-profile-page-title">
          <h1 className="cf-page-title">User profile: {handle}</h1>
          <Link href="/compare">Compare users</Link>
        </div>

        {profileError && (
          <div className="cf-notice" role="status">
            {profileError}
          </div>
        )}
        {!currentProfile && (
          <div className="cf-notice" role="status">
            This tracker profile has not been synced yet. Link platform handles and sync to populate the tables.
          </div>
        )}

        <ProfileHeaderBox
          canSync={canSync}
          handle={handle}
          metrics={metrics}
          onSync={syncNow}
          profile={currentProfile}
          syncBusy={profileState.syncStatus === 'loading'}
        />

        {canSync && linkFormOpen && (
          <HandleLinkForm
            busy={profileState.syncStatus === 'loading'}
            error={profileState.syncStatus === 'failed' ? profileState.error : ''}
            initialHandles={currentProfile?.platformHandles ?? {}}
            onCancel={() => setLinkFormOpen(false)}
            onSubmit={submitHandles}
          />
        )}

        {syncFailures.length > 0 && (
          <div className="cf-notice cf-profile-sync-results" role="status">
            <strong>Some platform syncs failed:</strong>
            <p>Submitted handles are saved and shown below even when a platform data provider is unavailable.</p>
            <ul>
              {syncFailures.map((failure) => (
                <li key={failure.platform}>
                  {failure.platform}: {failure.error?.message ?? 'Sync failed.'}
                </li>
              ))}
            </ul>
          </div>
        )}

        <PlatformStatsTable
          contests={metrics.contestHistory}
          difficulty={metrics.dsaDifficulty}
          platforms={metrics.platformStats}
        />
        <TagMasteryTable tags={metrics.tags} />
        <SubmissionsTable submissions={metrics.recentSubmissions} />
      </main>
    </>
  );
};

ProfilePage.useCodeforcesShell = true;
ProfilePage.propTypes = {
  initialProfile: PropTypes.object,
  profileError: PropTypes.string.isRequired,
  requestedHandle: PropTypes.string.isRequired,
};

export async function getServerSideProps({ params }) {
  const requestedHandle = String(params.handle ?? '');
  if (!HANDLE_PATTERN.test(requestedHandle)) return { notFound: true };

  try {
    const response = await fetch(
      `${apiServer.replace(/\/+$/, '')}/api/users/${encodeURIComponent(requestedHandle)}`,
      { headers: { accept: 'application/json' } },
    );
    if (response.status === 404) {
      return {
        props: {
          initialProfile: null,
          profileError: '',
          requestedHandle,
        },
      };
    }
    if (!response.ok) {
      return {
        props: {
          initialProfile: null,
          profileError: `Profile service returned HTTP ${response.status}.`,
          requestedHandle,
        },
      };
    }

    const result = await response.json();
    return {
      props: {
        initialProfile: makeSerializable(result.user ?? null),
        profileError: '',
        requestedHandle,
      },
    };
  } catch {
    return {
      props: {
        initialProfile: null,
        profileError: 'The profile service is currently unavailable. Try again later.',
        requestedHandle,
      },
    };
  }
}

export default ProfilePage;
