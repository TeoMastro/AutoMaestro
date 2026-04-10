'use client';

import { useEffect } from 'react';
import { useBreadcrumbOverrides } from '@/components/layout/breadcrumb-context';

export function BreadcrumbSetter({
  segment,
  label,
}: {
  segment: string;
  label: string;
}) {
  const { setOverride } = useBreadcrumbOverrides();

  useEffect(() => {
    setOverride(segment, label);
  }, [segment, label, setOverride]);

  return null;
}
