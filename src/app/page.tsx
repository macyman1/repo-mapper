'use client';

import { useEffect, useState } from 'react';
import type { RepoAnalysis, FileNode } from '@/lib/analysis/types';
import styles from './home.module.css';
import Chat from '@/components/Chat';
import DependencyGraph from '@/components/DependencyGraph';

export default function Home() {
  const [data, setData] = useState<RepoAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState('');

  // Initial local analyze (optional, maybe skip auto-load now?)
  // Let's keep auto-load of local for dev convenience, or default to empty?
  // User asked for "how to map... any repo", so maybe default to empty state with search bar.
  // I will auto-load local if no URL is present (or change to manual).
  // Let's change to manual for a "cleaner" start, or keeping local as default is fine.
  // I'll keep local auto-load but allow override.

  const analyzeRepo = async (url?: string) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const endpoint = url ? `/api/analyze?url=${encodeURIComponent(url)}` : '/api/analyze';
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Failed to load analysis');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    analyzeRepo(); // Auto-analyze local on mount
  }, []);

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    analyzeRepo(repoUrl);
  };

  if (!data && loading) return <div className={styles.loading}>Loading analysis...</div>;
  if (!data && error) return (
    <main className={styles.container}>
      <div className={styles.error}>Error: {error}</div>
      <button onClick={() => window.location.reload()} className={styles.searchButton} style={{ marginTop: '1rem' }}>
        Retry
      </button>
    </main>
  );

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          RepoMapper
        </h1>
        <p className={styles.subtitle}>AI-Powered Repository Intelligence</p>

        <form className={styles.searchBar} onSubmit={handleAnalyze}>
          <input
            type="text"
            placeholder="Enter GitHub Repository URL (e.g., https://github.com/owner/repo)"
            className={styles.searchInput}
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
          />
          <button type="submit" className={styles.searchButton} disabled={loading}>
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </form>

        {data && <p className={styles.subtitle} style={{ marginTop: '1rem' }}>Active: {data.root.name}</p>}
      </header>

      {data && (
        <>
          <div className={styles.grid}>
            {/* Stats Card */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Overview</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className={styles.row}>
                  <span>Files</span>
                  <span className={styles.statValue}>{data.fileCount}</span>
                </div>
                <div className={styles.row}>
                  <span>Directories</span>
                  <span className={styles.statValue}>{data.dirCount}</span>
                </div>
              </div>
            </div>

            {/* Languages Card */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Languages</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Object.entries(data.languages)
                  .sort(([, a], [, b]) => b - a)
                  .map(([lang, count]) => (
                    <div key={lang} className={styles.row}>
                      <span>{lang}</span>
                      <span className={styles.langValue}>{count}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Dependencies Card */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Dependencies</h2>
              <div className={styles.depList}>
                {Object.entries(data.dependencies).map(([file, deps]) => (
                  <div key={file}>
                    <h3 className={styles.depGroupTitle}>{file}</h3>
                    <div className={styles.tags}>
                      {deps.map(dep => (
                        <span key={dep} className={styles.tag}>
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className={styles.grid} style={{ marginBottom: '2rem' }}>
            <div className={styles.structureCard} style={{ gridColumn: '1 / -1', marginTop: 0 }}>
              <h2 className={styles.cardTitle}>Global Import Graph</h2>
              {/* Dynamic Import: This component uses window, so might need no-ssr if React Flow issues arise, but strictly 'use client' is usually fine */}
              <DependencyGraph data={data} />
            </div>
          </div>

          {/* File Tree Preview */}
          <div className={styles.structureCard}>
            <h2 className={styles.cardTitle}>Structure</h2>
            <div className={styles.treeContainer}>
              <FileTree node={data.root} depth={0} />
            </div>
          </div>

          <Chat context={{
            files: data.fileCount,
            languages: data.languages,
            dependencies: data.dependencies,
            // Limit structure size for context prompt
            structure_summary: "Full structure available on request"
          }} />
        </>
      )}
    </main>
  );
}

function FileTree({ node, depth }: { node: FileNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isDir = node.type === 'directory';

  if (!isDir) {
    return (
      <div style={{ paddingLeft: `${depth * 20}px` }} className={styles.treeItem}>
        📄 {node.name} <span className={styles.fileSize}>({node.size}B)</span>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{ paddingLeft: `${depth * 20}px` }}
        className={`${styles.treeItem} ${styles.folder}`}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? '📂' : '📁'} {node.name}
      </div>
      {expanded && node.children?.map(child => (
        <FileTree key={child.path} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}
