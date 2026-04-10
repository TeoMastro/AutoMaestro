'use client';

import { createContext, useCallback, useContext, useState } from 'react';

type BreadcrumbContextValue = {
  overrides: Map<string, string>;
  setOverride: (segment: string, label: string) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  overrides: new Map(),
  setOverride: () => {},
});

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<Map<string, string>>(new Map());

  const setOverride = useCallback((segment: string, label: string) => {
    setOverrides((prev) => {
      if (prev.get(segment) === label) return prev;
      const next = new Map(prev);
      next.set(segment, label);
      return next;
    });
  }, []);

  return (
    <BreadcrumbContext.Provider value={{ overrides, setOverride }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbOverrides() {
  return useContext(BreadcrumbContext);
}
