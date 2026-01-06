'use client';

import { useRouter } from 'next/navigation';
import { BookOpen, Loader2, Sparkles, ArrowRight, Link as LinkIcon } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/trpc/react';
import { useState, useEffect } from 'react';

interface StartSessionModalProps {
  open: boolean;
  onClose: () => void;
  node: {
    id: string;
    topic: string;
  };
  parentTopic?: string;
  relationshipType?: 'PREREQUISITE' | 'RELATED' | 'SUBTOPIC';
}

const RELATIONSHIP_LABELS = {
  PREREQUISITE: 'Prerequisite for',
  RELATED: 'Related to',
  SUBTOPIC: 'Subtopic of',
} as const;

export function StartSessionModal({
  open,
  onClose,
  node,
  parentTopic,
  relationshipType,
}: StartSessionModalProps) {
  const router = useRouter();
  const [scope, setScope] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);

  // Fetch AI-suggested scope
  const { data: scopeData, isLoading: isLoadingScope } =
    api.knowledgeGraph.suggestScope.useQuery(
      {
        topic: node.topic,
        parentTopic,
        relationshipType,
      },
      { enabled: open }
    );

  // Update scope when AI suggestion arrives
  useEffect(() => {
    if (scopeData?.scope) {
      setScope(scopeData.scope);
    }
  }, [scopeData]);

  const handleStartLearning = () => {
    setIsNavigating(true);
    // Navigate to explain page with pre-filled topic and scope
    const params = new URLSearchParams();
    params.set('topic', node.topic);
    if (scope) params.set('scope', scope);
    params.set('fromGraph', 'true');

    router.push(`/explain?${params.toString()}`);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="border-white/10 bg-slate-900 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span>{node.topic}</span>
          </DialogTitle>
          {parentTopic && relationshipType && (
            <DialogDescription className="flex items-center gap-2 pt-2 text-slate-400">
              <LinkIcon className="h-3.5 w-3.5" />
              <span>
                {RELATIONSHIP_LABELS[relationshipType]}{' '}
                <span className="font-medium text-violet-400">{parentTopic}</span>
              </span>
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* AI Scope Suggestion */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-white/80">
              <Sparkles className="h-4 w-4 text-amber-400" />
              Study Scope
            </label>
            {isLoadingScope ? (
              <div className="flex h-24 items-center justify-center rounded-lg border border-white/10 bg-slate-800/50">
                <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
                <span className="ml-2 text-sm text-slate-400">
                  AI is generating a scope...
                </span>
              </div>
            ) : (
              <Textarea
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="What will you focus on learning?"
                className="min-h-[80px] resize-none border-white/10 bg-slate-800/50 text-white placeholder:text-slate-500"
              />
            )}
          </div>

          {/* Learning Objectives (if available) */}
          {scopeData?.learningObjectives && scopeData.learningObjectives.length > 0 && (
            <div className="rounded-lg border border-white/5 bg-slate-800/30 p-3">
              <p className="mb-2 text-xs font-medium text-white/60">You will learn to:</p>
              <ul className="space-y-1">
                {scopeData.learningObjectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-violet-400" />
                    {obj}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:bg-white/5 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleStartLearning}
            disabled={isLoadingScope || isNavigating}
            className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
          >
            {isNavigating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                Start Learning
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
