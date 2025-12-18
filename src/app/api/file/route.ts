import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('path');
    const type = searchParams.get('type') || 'local';
    const url = searchParams.get('url');
    const branch = searchParams.get('branch') || 'main';

    if (!filePath) {
        return NextResponse.json({ error: 'Path required' }, { status: 400 });
    }

    try {
        if (type === 'remote' && url) {
            // Construct raw GitHub URL
            // https://github.com/owner/repo -> https://raw.githubusercontent.com/owner/repo/branch/path

            let rawBase = url.replace('github.com', 'raw.githubusercontent.com');
            // ensure no .git extension
            if (rawBase.endsWith('.git')) rawBase = rawBase.slice(0, -4);

            const fileUrl = `${rawBase}/${branch}/${filePath}`;
            console.log('Fetching remote file:', fileUrl);

            const res = await fetch(fileUrl);
            if (!res.ok) throw new Error(`Remote file not found: ${res.statusText}`);

            const content = await res.text();
            return NextResponse.json({ content });
        } else {
            // Local: Prevent directory traversal
            // Assume cwd is project root. 
            // filePath should be relative from root.

            const safePath = path.join(process.cwd(), filePath);

            // Very basic security check: ensure it stays within cwd
            if (!safePath.startsWith(process.cwd())) {
                return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
            }

            const content = await fs.readFile(safePath, 'utf-8');
            return NextResponse.json({ content });
        }
    } catch (error: any) {
        console.error('File fetch error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch file' }, { status: 500 });
    }
}
