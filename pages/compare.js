import Head from 'next/head';
import { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import CategoryBattlesTable from '../components/compare/CategoryBattlesTable.js';
import CompareControlsBar from '../components/compare/CompareControlsBar.js';
import CompareVerdictBox from '../components/compare/CompareVerdictBox.js';
import DetailedInsightsGrid from '../components/compare/DetailedInsightsGrid.js';
import GrowthAnalysisBox from '../components/compare/GrowthAnalysisBox.js';
import ImplementationScoreBox from '../components/compare/ImplementationScoreBox.js';
import MomentumBox from '../components/compare/MomentumBox.js';
import SkillValueSection from '../components/compare/SkillValueSection.js';
import TagBattleGrid from '../components/compare/TagBattleGrid.js';
import {
  clearComparison,
  fetchHeadToHeadComparison,
} from '../store/compareSlice.js';

const ComparePage = () => {
  const dispatch = useDispatch();
  const comparison = useSelector((state) => state.compare);
  const activeRequest = useRef(null);
  const runComparison = ({ platform, handle1, handle2 }) => {
    activeRequest.current?.abort();
    activeRequest.current = dispatch(
      fetchHeadToHeadComparison({ platform, handle1, handle2 }),
    );
  };
  const clearResults = () => {
    activeRequest.current?.abort();
    activeRequest.current = null;
    dispatch(clearComparison());
  };
  const data = comparison.status === 'succeeded' ? comparison.data : null;

  return (
    <>
      <Head>
        <title>Compare public profiles — DSPAA</title>
        <meta
          name="description"
          content="Compare public Codeforces, LeetCode, and AtCoder profiles without signing in or syncing first."
        />
      </Head>
      <main className="cf-compare-page">
        <h1 className="cf-page-title">Head-to-head comparison</h1>
        <p className="cf-muted">
          Compare public Codeforces, LeetCode, or AtCoder profiles directly. No login or tracker sync is required.
        </p>
        <CompareControlsBar
          busy={comparison.status === 'loading'}
          onClear={clearResults}
          onCompare={runComparison}
        />
        {comparison.error && (
          <div className="cf-status-error" role="alert">{comparison.error}</div>
        )}
        {comparison.status === 'loading' && (
          <p className="cf-muted" role="status">Fetching both public profiles and calculating comparison metrics…</p>
        )}
        {data && (
          <>
            <div className="cf-compare-data-notes">
              <strong>Data coverage</strong>
              <ul>
                {data.dataNotes.map((note) => <li key={note}>{note}</li>)}
              </ul>
            </div>
            <CompareVerdictBox comparison={data} />
            <CategoryBattlesTable comparison={data} />
            <GrowthAnalysisBox comparison={data} />
            <ImplementationScoreBox comparison={data} />
            <MomentumBox comparison={data} />
            <SkillValueSection comparison={data} />
            <DetailedInsightsGrid comparison={data} />
            <TagBattleGrid comparison={data} />
          </>
        )}
        {comparison.status === 'idle' && (
          <p className="cf-muted cf-page-hint">
            Select a platform and enter two public handles. The comparison fetches current platform data and does not save either profile.
          </p>
        )}
      </main>
    </>
  );
};

ComparePage.useCodeforcesShell = true;

export default ComparePage;
