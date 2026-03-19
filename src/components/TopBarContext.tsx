import React, { createContext, useContext, useState } from 'react';

interface TopBarCtx {
  slot: React.ReactNode;
  setSlot: (node: React.ReactNode) => void;
}

const TopBarContext = createContext<TopBarCtx>({ slot: null, setSlot: () => {} });

export const TopBarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [slot, setSlot] = useState<React.ReactNode>(null);
  return (
    <TopBarContext.Provider value={{ slot, setSlot }}>
      {children}
    </TopBarContext.Provider>
  );
};

export const useTopBarSlot = () => useContext(TopBarContext).setSlot;
export const useTopBarSlotContent = () => useContext(TopBarContext).slot;
