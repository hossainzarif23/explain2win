'use client';

import { motion } from 'framer-motion';
import { Construction, ArrowLeft, Clock } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Restricted Route Layout
 * 
 * This layout wraps routes that are temporarily disabled for test release.
 * The actual page code is preserved but users see this "Coming Soon" screen instead.
 * 
 * To enable these routes, simply delete this layout.tsx file.
 */
export default function RestrictedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <Card className="mx-auto max-w-md border-0 shadow-2xl">
          <CardContent className="py-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg"
            >
              <Clock className="h-10 w-10" />
            </motion.div>

            <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
              Coming Soon
            </h1>
            <p className="mb-6 text-slate-500">
              This feature is under development and will be available in a future release.
            </p>

            <div className="mb-6 rounded-lg bg-violet-50 p-4 dark:bg-violet-900/20">
              <div className="flex items-center justify-center gap-2 text-sm text-violet-700 dark:text-violet-300">
                <Construction className="h-4 w-4" />
                <span>We&apos;re working hard to bring this to you!</span>
              </div>
            </div>

            <Link href="/dashboard">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
