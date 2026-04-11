'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { badgeStyles } from '@/lib/badge-styles';
import { Zap, Eye } from 'lucide-react';
import type { RecentTriggerRun } from '@/types/dashboard';

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function RecentTriggerTable({ triggers }: { triggers: RecentTriggerRun[] }) {
  const t = useTranslations('app');
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          {t('recentTriggerRuns')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {triggers.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('noRecentTriggers')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('workflow')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('duration')}</TableHead>
                <TableHead>{t('createdAt')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {triggers.map((tr) => (
                <TableRow key={tr.id}>
                  <TableCell>{tr.workflowName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={tr.status === 'success' ? badgeStyles.green : badgeStyles.red}>
                      {tr.status === 'success' ? t('success') : t('error')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{formatDuration(tr.durationMs)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatRelativeTime(new Date(tr.createdAt))}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => router.push(`/trigger-history/${tr.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
