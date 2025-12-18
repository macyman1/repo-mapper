'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, FileCode } from 'lucide-react';
import styles from './FileViewer.module.css';

interface FileViewerProps {
    filePath: string;
    repoUrl?: string; // If remote
    branch?: string;
    onClose: () => void;
}

export default function FileViewer({ filePath, repoUrl, branch, onClose }: FileViewerProps) {
    const [content, setContent] = useState<string | null>(null);
    const [summary, setSummary] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [summarizing, setSummarizing] = useState(false);

    useEffect(() => {
        // Fetch file content
        const fetchFile = async () => {
            setLoading(true);
            try {
                const type = repoUrl ? 'remote' : 'local';
                const urlParams = new URLSearchParams({
                    path: filePath,
                    type,
                    ...(repoUrl && { url: repoUrl }),
                    ...(branch && { branch })
                });

                const res = await fetch(`/api/file?${urlParams}`);
                if (!res.ok) throw new Error('Failed to load file');
                const json = await res.json();
                setContent(json.content);
            } catch (e) {
                console.error(e);
                setContent('Error loading file content.');
            } finally {
                setLoading(false);
            }
        };

        fetchFile();
    }, [filePath, repoUrl, branch]);

    const generateSummary = async () => {
        if (!content || summarizing) return;
        setSummarizing(true);

        try {
            // Reuse chat API for summarization
            // We read config from localStorage to ensure we use the correct provider
            const configStr = localStorage.getItem('repoMapperConfig');
            const config = configStr ? JSON.parse(configStr) : undefined;

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: `Summarize the purpose and functionality of this file code in 2-3 sentences:\n\n${content.slice(0, 5000)}`, // Truncate for token limits
                    context: {}, // No extra context needed
                    config
                })
            });

            const data = await res.json();
            if (data.reply) setSummary(data.reply);
            else setSummary("Failed to generate summary.");

        } catch (e) {
            console.error(e);
            setSummary("Error generating summary.");
        } finally {
            setSummarizing(false);
        }
    };

    if (!filePath) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.title}>
                        <FileCode size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom' }} />
                        {filePath}
                    </div>
                    <div className={styles.actions}>
                        <button
                            className={`${styles.actionButton} ${styles.secondary}`}
                            onClick={generateSummary}
                            disabled={summarizing || loading}
                        >
                            <Sparkles size={14} style={{ marginRight: 6 }} />
                            {summarizing ? 'Summarizing...' : 'Summarize with AI'}
                        </button>
                        <X className="cursor-pointer" size={24} onClick={onClose} />
                    </div>
                </div>

                <div className={styles.content}>
                    {summary && (
                        <div className={styles.summarySection}>
                            <div className={styles.summaryTitle}>
                                <Sparkles size={14} />
                                AI Summary
                            </div>
                            <div className={styles.summaryText}>{summary}</div>
                        </div>
                    )}

                    <div className={styles.codeContainer}>
                        {loading ? (
                            <div className={styles.loading}>Loading content...</div>
                        ) : (
                            <pre className={styles.code}>{content}</pre>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
