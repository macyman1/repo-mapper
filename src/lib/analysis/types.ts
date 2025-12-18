export type FileType = 'file' | 'directory';

export interface FileNode {
    name: string;
    path: string;
    type: FileType;
    children?: FileNode[];
    size?: number;
    extension?: string;
    language?: string;
}

export interface RepoAnalysis {
    root: FileNode;
    fileCount: number;
    dirCount: number;
    languages: Record<string, number>; // Language -> Count
    dependencies: Record<string, string[]>; // Manager -> Dependencies
    imports?: Record<string, string[]>; // File -> Imports
}
