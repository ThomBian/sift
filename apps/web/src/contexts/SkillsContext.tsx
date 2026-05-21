import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
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
    if (!supabase) return;
    const { data } = await supabase
      .from("prompt_templates")
      .select("*")
      .order("created_at", { ascending: true });
    if (data) {
      setSkills(
        (data as Record<string, unknown>[]).map((row) => ({
          id: row.id as string,
          name: row.name as string,
          emoji: row.emoji as string,
          description: (row.description as string) ?? "",
          systemPrompt: (row.system_prompt as string) ?? "",
          userPromptTemplate: (row.user_prompt_template as string) ?? "",
          createdAt: row.created_at as string,
        })),
      );
    }
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
