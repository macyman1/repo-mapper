'use client';

import { useMemo } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { RepoAnalysis } from '@/lib/analysis/types';

interface DependencyGraphProps {
    data: RepoAnalysis;
    onNodeClick?: (path: string) => void;
}

export default function DependencyGraph({ data, onNodeClick }: DependencyGraphProps) {
    const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
        const nodes: Node[] = [];
        const edges: Edge[] = [];

        if (!data.imports) return { nodes, edges };

        const files = Object.keys(data.imports);
        const addedNodes = new Set<string>();

        // Create unique list of all files involved (sources and targets)
        // This is simplified; targets might not match exact file paths in our scan
        // For a robust graph, we'd need to resolve import paths to real file paths

        // For this MVP, we only graph nodes we actually found in the traverse
        // plus direct string matches from imports if they look like local paths

        // Position calculation (naive circle layout)
        const radius = 300;
        const center = { x: 400, y: 300 };

        files.forEach((file, index) => {
            const angle = (index / files.length) * 2 * Math.PI;
            nodes.push({
                id: file,
                data: { label: file.split('/').pop() }, // Show basename
                position: {
                    x: center.x + radius * Math.cos(angle),
                    y: center.y + radius * Math.sin(angle)
                },
                type: 'default',
                style: {
                    background: '#1e293b',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    fontSize: '12px',
                    width: 150
                }
            });
            addedNodes.add(file);
        });

        files.forEach(source => {
            const imports = data.imports![source];
            imports.forEach((target, i) => {
                // Heuristic: if target starts with . or /, assume local
                if (target.startsWith('.') || target.startsWith('/')) {
                    // Try to resolve or just use the raw string as ID for visualization?
                    // Using raw string might create duplicates if we don't normalize
                    // For now, let's just link if we can find a matching node ending in target?
                    // Or better, just add the edge if we can guess it.

                    // Simpler: Just create an edge to a node if it exists, roughly
                    // or create a "ghost" node for the import

                    const targetId = target;
                    // We won't add nodes for every external import to avoid clutter, 
                    // only if it looks like a local file we already tracked?
                    // Actually visualization is better if we show everything imported locally.

                    edges.push({
                        id: `${source}-${target}-${i}`,
                        source,
                        target: targetId,
                        label: '',
                        animated: true,
                        style: { stroke: '#3b82f6' },
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }
                    });

                    if (!addedNodes.has(targetId)) {
                        // Add ghost node for unknown/unresolved local import
                        nodes.push({
                            id: targetId,
                            data: { label: targetId.split('/').pop() },
                            position: { x: center.x + (Math.random() * 100), y: center.y + (Math.random() * 100) },
                            style: { background: '#334155', color: '#cbd5e1', width: 100, fontSize: '10px' }
                        });
                        addedNodes.add(targetId);
                    }
                }
            });
        });

        return { nodes, edges };
    }, [data]);

    const [nodes, , onNodesChange] = useNodesState(initialNodes);
    const [edges, , onEdgesChange] = useEdgesState(initialEdges);

    if (nodes.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-slate-500">
                No imports detected or graph is empty.
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '500px', backgroundColor: '#0f172a', borderRadius: '0.75rem', border: '1px solid #334155' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={(_, node) => onNodeClick?.(node.id)}
                fitView
            >
                <Background color="#334155" gap={16} />
                <Controls />
                <MiniMap style={{ background: '#1e293b' }} nodeColor="#3b82f6" />
            </ReactFlow>
        </div>
    );
}
