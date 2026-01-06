'use client';

import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Brain,
  Loader2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Info,
  Sparkles,
  Target,
  Network,
} from 'lucide-react';
import { motion } from 'framer-motion';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';
import { StartSessionModal } from '@/components/knowledge-graph/start-session-modal';

// Dynamic import for react-force-graph-2d (no SSR)
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
    </div>
  ),
});

interface GraphNode {
  id: string;
  topic: string;
  masteryLevel: number;
  isExplored: boolean;
  isSuggested: boolean;
  studySessionId: string | null;
  x?: number;
  y?: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationshipType: string;
  strength: number;
}

export default function KnowledgeGraphPage() {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [unexploredNodeForModal, setUnexploredNodeForModal] = useState<{
    node: GraphNode;
    parentTopic?: string;
    relationshipType?: 'PREREQUISITE' | 'RELATED' | 'SUBTOPIC';
  } | null>(null);

  const { data: graphData, isLoading } = api.knowledgeGraph.getGraph.useQuery();
  const { data: stats } = api.knowledgeGraph.getStats.useQuery();

  // Measure container dimensions using ResizeObserver for accurate timing
  // Re-run when isEmpty changes (container appears after data loads)
  useEffect(() => {
    // Small delay to ensure container is rendered
    const timer = setTimeout(() => {
      if (!containerRef.current) return;

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0) {
            setDimensions({
              width: Math.floor(width),
              height: Math.floor(height) || 500,
            });
          }
        }
      });

      resizeObserver.observe(containerRef.current);

      // Store cleanup
      return () => resizeObserver.disconnect();
    }, 100);

    return () => clearTimeout(timer);
  }, [graphData]);

  // Center graph after it loads
  useEffect(() => {
    if (graphRef.current && graphData?.nodes?.length) {
      // Wait for simulation to settle, then center
      setTimeout(() => {
        graphRef.current?.centerAt(0, 0, 500);
        graphRef.current?.zoom(1, 500);
      }, 500);
    }
  }, [graphData]);

  // Transform data for force graph
  const forceGraphData = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] };

    return {
      nodes: graphData.nodes.map((node) => ({
        ...node,
        id: node.id,
        name: node.topic,
      })),
      links: graphData.edges.map((edge) => ({
        ...edge,
        source: edge.source,
        target: edge.target,
      })),
    };
  }, [graphData]);

  // Node color based on mastery
  // Since sessions only complete with 90%+ mastery, we only have 2 realistic states
  const getNodeColor = useCallback((node: GraphNode) => {
    if (node.isSuggested) return '#64748b'; // gray for suggested (not yet studied)
    return '#10b981'; // green for mastered (all explored nodes are mastered)
  }, []);

  // Node size based on mastery
  const getNodeSize = useCallback((node: GraphNode) => {
    if (node.isSuggested) return 4;
    const base = 6;
    return base + node.masteryLevel * 8;
  }, []);

  // Zoom controls
  const handleZoomIn = () => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() * 1.5, 300);
    }
  };

  const handleZoomOut = () => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() / 1.5, 300);
    }
  };

  const handleCenter = () => {
    if (graphRef.current) {
      graphRef.current.centerAt(0, 0, 500);
      graphRef.current.zoom(1, 500);
    }
  };

  // Node click handler
  const handleNodeClick = useCallback((node: GraphNode) => {
    if (node.isSuggested) {
      // For unexplored nodes, find what topic it's connected to
      const edge = graphData?.edges.find(
        (e) => e.target === node.id || e.source === node.id
      );
      let parentTopic: string | undefined;
      let relationshipType: 'PREREQUISITE' | 'RELATED' | 'SUBTOPIC' | undefined;

      if (edge) {
        // Find the other node
        const parentId = edge.source === node.id ? edge.target : edge.source;
        const parentNode = graphData?.nodes.find((n) => n.id === parentId);
        parentTopic = parentNode?.topic;
        relationshipType = edge.relationshipType as typeof relationshipType;
      }

      setUnexploredNodeForModal({
        node,
        parentTopic,
        relationshipType,
      });
    } else {
      // For explored nodes, show details panel and zoom
      setSelectedNode(node);
      if (graphRef.current) {
        graphRef.current.centerAt(node.x, node.y, 500);
        graphRef.current.zoom(2, 500);
      }
    }
  }, [graphData]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-violet-500" />
          <p className="text-lg text-slate-500">Loading your knowledge graph...</p>
        </div>
      </div>
    );
  }

  const isEmpty = !graphData?.nodes?.length;

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/25">
            <Brain className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Knowledge Graph
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Visualize how your learned topics connect
            </p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="flex gap-3">
            <StatBadge
              icon={<Target className="h-4 w-4" />}
              label="Explored"
              value={stats.exploredNodes}
              color="violet"
            />
            <StatBadge
              icon={<Sparkles className="h-4 w-4" />}
              label="Mastered"
              value={stats.masteredNodes}
              color="emerald"
            />
            <StatBadge
              icon={<Network className="h-4 w-4" />}
              label="Connections"
              value={stats.totalEdges}
              color="amber"
            />
          </div>
        )}
      </div>

      {/* Empty State */}
      {isEmpty && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
              <Brain className="h-10 w-10 text-violet-500" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-slate-900 dark:text-white">
              Your Knowledge Graph is Empty
            </h3>
            <p className="mt-2 max-w-md text-center text-slate-500">
              Complete study sessions to build your knowledge graph. Each topic you master
              becomes a node, and the AI will identify connections between topics.
            </p>
            <Button className="mt-6 gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600" asChild>
              <a href="/explain">
                <Sparkles className="h-4 w-4" />
                Start Learning
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Graph Canvas */}
      {!isEmpty && (
        <Card className="border-0 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 shadow-2xl">
          <CardHeader className="border-b border-white/10 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Interactive Knowledge Map</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomIn}
                  className="h-8 w-8 text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomOut}
                  className="h-8 w-8 text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCenter}
                  className="h-8 w-8 text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="relative p-0">
            {/* Legend */}
            <div className="absolute left-4 top-4 z-10 rounded-lg border border-white/10 bg-slate-900/90 p-3 backdrop-blur">
              <p className="mb-2 text-xs font-medium text-white/70">Node Types</p>
              <div className="space-y-1.5">
                <LegendItem color="#10b981" label="Mastered" />
                <LegendItem color="#64748b" label="Suggested (AI)" dashed />
              </div>
            </div>

            {/* Selected Node Info */}
            {selectedNode && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute right-4 top-4 z-10 w-64 rounded-lg border border-white/10 bg-slate-900/90 p-4 backdrop-blur"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-white">{selectedNode.topic}</h4>
                    <p className="text-sm text-slate-400">
                      {selectedNode.isExplored ? 'Explored' : 'Suggested'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedNode(null)}
                    className="h-6 w-6 text-white/50 hover:text-white"
                  >
                    ×
                  </Button>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Mastery</span>
                    <span className="font-medium text-white">
                      {Math.round(selectedNode.masteryLevel * 100)}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                      style={{ width: `${selectedNode.masteryLevel * 100}%` }}
                    />
                  </div>
                </div>
                {selectedNode.studySessionId && (
                  <Button
                    className="mt-4 w-full gap-2"
                    variant="secondary"
                    size="sm"
                    asChild
                  >
                    <a href={`/study-sessions/${selectedNode.studySessionId}`}>
                      <Info className="h-3.5 w-3.5" />
                      View Session
                    </a>
                  </Button>
                )}
              </motion.div>
            )}

            {/* Force Graph */}
            <div ref={containerRef} className="h-[500px] w-full">
              {dimensions.width > 0 && (
              <ForceGraph2D
                ref={graphRef}
                width={dimensions.width}
                height={dimensions.height}
                graphData={forceGraphData}
                nodeColor={(node: any) => getNodeColor(node as GraphNode)}
                nodeVal={(node: any) => getNodeSize(node as GraphNode)}
                nodeLabel={(node: any) => (node as GraphNode).topic}
                nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                  const n = node as GraphNode;
                  const size = getNodeSize(n);
                  const color = getNodeColor(n);

                  // Draw node circle
                  ctx.beginPath();
                  ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
                  ctx.fillStyle = color;
                  ctx.fill();

                  // Draw border for suggested nodes
                  if (n.isSuggested) {
                    ctx.setLineDash([2, 2]);
                    ctx.strokeStyle = '#94a3b8';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.setLineDash([]);
                  }

                  // Only show labels on hover via nodeLabel prop
                  // No inline labels to avoid clutter
                }}
                linkColor={() => 'rgba(139, 92, 246, 0.4)'}
                linkWidth={(link: any) => Math.max(1, link.strength * 2)}
                onNodeClick={(node: any) => handleNodeClick(node as GraphNode)}
                onNodeHover={(node: any) => setHoveredNode(node as GraphNode | null)}
                backgroundColor="transparent"
                cooldownTicks={300}
                d3AlphaDecay={0.008}
                d3VelocityDecay={0.2}
              />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!isEmpty && (
        <Card className="border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/30">
          <CardContent className="flex items-center gap-4 py-4">
            <Info className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            <p className="text-sm text-violet-700 dark:text-violet-300">
              <strong>Tip:</strong> Click explored (green) nodes to see details. Click suggested (gray) nodes to start a new study session.
              Scroll to zoom. Larger nodes = higher mastery.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Start Session Modal for unexplored nodes */}
      {unexploredNodeForModal && (
        <StartSessionModal
          open={!!unexploredNodeForModal}
          onClose={() => setUnexploredNodeForModal(null)}
          node={unexploredNodeForModal.node}
          parentTopic={unexploredNodeForModal.parentTopic}
          relationshipType={unexploredNodeForModal.relationshipType}
        />
      )}
    </div>
  );
}

function StatBadge({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'violet' | 'emerald' | 'amber';
}) {
  const colors = {
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  };

  return (
    <div className={cn('flex items-center gap-2 rounded-lg px-3 py-2', colors[color])}>
      {icon}
      <span className="text-sm font-medium">
        {value} {label}
      </span>
    </div>
  );
}

function LegendItem({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn('h-3 w-3 rounded-full', dashed && 'border-2 border-dashed')}
        style={{
          backgroundColor: dashed ? 'transparent' : color,
          borderColor: dashed ? color : undefined,
        }}
      />
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}
