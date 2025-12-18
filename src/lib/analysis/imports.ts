import fs from 'fs/promises';
import path from 'path';

export interface FileImport {
    source: string; // The file doing the importing
    target: string; // The file being imported (resolved path if possible)
    raw: string; // The raw import string
}

const IMPORT_REGEX = {
    // ESM/TS: import ... from '...'
    js: /import\s+.*?\s+from\s+['"](.+?)['"]/g,
    // CJS: require('...')
    cjs: /require\(['"](.+?)['"]\)/g,
    // Python: from ... import ... or import ...
    python: /^(?:from|import)\s+([\w\.]+)/gm,
    // Go: import "..." or import ( ... ) - simplifying 
    go: /import\s+"(.+?)"/g,
};

export async function scanImports(filePath: string, extension: string): Promise<string[]> {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const imports: string[] = [];

        // JS/TS
        if (['.js', '.jsx', '.ts', '.tsx'].includes(extension)) {
            let match;
            while ((match = IMPORT_REGEX.js.exec(content)) !== null) {
                imports.push(match[1]);
            }
            while ((match = IMPORT_REGEX.cjs.exec(content)) !== null) {
                imports.push(match[1]);
            }
        }

        // Python
        if (extension === '.py') {
            let match;
            while ((match = IMPORT_REGEX.python.exec(content)) !== null) {
                imports.push(match[1]);
            }
        }

        return imports;
    } catch {
        return [];
    }
}
