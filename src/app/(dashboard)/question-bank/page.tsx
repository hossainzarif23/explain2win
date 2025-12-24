'use client';

import Link from 'next/link';
import { Brain, Search, Play, Trash2, BookOpen } from 'lucide-react';
import { useState } from 'react';

import { api } from '@/trpc/react';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function QuestionBankPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: bank, isLoading, refetch } = api.question.getBank.useQuery();
  const deleteMutation = api.question.delete.useMutation({
    onSuccess: () => {
      toast.success('Question removed from bank');
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const filteredBank = bank?.filter((item) =>
    item.topic.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <QuestionBankSkeleton />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Question Bank
          </h2>
          <p className="text-muted-foreground mt-1">
            Review and re-title questions from your previous explanations.
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search topics..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-6">
        {filteredBank?.length === 0 ? (
          <Card className="flex flex-col items-center justify-center border-dashed p-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <Brain className="h-6 w-6 text-slate-400" />
            </div>
            <CardTitle>No questions found</CardTitle>
            <CardDescription className="mt-2 max-w-sm">
              Start by explaining a topic to generate your first set of AI questions.
            </CardDescription>
            <Link href="/explain" className="mt-6">
              <Button>Start Explaining</Button>
            </Link>
          </Card>
        ) : (
          <Accordion type="single" collapsible className="w-full space-y-4 border-none">
            {filteredBank?.map((item) => (
              <AccordionItem
                key={item.id}
                value={item.id}
                className="overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-slate-950"
              >
                <AccordionTrigger className="px-6 hover:bg-slate-50 hover:no-underline dark:hover:bg-slate-900/50">
                  <div className="flex items-center gap-4 text-left">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                      <BookOpen className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {item.topic}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.questionCount} Questions •{' '}
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="border-t px-6 py-4">
                  <div className="space-y-6">
                    <div className="grid gap-4">
                      {item.questions.map((q) => (
                        <div
                          key={q.id}
                          className="group relative rounded-lg border border-transparent bg-slate-50 p-4 transition-all hover:border-slate-200 dark:bg-slate-900 dark:hover:border-slate-800"
                        >
                          <div className="flex justify-between gap-4">
                            <div className="space-y-2">
                              <p className="pr-8 font-medium">{q.questionText}</p>
                              <div className="flex items-center gap-3">
                                <span className="rounded bg-violet-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-violet-500 uppercase dark:bg-violet-900/30">
                                  {q.difficulty}
                                </span>
                                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:bg-slate-800">
                                  {q.questionType.replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
                              onClick={() => deleteMutation.mutate({ id: q.id })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end pt-2">
                      <Link href={`/explain`}>
                        {' '}
                        {/* Could also lead to a specific 'requiz' session generation */}
                        <Button size="sm" className="gap-2">
                          <Play className="h-4 w-4 fill-current" />
                          Start Revision Session
                        </Button>
                      </Link>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}

function QuestionBankSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="space-y-2">
          <Skeleton className="h-9 w-50" />
          <Skeleton className="h-4 w-50" />
        </div>
        <Skeleton className="h-10 w-full md:w-72" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
