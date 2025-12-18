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

        if (rawUrl) {
            // CLEAN THE URL: Remove query parameters (like ?tab=readme...)
            const repoUrl = rawUrl.split('?')[0];

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
