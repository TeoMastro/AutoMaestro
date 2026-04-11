'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HelpCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function N8nConnectionGuideDialog() {
  const t = useTranslations('app');

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-amber-500 hover:bg-amber-600 text-white hover:text-white border-amber-500"
        >
          <HelpCircle className="h-4 w-4" />
          <span className="hidden md:block">{t('n8nConnectionGuide')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{t('n8nConnectionGuideTitle')}</DialogTitle>
          <DialogDescription>{t('n8nConnectionGuideDescription')}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 text-sm">
            <section>
              <h3 className="font-semibold text-base mb-3">{t('n8nTriggerWorkflows')}</h3>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1">{t('n8nWebhookAuthentication')}</h4>
                  <p className="text-muted-foreground">{t('n8nTriggerAuthDescription')}</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                    <li>
                      {t('n8nAuthType')}: <code className="bg-muted px-1 py-0.5 rounded text-xs">Header Auth</code>
                    </li>
                    <li>
                      {t('n8nHeaderName')}: <code className="bg-muted px-1 py-0.5 rounded text-xs">Authorization</code>
                    </li>
                    <li>
                      {t('n8nHeaderValue')}: {t('n8nTriggerTokenValue')}
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-1">{t('n8nSetFieldsNode')}</h4>
                  <p className="text-muted-foreground">{t('n8nSetFieldsDescription')}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-1">{t('n8nRespondNode')}</h4>
                  <p className="text-muted-foreground">{t('n8nRespondDescription')}</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                    <li>{t('n8nRespondPurpose')}</li>
                    <li>
                      {t('n8nRespondType')}:{' '}
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">Respond to Webhook</code>
                    </li>
                    <li>
                      {t('n8nRespondMode')}: <code className="bg-muted px-1 py-0.5 rounded text-xs">JSON</code>
                    </li>
                    <li>
                      {t('n8nRespondCode')}: <code className="bg-muted px-1 py-0.5 rounded text-xs">200</code>
                    </li>
                    <li className="text-amber-600 dark:text-amber-500">{t('n8nRespondTimeoutWarning')}</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-3">{t('n8nChatWorkflows')}</h3>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1">{t('n8nWebhookAuthentication')}</h4>
                  <p className="text-muted-foreground">{t('n8nChatAuthDescription')}</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                    <li>
                      {t('n8nAuthType')}: <code className="bg-muted px-1 py-0.5 rounded text-xs">Bearer Token</code>
                    </li>
                    <li>
                      {t('n8nBearerToken')}: {t('n8nChatTokenValue')}
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
