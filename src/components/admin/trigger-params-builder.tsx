'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WorkflowParam } from '@/types/workflow';

type TriggerParamsBuilderProps = {
  initialParams: WorkflowParam[];
  hasError: boolean;
  errorMessage: string | null;
};

const PARAM_TYPES = ['text', 'textarea', 'select', 'number', 'boolean'] as const;

function createEmptyParam(): WorkflowParam {
  return { key: '', label: '', type: 'text', required: false };
}

function labelToKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function TriggerParamsBuilder({ initialParams, hasError, errorMessage }: TriggerParamsBuilderProps) {
  const t = useTranslations('app');
  const [params, setParams] = useState<WorkflowParam[]>(initialParams);

  const updateParam = (index: number, updates: Partial<WorkflowParam>) => {
    setParams((prev) =>
      prev.map((p, i) => {
        if (i !== index) return p;
        const updated = { ...p, ...updates };
        // Clear options when switching away from select
        if (updates.type && updates.type !== 'select') {
          delete updated.options;
        }
        // Auto-generate key from label when key is empty
        if (updates.label !== undefined && !p.key) {
          updated.key = labelToKey(updates.label);
        }
        return updated;
      })
    );
  };

  const addParam = () => setParams((prev) => [...prev, createEmptyParam()]);

  const removeParam = (index: number) => setParams((prev) => prev.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      <Label>{t('workflowParams')}</Label>
      <p className="text-sm text-muted-foreground">{t('workflowParamsHint')}</p>

      {params.map((param, index) => (
        <div key={index} className={`rounded-lg border p-4 space-y-3${hasError ? ' border-red-500' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('paramNumber', { number: index + 1 })}</span>
            <Button type="button" variant="destructive" size="sm" onClick={() => removeParam(index)}>
              <Trash2 className="h-4 w-4 mr-1" />
              {t('removeParam')}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t('paramKey')}</Label>
              <Input
                value={param.key}
                onChange={(e) => updateParam(index, { key: e.target.value })}
                placeholder="e.g. language"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('paramLabel')}</Label>
              <Input
                value={param.label}
                onChange={(e) => updateParam(index, { label: e.target.value })}
                placeholder="e.g. Language"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">{t('paramType')}</Label>
              <Select
                value={param.type}
                onValueChange={(val) => updateParam(index, { type: val as WorkflowParam['type'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PARAM_TYPES.map((pt) => (
                    <SelectItem key={pt} value={pt}>
                      {t(`paramType${pt.charAt(0).toUpperCase() + pt.slice(1)}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('paramDefault')}</Label>
              <Input
                value={param.default ?? ''}
                onChange={(e) =>
                  updateParam(index, {
                    default: e.target.value || undefined,
                  })
                }
                placeholder={t('paramDefault')}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id={`param-required-${index}`}
              checked={param.required}
              onChange={(e) => updateParam(index, { required: e.target.checked })}
              className="h-4 w-4"
            />
            <Label htmlFor={`param-required-${index}`} className="text-xs">
              {t('paramRequired')}
            </Label>
          </div>

          {param.type === 'select' && (
            <div className="space-y-1">
              <Label className="text-xs">{t('paramOptions')}</Label>
              <Input
                value={param.options?.join(', ') ?? ''}
                onChange={(e) =>
                  updateParam(index, {
                    options: e.target.value ? e.target.value.split(',').map((o) => o.trim()) : [],
                  })
                }
                placeholder="option1, option2, option3"
              />
            </div>
          )}
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addParam}>
        <Plus className="h-4 w-4 mr-1" />
        {t('addParam')}
      </Button>

      {hasError && errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

      <input type="hidden" name="params_json" value={params.length > 0 ? JSON.stringify(params) : ''} />
    </div>
  );
}
