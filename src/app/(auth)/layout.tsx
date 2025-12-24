import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Side: Branding/Visuals */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-indigo-900/20" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-violet-600/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl animate-pulse" />
        
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 font-bold text-2xl tracking-tighter">
            <div className="h-10 w-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <span className="text-white">E</span>
            </div>
            Explain2Win
          </Link>
        </div>

        <div className="relative z-10 max-w-md">
          <blockquote className="space-y-2">
            <p className="text-3xl font-heading font-medium leading-tight tracking-tight">
              &ldquo;Teaching others is the ultimate way to master a subject. Our AI helps you close the loop.&rdquo;
            </p>
            <footer className="text-slate-400 font-sans text-sm">
              The Feynman Technique, Augmented by Artificial Intelligence.
            </footer>
          </blockquote>
        </div>

        <div className="relative z-10 text-slate-500 text-xs">
          © 2025 Explain2Win. All rights reserved.
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="flex flex-col p-8 lg:p-12 justify-center items-center bg-white dark:bg-slate-950 relative">
        <Link 
          href="/" 
          className="absolute top-8 left-8 lg:top-12 lg:left-12 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to site
        </Link>
        <div className="w-full max-w-[400px] space-y-8">
          {children}
        </div>
      </div>
    </div>
  );
}
