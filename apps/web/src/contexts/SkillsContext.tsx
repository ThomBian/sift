import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { db } from "../lib/db";
import type { PromptTemplate } from "@sift/shared";

interface SkillsContextValue {
  skills: PromptTemplate[];
  refetch: () => void;
}

const SkillsContext = createContext<SkillsContextValue>({
  skills: [],
  refetch: () => {},
});

export function SkillsProvider({ children }: { children: ReactNode }) {
  const [skills, setSkills] = useState<PromptTemplate[]>([]);

  const fetch = useCallback(async () => {
    const rows = await db.promptTemplates.orderBy("createdAt").toArray();
    setSkills(rows);
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return (
    <SkillsContext.Provider value={{ skills, refetch: fetch }}>
      {children}
    </SkillsContext.Provider>
  );
}

export function useSkills(): SkillsContextValue {
  return useContext(SkillsContext);
}
