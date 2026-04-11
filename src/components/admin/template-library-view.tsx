'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, Copy, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TemplateLibraryViewProps } from '@/types/template-library';

export function TemplateLibraryView({ item, isAdmin }: TemplateLibraryViewProps) {
  const t = useTranslations('app');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(item.workflowJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/manage/templates">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{item.title}</h1>
        </div>
        {isAdmin && (
          <Button variant="outline" asChild>
            <Link href={`/manage/templates/${item.id}/update`}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('templateDescription')}</CardTitle>
        </CardHeader>
        <CardContent>
          {item.description ? (
            <p className="whitespace-pre-wrap wrap-break-word">{item.description}</p>
          ) : (
            <p className="text-muted-foreground">{t('noDescriptionProvided')}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('templateSetupGuide')}</CardTitle>
        </CardHeader>
        <CardContent>
          {item.setupGuide ? (
            <article className="prose max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.setupGuide}</ReactMarkdown>
            </article>
          ) : (
            <p className="text-muted-foreground">{t('noSetupGuideProvided')}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{t('workflowJson')}</CardTitle>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
            <span>{copied ? t('copiedToClipboard') : t('copyToClipboard')}</span>
          </Button>
        </CardHeader>
        <CardContent>
          <pre className="max-h-128 overflow-auto rounded-md border bg-muted p-4 text-xs leading-relaxed">
            <code>{item.workflowJson}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
