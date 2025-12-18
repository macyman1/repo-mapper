'use client';

import { useMemo, useCallback, useState } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    MarkerType,
    ReactFlowProvider,
    Panel,
    Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { Maximize2, Minimize2 } from 'lucide-react';
import type { RepoAnalysis, FileNode } from '@/lib/analysis/types';

interface DependencyGraphProps {
    data: RepoAnalysis;
    onNodeClick?: (path: string) => void;
}

const nodeWidth = 180;
const nodeHeight = 40;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({
        rankdir: direction,
        ranksep: 150, // Vertical spacing between ranks (levels)
        nodesep: 50   // Horizontal spacing between nodes
    });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);

        // Dagre shifts graph to 0,0 - shift slightly
        return {
            ...node,
            targetPosition: isHorizontal ? Position.Left : Position.Top,
            sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
            position: {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
};

function getAllFiles(node: FileNode, paths: Set<string> = new Set()): Set<string> {
    if (node.type === 'file') {
        paths.add(node.path);
    }
    if (node.children) {
        node.children.forEach(child => getAllFiles(child, paths));
    }
    return paths;
}

const getNodeColor = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'ts':
        case 'tsx':
            return '#3b82f6'; // blue
        case 'js':
        case 'jsx':
            return '#eab308'; // yellow
        case 'css':
        case 'scss':
            return '#ec4899'; // pink
        case 'json':
            return '#a855f7'; // purple
        case 'md':
            return '#64748b'; // slate
        default:
            return '#10b981'; // emerald
    }
};

