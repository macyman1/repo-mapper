import path from 'path';

export async function parseDependencies(content: string, filename: string): Promise<string[]> {
    const name = path.basename(filename);

    switch (name) {
        case 'package.json':
            return parsePackageJson(content);
        case 'requirements.txt':
            return parseRequirementsTxt(content);
        case 'go.mod':
            return parseGoMod(content);
        case 'Cargo.toml':
            return parseCargoToml(content);
        case 'Gemfile':
            return parseGemfile(content);
        case 'composer.json':
            return parseComposerJson(content);
        case 'pipfile': // Pipfile is usually PascalCase but let's handle case insensitive in caller or here
        case 'Pipfile':
            return parsePipfile(content);
        // Add more as needed
        default:
            return [];
    }
}

function parsePackageJson(content: string): string[] {
    try {
        const json = JSON.parse(content);
        const deps = { ...json.dependencies, ...json.devDependencies };
        return Object.keys(deps);
    } catch {
        return [];
    }
}

function parseRequirementsTxt(content: string): string[] {
    return content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(line => line.split(/[==,>=,<=,<,>,~=,;]/)[0].trim()) // naive split
        .filter(Boolean);
}

function parseGoMod(content: string): string[] {
    const deps: string[] = [];
    const lines = content.split('\n');
    let inRequire = false;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('require (')) {
            inRequire = true;
            continue;
        }
        if (inRequire && trimmed === ')') {
            inRequire = false;
            continue;
        }

        if (trimmed.startsWith('require ')) {
            const parts = trimmed.split(' ');
            if (parts.length > 1) deps.push(parts[1]);
        } else if (inRequire && trimmed) {
            const parts = trimmed.split(' ');
            if (parts.length > 0) deps.push(parts[0]);
        }
    }
    return deps;
}

function parseCargoToml(content: string): string[] {
    // Very naive TOML parser for dependencies
    // Real usage should use a TOML parser
    const deps: string[] = [];
    const lines = content.split('\n');
    let inDeps = false;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('[')) {
            if (trimmed === '[dependencies]' || trimmed === '[dev-dependencies]') {
                inDeps = true;
            } else {
                inDeps = false;
            }
            continue;
        }

        if (inDeps && trimmed && !trimmed.startsWith('#')) {
            const parts = trimmed.split('=');
            if (parts.length > 0) deps.push(parts[0].trim());
        }
    }
    return deps;
}

function parseGemfile(content: string): string[] {
    return content
        .split('\n')
        .filter(line => line.trim().startsWith('gem '))
        .map(line => {
            const parts = line.trim().split(" ");
            // gem 'rails', '5.0.0' or gem "rails", "5.0.0"
            if (parts.length > 1) {
                return parts[1].replace(/['",]/g, '');
            }
            return '';
        })
        .filter(Boolean);
}

function parseComposerJson(content: string): string[] {
    try {
        const json = JSON.parse(content);
        // Actually composer uses "require-dev"
        const allDeps = { ...json.require, ...json['require-dev'] };
        return Object.keys(allDeps);
    } catch {
        return [];
    }
}

function parsePipfile(content: string): string[] {
    // Naive parse [packages] and [dev-packages]
    // Structure is [section]\npackage = "version"
    const deps: string[] = [];
    let capture = false;
    const lines = content.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '[packages]' || trimmed === '[dev-packages]') {
            capture = true;
            continue;
        }
        if (trimmed.startsWith('[') && trimmed !== '[packages]' && trimmed !== '[dev-packages]') {
            capture = false;
            continue;
        }
        if (capture && trimmed && !trimmed.startsWith('#')) {
            const parts = trimmed.split('=');
            if (parts.length > 0) deps.push(parts[0].trim());
        }
    }
    return deps;
}
