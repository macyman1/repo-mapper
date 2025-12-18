import { NextResponse } from 'next/server';
import { model } from '@/lib/ai/gemini';
import { scanRepository } from '@/lib/analysis/scanner';

export async function POST(req: Request) {
    try {
        const { message, context } = await req.json();

        if (!model) {
            return NextResponse.json(
                { error: 'Gemini API key not configured' },
                { status: 500 }
            );
        }

        // In a real app, we would cache this context or generate it more efficiently
        // For now, we'll scan the repo if context isn't fully provided, or use the summary provided
        let repoContext = context;
        if (!repoContext) {
            // Fallback: scan current repo to get fresh context
            const data = await scanRepository(process.cwd());
            repoContext = JSON.stringify({
                files: data.fileCount,
                languages: data.languages,
                dependencies: data.dependencies,
                structure_preview: data.root.children?.slice(0, 10).map(c => c.name)
            }, null, 2);
        }

        const prompt = `
      You are RepoMapper, an expert AI assistant for analyzing GitHub repositories.
      
      Here is the context of the repository being analyzed:
      ${repoContext}
      
      User Question: ${message}
      
      Answer the user's question based on the repository context. Be concise, technical, and helpful.
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ reply: text });
    } catch (error) {
        console.error('Chat error:', error);
        return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
    }
}
