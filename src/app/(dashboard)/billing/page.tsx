'use client';

import { Zap, History } from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@/trpc/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PricingCard } from '@/components/billing/pricing-card';

export default function BillingPage() {
  const { data: credits } = api.user.getCredits?.useQuery() || {
    data: { balance: 50 },
    isLoading: false,
  };
  api.user.getProfile.useQuery();

  const createCheckoutMutation = api.billing.createCheckoutSession.useMutation({
    onSuccess: ({ url }) => {
      if (url) window.location.href = url;
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubscribe = (tier: 'PRO' | 'PREMIUM') => {
    createCheckoutMutation.mutate({ tier });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Billing & Credits
        </h2>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and track your credit usage.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 fill-current text-yellow-500" />
              Current Balance
            </CardTitle>
            <CardDescription>
              Your credits are used for audio transcription and AI quiz generation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="font-heading text-4xl font-bold">{credits?.balance || 0}</p>
                <p className="text-sm text-slate-500">Credits available</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <History className="h-4 w-4" /> Usage History
              </Button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>Usage this month</span>
                <span>65%</span>
              </div>
              <Progress value={65} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-linear-to-br from-slate-900 to-slate-800 text-white shadow-xl">
          <CardHeader>
            <CardTitle className="text-white">Active Plan</CardTitle>
            <CardDescription className="text-slate-400">Manage your subscription</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="w-fit rounded-full bg-violet-600 px-3 py-1 text-[10px] font-bold tracking-widest uppercase">
              Free Plan
            </div>
            <p className="text-sm text-slate-300">
              Your free plan includes 50 credits per month. Upgrade for more student types and
              unlimited questions.
            </p>
            <Button
              variant="secondary"
              className="w-full border-none bg-white text-slate-900 hover:bg-slate-100"
            >
              Manage Billing
            </Button>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="font-heading mb-6 text-xl font-bold">Upgrade Your Learning</h3>
        <div className="grid gap-6 md:grid-cols-3">
          <PricingCard
            title="Free"
            price="$0"
            description="Perfect for casual learners"
            features={[
              '50 Credits/mo',
              '~10 Explanations',
              'Curious Persona only',
              '7-day History',
            ]}
            onSubscribe={() => {}}
            buttonText="Current Plan"
            isLoading={false}
          />
          <PricingCard
            title="Pro"
            price="$9"
            isPopular
            description="For dedicated students"
            features={[
              '500 Credits/mo',
              '~100 Explanations',
              'All 4 Student Personas',
              '30-day History',
              'Advanced Analytics',
            ]}
            onSubscribe={() => handleSubscribe('PRO')}
            isLoading={createCheckoutMutation.isPending}
          />
          <PricingCard
            title="Premium"
            price="$19"
            description="Unlimited mastery"
            features={[
              'Unlimited Credits',
              'Unlimited Explanations',
              'All Personas',
              'Lifetime History',
              'Priority AI Processing',
              'Direct Support',
            ]}
            onSubscribe={() => handleSubscribe('PREMIUM')}
            isLoading={createCheckoutMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}
