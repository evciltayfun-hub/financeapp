"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type PrivacyCtx = { hidden: boolean; toggle: () => void };
const PrivacyContext = createContext<PrivacyCtx>({ hidden: false, toggle: () => {} });

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  return (
    <PrivacyContext.Provider value={{ hidden, toggle: () => setHidden((h) => !h) }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export const usePrivacy = () => useContext(PrivacyContext);
