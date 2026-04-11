import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

/** Safely parse potentially double-stringified JSON */
export function safeParse(data: unknown): unknown {
  if (typeof data !== 'string') return data;
  try {
    const parsed = JSON.parse(data);
    return typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
  } catch {
    return data;
  }
}

interface DynamicResponseProps {
  data: unknown;
  emptyMessage?: string;
}

export function DynamicResponse({ data, emptyMessage }: DynamicResponseProps) {
  if (data === null || data === undefined) {
    if (emptyMessage) {
      return (
        <div className="p-8 h-full flex items-center justify-center text-muted-foreground text-sm italic">
          {emptyMessage}
        </div>
      );
    }
    return null;
  }

  // Plain objects → labeled textareas per key
  if (typeof data === 'object' && !Array.isArray(data)) {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) {
      if (emptyMessage) {
        return (
          <div className="p-8 h-full flex items-center justify-center text-muted-foreground text-sm italic">
            {emptyMessage}
          </div>
        );
      }
      return null;
    }

    return (
      <div className="p-4 space-y-4">
        {entries.map(([key, value]) => (
          <div key={key} className="space-y-1.5 flex flex-col">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{key}</Label>
            <Textarea
              readOnly
              value={typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
              className="resize-none min-h-[60px] max-h-[400px] overflow-y-auto bg-background/50 font-mono text-sm leading-relaxed"
            />
          </div>
        ))}
      </div>
    );
  }

  // Arrays / primitives → formatted JSON pre block
  const formatted = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);

  return (
    <div className="p-4">
      <pre className="text-sm font-mono text-muted-foreground whitespace-pre-wrap overflow-x-auto">{formatted}</pre>
    </div>
  );
}
