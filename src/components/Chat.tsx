'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, MessageSquare, Settings } from 'lucide-react';
import styles from './Chat.module.css';

interface Message {
    role: 'user' | 'ai';
    content: string;
}

interface ChatConfig {
    provider: 'gemini' | 'custom';
    apiKey?: string;
    baseUrl?: string;
    modelName?: string;
}

export default function Chat({ context }: { context?: any }) {
    const [isOpen, setIsOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'ai', content: 'Hi! I am RepoMapper AI. Ask me anything about this repository.' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Settings State
    const [config, setConfig] = useState<ChatConfig>({
        provider: 'gemini',
        apiKey: '',
        baseUrl: '',
        modelName: ''
    });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    // Load settings from local storage on mount
    useEffect(() => {
        const saved = localStorage.getItem('repoMapperConfig');
        if (saved) {
            try {
                setConfig(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load settings", e);
            }
        }
    }, []);

    const saveSettings = () => {
        localStorage.setItem('repoMapperConfig', JSON.stringify(config));
        setShowSettings(false);
        setMessages(prev => [...prev, { role: 'ai', content: `Switched to ${config.provider === 'gemini' ? 'Gemini' : 'Custom LLM'} provider.` }]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg,
                    context: context ? JSON.stringify(context) : undefined,
                    config // Send config with request
                }),
            });

            const data = await response.json();

            if (data.error) throw new Error(data.error);

            setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I encountered an error. Please check your settings and API key.' }]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <div className={`${styles.chatContainer} ${styles.collapsed}`}>
                <button className={styles.toggleButton} onClick={() => setIsOpen(true)}>
                    <MessageSquare size={20} />
                    Ask RepoMapper
                </button>
            </div>
        );
    }

    return (
        <div className={styles.chatContainer}>
            <div className={styles.header} onClick={() => !showSettings && setIsOpen(false)}>
                <div className={styles.title}>
                    <Bot size={20} />
                    RepoMapper AI
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Settings
                        size={20}
                        className="cursor-pointer hover:text-blue-400"
                        onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }}
                    />
                    <X size={20} onClick={() => setIsOpen(false)} />
                </div>
            </div>

            {showSettings ? (
                <div className={styles.settingsPanel}>
                    <div className={styles.settingsHeader}>
                        <span className={styles.settingsTitle}>AI Settings</span>
                        <X size={20} className="cursor-pointer" onClick={() => setShowSettings(false)} />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Provider</label>
                        <div className={styles.radioGroup}>
                            <label className={styles.radioLabel}>
                                <input
                                    type="radio"
                                    checked={config.provider === 'gemini'}
                                    onChange={() => setConfig({ ...config, provider: 'gemini' })}
                                />
                                Gemini
                            </label>
                            <label className={styles.radioLabel}>
                                <input
                                    type="radio"
                                    checked={config.provider === 'custom'}
                                    onChange={() => setConfig({ ...config, provider: 'custom' })}
                                />
                                Custom LLM
                            </label>
                        </div>
                    </div>

                    {config.provider === 'gemini' ? (
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Gemini API Key (Optional if env set)</label>
                            <input
                                type="password"
                                className={styles.inputField}
                                value={config.apiKey}
                                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                                placeholder="AIzaSy..."
                            />
                        </div>
                    ) : (
                        <>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Base URL</label>
                                <input
                                    type="text"
                                    className={styles.inputField}
                                    value={config.baseUrl}
                                    onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                                    placeholder="http://localhost:11434/v1"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>API Key (Optional)</label>
                                <input
                                    type="password"
                                    className={styles.inputField}
                                    value={config.apiKey}
                                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                                    placeholder="sk-..."
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Model Name (Optional)</label>
                                <input
                                    type="text"
                                    className={styles.inputField}
                                    value={config.modelName}
                                    onChange={(e) => setConfig({ ...config, modelName: e.target.value })}
                                    placeholder="llama3"
                                />
                            </div>
                        </>
                    )}

                    <button className={styles.saveButton} onClick={saveSettings}>Save Settings</button>
                </div>
            ) : (
                <>
                    <div className={styles.messages}>
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.aiMessage}`}>
                                {msg.content}
                            </div>
                        ))}
                        {loading && <div className={`${styles.message} ${styles.aiMessage}`}>Thinking...</div>}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className={styles.inputArea} onSubmit={handleSubmit}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask a question..."
                            className={styles.input}
                        />
                        <button type="submit" className={styles.sendButton} disabled={loading}>
                            <Send size={18} />
                        </button>
                    </form>
                </>
            )}
        </div>
    );
}
