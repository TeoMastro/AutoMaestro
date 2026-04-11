'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Copy, Check, ExternalLink } from 'lucide-react';

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 w-7 p-0">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

export function N8nCredentialsCard({
  url,
  username,
  password,
}: {
  url: string | null;
  username: string | null;
  password: string | null;
}) {
  const t = useTranslations('app');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('n8nCredentials')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground">{t('n8nInstanceUrl')}</label>
          <div className="mt-1 flex items-center gap-1">
            {url ? (
              <>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  {url}
                  <ExternalLink className="h-3 w-3" />
                </a>
                <CopyButton value={url} />
              </>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">{t('n8nInstanceUsername')}</label>
          <div className="mt-1 flex items-center gap-1">
            {username ? (
              <>
                <span>{username}</span>
                <CopyButton value={username} />
              </>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">{t('n8nInstancePassword')}</label>
          <div className="mt-1 flex items-center gap-1">
            {password ? (
              <>
                <span className="font-mono text-sm">{showPassword ? password : '\u2022'.repeat(12)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
                <CopyButton value={password} />
              </>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
