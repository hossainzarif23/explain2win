'use client';

import { Check, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PricingCardProps {
  title: string;
  price: string;
  description: string;
  features: string[];
  isPopular?: boolean;
  buttonText?: string;
  onSubscribe: () => void;
  isLoading?: boolean;
}

export function PricingCard({
  title,
  price,
  description,
  features,
  isPopular,
  buttonText = 'Subscribe Now',
  onSubscribe,
  isLoading,
}: PricingCardProps) {
  return (
    <Card className={cn(
      'relative flex flex-col',
      isPopular && 'border-violet-500 shadow-lg shadow-violet-500/10'
    )}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
          <Zap className="h-3 w-3 fill-current" />
          Most Popular
        </div>
      )}
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex items-baseline gap-1 mb-6">
          <span className="text-4xl font-bold font-heading">{price}</span>
          <span className="text-muted-foreground text-sm">/month</span>
        </div>
        <ul className="space-y-3">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Check className="h-4 w-4 text-green-500 shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          variant={isPopular ? 'default' : 'outline'}
          onClick={onSubscribe}
          disabled={isLoading}
        >
          {buttonText}
        </Button>
      </CardFooter>
    </Card>
  );
}
