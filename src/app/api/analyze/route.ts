import { NextResponse } from 'next/server';
import { scanRepository } from '@/lib/analysis/scanner';

export async function GET() {
    try {
        // For now, scan the current project directory as a demo
        const rootPath = process.cwd();
        const data = await scanRepository(rootPath);
        return NextResponse.json(data);
    } catch (error) {
        console.error('Analysis failed:', error);
        return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
    }
}
