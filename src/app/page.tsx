import Link from 'next/link';
import { Mic, Brain, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { APP_NAME } from '@/lib/constants';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="text-primary flex items-center gap-2 text-xl font-bold">
            <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg">
              <Mic className="h-5 w-5" />
            </div>
            {APP_NAME}
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Log In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="space-y-6 pt-6 pb-8 md:pt-10 md:pb-12 lg:py-32">
          <div className="container flex max-w-5xl flex-col items-center gap-4 text-center">

            <h1 className="font-heading text-3xl font-bold sm:text-5xl md:text-6xl lg:text-7xl">
              Learn by teaching.
              <br />
              <span className="bg-linear-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                Explain to Win.
              </span>
            </h1>
            <p className="text-muted-foreground max-w-2xl leading-normal sm:text-xl sm:leading-8">
              Explain topics by voice, get AI-generated quizzes, and master any subject through the
              Feynman Technique.
            </p>
            <div className="space-x-4">
              <Link href="/register">
                <Button size="lg" className="h-12 px-8 text-lg">
                  Start Explaining
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="h-12 px-8 text-lg">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="container space-y-6 bg-slate-50 py-8 md:py-12 lg:py-24 dark:bg-transparent"
        >
          <div className="mx-auto flex max-w-232 flex-col items-center space-y-4 text-center">
            <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
              Features
            </h2>
            <p className="text-muted-foreground max-w-[85%] leading-normal sm:text-lg sm:leading-7">
              Everything you need to master difficult topics through active recall and teaching.
            </p>
          </div>
          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-5xl md:grid-cols-3">
            <Card className="flex flex-col items-center p-4 text-center">
              <div className="mb-4 rounded-full bg-violet-100 p-4 dark:bg-violet-900/20">
                <Mic className="h-8 w-8 text-violet-600 dark:text-violet-400" />
              </div>
              <CardHeader>
                <CardTitle className="text-xl">Voice Explanations</CardTitle>
                <CardDescription>
                  Don&apos;t just read. Speak. Explain concepts out loud and our AI listens and
                  understands.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="flex flex-col items-center p-4 text-center">
              <div className="mb-4 rounded-full bg-indigo-100 p-4 dark:bg-indigo-900/20">
                <Brain className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <CardHeader>
                <CardTitle className="text-xl">AI-Generated Quizzes</CardTitle>
                <CardDescription>
                  Get personalized questions based specifically on what you said (and didn&apos;t
                  say).
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="flex flex-col items-center p-4 text-center">
              <div className="mb-4 rounded-full bg-emerald-100 p-4 dark:bg-emerald-900/20">
                <Trophy className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardHeader>
                <CardTitle className="text-xl">Progress Tracking</CardTitle>
                <CardDescription>
                  Track mastery over time. Watch your confidence and retention soar.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
