import fs from 'fs/promises';
import path from 'path';
import { FileNode, RepoAnalysis } from './types';
import { detectLanguage } from './languages';
import { parseDependencies } from './dependencies';
import { scanImports } from './imports';

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', '.next', 'build', 'out', 'coverage', '.idea', '.vscode']);
const DEP_FILES = new Set(['package.json', 'requirements.txt', 'go.mod', 'Cargo.toml', 'Gemfile', 'composer.json', 'Pipfile']);

export async function scanRepository(rootPath: string): Promise<RepoAnalysis> {
    const stats = {
        fileCount: 0,
        dirCount: 0,
        languages: {} as Record<string, number>,
        dependencies: {} as Record<string, string[]>,
        imports: {} as Record<string, string[]>
    };

    const rootNode = await scanDir(rootPath, rootPath, stats);

    return {
        root: rootNode,
        ...stats
    };
}

interface ScanStats {
    fileCount: number;
    dirCount: number;
    languages: Record<string, number>;
    dependencies: Record<string, string[]>;
    imports: Record<string, string[]>;
}

async function scanDir(currentPath: string, rootPath: string, stats: ScanStats): Promise<FileNode> {
    const name = path.basename(currentPath);
    const relativePath = path.relative(rootPath, currentPath);

    const node: FileNode = {
        name: name || 'root',
        path: relativePath,
        type: 'directory',
        children: []
    };

    try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);

            if (entry.isDirectory()) {
                if (IGNORED_DIRS.has(entry.name)) continue;

                stats.dirCount++;
                node.children?.push(await scanDir(fullPath, rootPath, stats));
            } else {
                stats.fileCount++;
                const ext = path.extname(entry.name).toLowerCase();
                const language = detectLanguage(entry.name);

                if (language) {
                    stats.languages[language] = (stats.languages[language] || 0) + 1;
                }

                if (DEP_FILES.has(entry.name) || entry.name.toLowerCase() === 'pipfile') {
                    try {
                        const content = await fs.readFile(fullPath, 'utf-8');
                        const deps = await parseDependencies(content, entry.name);
                        const key = path.relative(rootPath, fullPath);
                        stats.dependencies[key] = deps;
                    } catch (e) {
                        console.error(`Failed to parse dependencies for ${fullPath}`, e);
                    }
                }

                // Scan for imports
                const imports = await scanImports(fullPath, ext);
                if (imports.length > 0) {
                    const key = path.relative(rootPath, fullPath);
                    stats.imports[key] = imports;
                }

                node.children?.push({
                    name: entry.name,
                    path: path.relative(rootPath, fullPath),
                    type: 'file',
                    size: (await fs.stat(fullPath)).size,
                    extension: ext,
                    language
                });
            }
        }
    } catch (error) {
        console.error(`Error scanning directory ${currentPath}:`, error);
    }

    // Sort children: directories first, then files
    node.children?.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'directory' ? -1 : 1;
    });

    return node;
}
