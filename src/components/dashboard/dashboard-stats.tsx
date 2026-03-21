'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { MessageSquare, Zap, CheckCircle2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDashboardStats } from '@/server-actions/dashboard';
import type { DashboardStats } from '@/types/dashboard';

function getStartOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function DashboardStatsCards({
  initialStats,
}: {
  initialStats: DashboardStats;
}) {
  const t = useTranslations('app');
  const [stats, setStats] = useState(initialStats);
  const [dateFrom, setDateFrom] = useState<Date>(getStartOfMonth());
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [isPending, startTransition] = useTransition();

  function handleDateChange(newFrom: Date, newTo: Date) {
    setDateFrom(newFrom);
    setDateTo(newTo);

    startTransition(async () => {
      const fromISO = newFrom.toISOString();
      const toISO = getEndOfDay(newTo).toISOString();
      const result = await getDashboardStats(fromISO, toISO);
      setStats(result);
    });
  }

  const successRateColor =
    stats.triggerSuccessRate >= 90
      ? 'text-emerald-600 dark:text-emerald-400'
      : stats.triggerSuccessRate >= 50
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'justify-start text-left font-normal',
                !dateFrom && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(dateFrom, 'MMM d, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={(date) => {
                if (date) handleDateChange(date, dateTo);
              }}
              disabled={(date) => date > dateTo || date > new Date()}
            />
          </PopoverContent>
        </Popover>
        <span className="text-muted-foreground text-sm">{t('to')}</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'justify-start text-left font-normal',
                !dateTo && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(dateTo, 'MMM d, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={(date) => {
                if (date) handleDateChange(dateFrom, date);
              }}
              disabled={(date) => date < dateFrom || date > new Date()}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div
        className={cn(
          'grid grid-cols-1 sm:grid-cols-3 gap-4 transition-opacity',
          isPending && 'opacity-50'
        )}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              {t('chatSessions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.chatSessions}</div>
            <p className="text-xs text-muted-foreground">
              {t('selectedPeriod')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Zap className="h-4 w-4" />
              {t('triggerRuns')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.triggerRuns}</div>
            <p className="text-xs text-muted-foreground">
              {t('selectedPeriod')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              {t('triggerSuccessRate')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${successRateColor}`}>
              {stats.triggerSuccessRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              {t('selectedPeriod')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
