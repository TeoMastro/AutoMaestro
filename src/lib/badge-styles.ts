/**
 * Semantic badge color system — 5 tiers from negative to positive.
 * Use with `variant="outline"` + `className={badgeStyles.green}`.
 * tw-merge in `cn()` resolves class conflicts correctly.
 */
export const badgeStyles = {
  /** ACTIVE, active workflow, CHAT, ready */
  green:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  /** ADMIN, MANAGER */
  indigo:
    'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
  /** UNVERIFIED, pending, processing */
  amber:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  /** INACTIVE, inactive workflow, error */
  red:
    'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
  /** CLIENT, TRIGGER */
  slate:
    'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-400 dark:border-zinc-500/20',
} as const;
