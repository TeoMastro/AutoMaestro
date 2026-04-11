'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Copy, Check, RefreshCw, KeyRound } from 'lucide-react';
import { rerollWorkflowTokenAction } from '@/server-actions/workflow';

interface WorkflowTokenPanelProps {
  workflowId: string;
  initialToken: string;
}

export function WorkflowTokenPanel({ workflowId, initialToken }: WorkflowTokenPanelProps) {
  const t = useTranslations('app');
  const [token, setToken] = useState(initialToken);
  const [copied, setCopied] = useState(false);
  const [rerollError, setRerollError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleCopy() {
    navigator.clipboard.writeText(token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleReroll() {
    setRerollError(false);
    startTransition(async () => {
      const result = await rerollWorkflowTokenAction(workflowId);
      if (result.success && result.token) {
        setToken(result.token);
      } else {
        setRerollError(true);
      }
    });
  }

  return (
    <div>
      <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
        <KeyRound className="h-3 w-3" />
        {t('workflowToken')}
      </label>
      <p className="text-xs text-muted-foreground mt-0.5 mb-2">{t('workflowTokenHint')}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono break-all select-all">{token}</code>
        <Button type="button" variant="outline" size="icon" title={t('copyToken')} onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          title={t('rerollToken')}
          onClick={handleReroll}
          disabled={isPending}
        >
          <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      {rerollError && <p className="text-xs text-destructive mt-1">{t('error')}</p>}
    </div>
  );
}
