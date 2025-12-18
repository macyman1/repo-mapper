import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { scanRepository } from '@/lib/analysis/scanner';

export async function POST(req: Request) {
    try {
        const { message, context, config } = await req.json();

        let reply = '';

        // Provider: Custom LLM (OpenAI Compatible)
        if (config?.provider === 'custom') {
            if (!config.baseUrl) {
                return NextResponse.json({ error: 'Base URL required for Custom LLM' }, { status: 400 });
            }

            reply = await queryCustomLLM(config, message, context);
        }
        // Provider: Gemini (Default)
        else {
            // Use provided key or env key
            const apiKey = config?.apiKey || process.env.GEMINI_API_KEY;

            if (!apiKey) {
                return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-thinking-exp' });

            reply = await queryGemini(model, message, context);
        }

        return NextResponse.json({ reply });
    } catch (error: any) {
        console.error('Chat error:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate response' }, { status: 500 });
    }
}

async function getContext(context: any) {
    let repoContext = context;
    if (!repoContext) {
        const data = await scanRepository(process.cwd());
        repoContext = JSON.stringify({
            files: data.fileCount,
            languages: data.languages,
            dependencies: data.dependencies,
            structure_preview: data.root.children?.slice(0, 10).map(c => c.name)
        }, null, 2);
    }
    return repoContext;
}

async function queryGemini(model: any, message: string, context: any) {
    const repoContext = await getContext(context);
    const prompt = `
      You are RepoMapper, an expert AI assistant for analyzing GitHub repositories.
      
      Here is the context of the repository being analyzed:
      ${repoContext}
      
      User Question: ${message}
      
      Answer the user's question based on the repository context. Be concise, technical, and helpful.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

async function queryCustomLLM(config: any, message: string, context: any) {
    const repoContext = await getContext(context);
    const systemPrompt = `You are RepoMapper, an expert AI assistant for analyzing GitHub repositories. Here is the context: ${repoContext}`;

    // Ensure URL ends with /chat/completions if not provided
    let url = config.baseUrl;

    // Remove trailing slash
    url = url.replace(/\/$/, '');

    // Heuristic: If it doesn't end in /chat/completions, append it.
    if (!url.endsWith('/chat/completions')) {
        // If it doesn't end in /v1 and looks like an IP/domain root (e.g. port 11434), assume v1 is needed
        // Most common logic: 
        // 1. http://host:port -> http://host:port/v1/chat/completions
        // 2. http://host:port/v1 -> http://host:port/v1/chat/completions

        if (url.endsWith('/v1')) {
            url += '/chat/completions';
        } else {
            // Assume typical OpenAI compat requires /v1
            // If user specifically puts /api (non-openai), this might break, but "Custom LLM" usually implies OpenAI compat
            url += '/v1/chat/completions';
        }
    }

    const payload = {
        model: config.modelName || 'llama3', // Default or user provided
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
        ],
        stream: false
    };

    console.log("Querying Custom LLM:", url);

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {})
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Custom LLM Error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return data.choices[0]?.message?.content || 'No response from model.';
}
