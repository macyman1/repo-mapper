import path from 'path';

const EXTENSION_MAP: Record<string, string> = {
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.py': 'Python',
    '.go': 'Go',
    '.rs': 'Rust',
    '.java': 'Java',
    '.c': 'C',
    '.cpp': 'C++',
    '.h': 'C/C++',
    '.css': 'CSS',
    '.html': 'HTML',
    '.json': 'JSON',
    '.md': 'Markdown',
    '.yml': 'YAML',
    '.yaml': 'YAML',
    '.xml': 'XML',
    '.sh': 'Shell',
    '.rb': 'Ruby',
    '.php': 'PHP',
};

const FILENAME_MAP: Record<string, string> = {
    'Dockerfile': 'Docker',
    'Makefile': 'Make',
    'Gemfile': 'Ruby',
};

export function detectLanguage(filename: string): string | undefined {
    const ext = path.extname(filename).toLowerCase();

    if (FILENAME_MAP[filename]) {
        return FILENAME_MAP[filename];
    }

    return EXTENSION_MAP[ext];
}


