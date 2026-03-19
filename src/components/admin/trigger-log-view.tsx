'use client';

import { useTranslations } from 'next-intl';
import { ArrowLeft, Clock, Fingerprint, Mail, Settings, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { TriggerLogEntry } from '@/types/trigger-log';
import { badgeStyles } from '@/lib/badge-styles';
import { DynamicResponse, safeParse } from '@/components/workflow/dynamic-response';

interface TriggerLogViewProps {
  log: TriggerLogEntry;
}

export function TriggerLogView({ log }: TriggerLogViewProps) {
  const t = useTranslations('app');
  const router = useRouter();

  const parsedParams = safeParse(log.requestParams);
  const parsedResponse = safeParse(log.responseData);

  // Filter out internal properties from requestParams
  let filteredParams = parsedParams;
  if (typeof parsedParams === 'object' && parsedParams !== null && !Array.isArray(parsedParams)) {
    filteredParams = { ...parsedParams };
    delete (filteredParams as any).workflowId;
    delete (filteredParams as any).userId;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/trigger-history')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{t('triggerHistory')}</h1>
        </div>
      </div>

      {/* Trigger Information Card */}
      <Card>
        <CardContent className="space-y-6 p-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t('workflowName')}
                </label>
                <div className="mt-1">
                  <Badge variant="outline" className="text-base font-normal">
                    {log.workflowName}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                  <Mail className="h-4 w-4" />
                  <span>{t('executor') || 'Executed By'}</span>
                </label>
                <p className="text-lg">{log.userEmail}</p>
              </div>

              {log.executionId && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                    <Fingerprint className="h-4 w-4" />
                    <span>{t('executionId')}</span>
                  </label>
                  <p className="text-lg font-mono">#{log.executionId}</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{t('duration')}</span>
                </label>
                <p className="text-lg">{log.durationMs} ms</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t('status')}
                </label>
                <div className="mt-1">
                  <Badge variant="outline" className={`text-sm ${log.status === 'success' ? badgeStyles.green : badgeStyles.red}`}>
                    {t(log.status)}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t('createdAt')}
                </label>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Request / Response JSON payloads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-4 flex flex-col min-h-0">
              <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                <Settings className="h-4 w-4 text-primary" />
                <span>{t('requestData')}</span>
              </label>
              <div className="flex-1 bg-muted/30 border border-border rounded-md overflow-hidden min-h-[150px]">
                {(typeof filteredParams === 'object' && filteredParams !== null ? Object.keys(filteredParams).length > 0 : !!filteredParams) ? (
                  <DynamicResponse data={filteredParams} />
                ) : (
                  <DynamicResponse data={null} emptyMessage={t('noRequestParams') || 'No additional request parameters sent.'} />
                )}
              </div>
            </div>

            <div className="space-y-4 flex flex-col min-h-0">
              <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                <Activity className="h-4 w-4 text-emerald-500" />
                <span>{t('responseData')}</span>
              </label>
              <div className="flex-1 bg-muted/30 border border-border rounded-md overflow-hidden min-h-[150px]">
                {log.errorMessage ? (
                  <div className="p-4 h-full text-sm font-mono text-destructive bg-destructive/10">
                    {log.errorMessage}
                  </div>
                ) : parsedResponse ? (
                  <DynamicResponse data={parsedResponse} />
                ) : (
                  <DynamicResponse data={null} emptyMessage={t('noResponseData') || 'No response data received.'} />
                )}
              </div>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