export default function DependencyGraph({ data, onNodeClick }: DependencyGraphProps) {
    // Basic graph data construction
    const { nodes: baseNodes, edges: baseEdges } = useMemo(() => {
        if (!data.imports) return { nodes: [], edges: [] };

        const allFiles = getAllFiles(data.root);
        const nodes: Node[] = [];
        const edges: Edge[] = [];
        const addedNodes = new Set<string>();

        // 1. Create nodes for all files that either import or are imported
        // Ideally we start with files that have imports
        const filesWithImports = Object.keys(data.imports);

        // Helper to add node if not exists
        const addNode = (path: string) => {
            if (addedNodes.has(path)) return;
            const label = path.split('/').pop() || path;
            const color = getNodeColor(label);

            nodes.push({
                id: path,
                data: { label },
                position: { x: 0, y: 0 }, // Calculated by dagre later
                style: {
                    background: '#1e293b',
                    color: '#f8fafc',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: color,
                    borderRadius: '6px',
                    fontSize: '12px',
                    width: nodeWidth,
                    padding: '8px',
                    textAlign: 'center',
                    transition: 'all 0.2s', // Smooth fade
                }
            });
            addedNodes.add(path);
        };

        filesWithImports.forEach(source => {
            addNode(source);

            const imports = data.imports![source] || [];
            imports.forEach(importPath => {
                let targetId = importPath;

                // Try to resolve relative paths
                if (importPath.startsWith('.')) {
                    // Simple path resolution
                    // source: src/components/Graph.tsx
                    // import: ./utils
                    // result: src/components/utils

                    try {
                        // We need a proper path resolve implementation that mimics Node/TS resolution
                        // This is a simplified version.
                        // 1. Get dir of source
                        const sourceDir = source.split('/').slice(0, -1).join('/');
                        // 2. Resolve relative path
                        // We don't have 'path' module in client, do simple string manip
                        const parts = sourceDir.split('/').filter(Boolean);
                        const importParts = importPath.split('/');

                        for (const part of importParts) {
                            if (part === '.') continue;
                            if (part === '..') {
                                parts.pop();
                            } else {
                                parts.push(part);
                            }
                        }

                        const resolvedBase = parts.join('/');

                        // Check against allFiles to find match with extension
                        // resolvedBase could be 'src/lib/types'
                        // target could be 'src/lib/types.ts'

                        const potentialMatches = Array.from(allFiles).filter(f => {
                            const fBase = f.substring(0, f.lastIndexOf('.'));
                            return f === resolvedBase || fBase === resolvedBase;
                        });

                        if (potentialMatches.length > 0) {
                            // Prefer exact match or first found
                            targetId = potentialMatches[0];
                        }
                    } catch (e) {
                        // fallback to raw string
                    }
                } else if (importPath.startsWith('@/')) {
                    // Handle alias if possible, assuming @/ maps to src/ (common in Next.js)
                    const resolvedBase = 'src/' + importPath.slice(2);
                    const potentialMatches = Array.from(allFiles).filter(f => {
                        const fBase = f.substring(0, f.lastIndexOf('.'));
                        return f === resolvedBase || fBase === resolvedBase;
                    });
                    if (potentialMatches.length > 0) {
                        targetId = potentialMatches[0];
                    }
                }

                addNode(targetId);

                const edgeId = `${source}-${targetId}`;
                // Avoid duplicates
                if (!edges.some(e => e.id === edgeId)) {
                    edges.push({
                        id: edgeId,
                        source,
                        target: targetId,
                        type: 'smoothstep', // Cleaner lines
                        animated: true,
                        style: { stroke: '#475569', strokeWidth: 1.5 },
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' }
                    });
                }
            });
        });

        // Filter out nodes with no edges to reduce clutter? 
        // Or keep them if they are in the imports list? 
        // Current approach keeps everything connected or involved in imports.

        return getLayoutedElements(nodes, edges);
    }, [data]);

    const [nodes, setNodes, onNodesChange] = useNodesState(baseNodes);
    const [edges, setEdges, onEdgesState] = useEdgesState(baseEdges);

    // Update state when data changes
    useMemo(() => {
        setNodes(baseNodes);
        setEdges(baseEdges);
    }, [baseNodes, baseEdges, setNodes, setEdges]);

    // Focus Mode Logic
    const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
        // Optimization: Don't update if already focused on this node? 
        // We can't easily check current style state without ref or complex logic, 
        // but we can trust React/ReactFlow to handle diffs if identities are stable-ish.
        // But to be safe, let's keep it simple.

        const connectedEdgeIds = new Set<string>();
        const connectedNodeIds = new Set<string>();
        connectedNodeIds.add(node.id);

        // Find connected edges and nodes
        baseEdges.forEach(edge => {
            if (edge.source === node.id || edge.target === node.id) {
                connectedEdgeIds.add(edge.id);
                connectedNodeIds.add(edge.source);
                connectedNodeIds.add(edge.target);
            }
        });

        setNodes(nds => nds.map(n => {
            const isConnected = connectedNodeIds.has(n.id);
            return {
                ...n,
                style: {
                    ...n.style,
                    opacity: isConnected ? 1 : 0.1,
                    borderWidth: isConnected && n.id !== node.id ? '2px' : '1px'
                }
            };
        }));

        setEdges(eds => eds.map(e => {
            const isConnected = connectedEdgeIds.has(e.id);
            return {
                ...e,
                style: {
                    ...e.style,
                    opacity: isConnected ? 1 : 0.05,
                    strokeWidth: isConnected ? 2.5 : 1.5,
                    stroke: isConnected ? '#3b82f6' : '#475569'
                },
                animated: isConnected
            };
        }));
    }, [baseEdges, setNodes, setEdges]);

    const onNodeMouseLeave = useCallback(() => {
        setNodes(baseNodes);
        setEdges(baseEdges);
    }, [baseNodes, baseEdges, setNodes, setEdges]);

    const [allFiles] = useState(() => getAllFiles(data.root));

    const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        // Only allow clicking if the file actually exists in our scan
        if (allFiles.has(node.id)) {
            console.log('Node clicked:', node.id);
            if (onNodeClick) {
                onNodeClick(node.id);
            }
        } else {
            console.log('Clicked external/unresolved node:', node.id);
        }
    }, [onNodeClick, allFiles]);

    // Full Screen State
    const [isFullScreen, setIsFullScreen] = useState(false);

    if (nodes.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-slate-500">
                No imports detected or graph is empty.
            </div>
        );
    }

    const containerStyle = isFullScreen ? {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 50,
        backgroundColor: '#0f172a',
        borderRadius: 0,
        border: 'none'
    } : {
        width: '100%',
        height: '600px',
        backgroundColor: '#0f172a',
        borderRadius: '0.75rem',
        border: '1px solid #334155'
    };

    return (
        <div style={containerStyle}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesState}
                onNodeClick={handleNodeClick}
                onNodeMouseEnter={onNodeMouseEnter}
                onNodeMouseLeave={onNodeMouseLeave}
                fitView
                minZoom={0.1}
            >
                <Background color="#334155" gap={16} />
                <Controls />
                <MiniMap
                    style={{ background: '#1e293b' }}
                    nodeColor={(node) => {
                        return node.style?.border?.toString().split(' ')[2] || '#3b82f6';
                    }}
                />

                {/* Legend Panel */}
                <Panel position="top-right" className="bg-slate-800 p-2 rounded-md border border-slate-700 text-xs text-slate-300 pointer-events-none mb-10">
                    <div className="flex flex-col gap-1">
                        <div className="font-semibold mb-1 border-b border-slate-600 pb-1">File Types</div>
                        <div className="flex gap-2 items-center"><span className="w-3 h-3 rounded-full bg-blue-500"></span> TS/TSX</div>
                        <div className="flex gap-2 items-center"><span className="w-3 h-3 rounded-full bg-yellow-500"></span> JS/JSX</div>
                        <div className="flex gap-2 items-center"><span className="w-3 h-3 rounded-full bg-pink-500"></span> CSS</div>
                        <div className="mt-2 text-[10px] text-slate-400">Hover node to focus</div>
                    </div>
                </Panel>

                {/* Full Screen Toggle */}
                <Panel position="top-right" className="bg-slate-800 p-1 rounded-md border border-slate-700 text-slate-300 pointer-events-auto cursor-pointer hover:bg-slate-700 hover:text-white transition-colors">
                    <button
                        onClick={() => setIsFullScreen(!isFullScreen)}
                        title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                        className="p-1 flex items-center justify-center bg-transparent border-none text-current cursor-pointer"
                    >
                        {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                </Panel>
            </ReactFlow>
        </div>
    );
}
