import React, { createContext, useContext, useState, ReactNode } from 'react';

interface GroupContextType {
  selectedGroupId: string | null;
  setSelectedGroupId: (groupId: string | null) => void;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

interface GroupProviderProps {
  children: ReactNode;
}

// 선택된 그룹 상태 관리 Context
export const GroupProvider = ({ children }: GroupProviderProps) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  return (
    <GroupContext.Provider value={{ selectedGroupId, setSelectedGroupId }}>
      {children}
    </GroupContext.Provider>
  );
};

export const useGroup = () => {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error('useGroup must be used within a GroupProvider');
  }
  return context;
};
