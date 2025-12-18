import { NextResponse } from 'next/server';
import { scanRepository } from '@/lib/analysis/scanner';
import simpleGit from 'simple-git';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const rawUrl = searchParams.get('url');

    try {
        let rootPath = process.cwd();
        let isTemp = false;
        let repoUrl = '';

        if (rawUrl) {
            // CLEAN THE URL: Remove query parameters (like ?tab=readme...)
            repoUrl = rawUrl.split('?')[0];

            // Create temp dir
            const tmpDir = os.tmpdir();
            const runId = Math.random().toString(36).substring(7);
            rootPath = path.join(tmpDir, `repomapper-${runId}`);

            // Clone
            await fs.mkdir(rootPath, { recursive: true });
            const git = simpleGit();

            // Add shallow clone for speed
            await git.clone(repoUrl, rootPath, ['--depth', '1']);
            isTemp = true;
        }

        const data = await scanRepository(rootPath);

        // Enrich data with remote info
        if (isTemp && repoUrl) {
            data.url = repoUrl;
            // Get Commit Hash as branch ref (immutable)
            const git = simpleGit(rootPath);
            const hash = await git.revparse(['HEAD']);
            data.branch = hash.trim();
        } else {
            data.url = '';
            data.branch = '';
        }

        // Cleanup if temp
        if (isTemp) {
            try {
                await fs.rm(rootPath, { recursive: true, force: true });
            } catch (cleanupErr) {
                console.error("Failed to cleanup temp dir:", cleanupErr);
            }
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Analysis failed:', error);
        return NextResponse.json({ error: 'Analysis failed: ' + error.message }, { status: 500 });
    }
}
