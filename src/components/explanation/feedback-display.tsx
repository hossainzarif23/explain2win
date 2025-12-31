'use client';

import { CheckCircle2, Lightbulb, XCircle, ListChecks } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FeedbackDisplayProps {
  strengths?: string[];
  improvements?: string[];
  missingConcepts?: string[];
  learningObjectives?: string[];
}

export function FeedbackDisplay({
  strengths = [],
  improvements = [],
  missingConcepts = [],
  learningObjectives = [],
}: FeedbackDisplayProps) {
  return (
    <div className="space-y-4">
      {/* Strengths & Improvements */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            {strengths.length > 0 ? (
              <ul className="space-y-2">
                {strengths.map((strength, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No strengths identified yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Lightbulb className="h-5 w-5" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {improvements.length > 0 ? (
              <ul className="space-y-2">
                {improvements.map((improvement, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No improvements suggested.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Missing Concepts & Learning Objectives */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <XCircle className="h-5 w-5" />
              Missing Concepts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {missingConcepts.length > 0 ? (
              <ul className="space-y-2">
                {missingConcepts.map((concept, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <span>{concept}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">All key concepts covered! 🎉</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <ListChecks className="h-5 w-5" />
              Learning Objectives
            </CardTitle>
          </CardHeader>
          <CardContent>
            {learningObjectives.length > 0 ? (
              <ul className="space-y-2">
                {learningObjectives.map((objective, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No specific objectives listed.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
