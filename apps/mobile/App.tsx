import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { useSync } from "./src/hooks/useSync";
import {
  getTasks,
  newInboxTask,
  toggleTaskDone,
  upsertTask,
  type MobileTask,
} from "./src/lib/taskStore";
import { isSupabaseConfigured } from "./src/lib/supabase";
import { requestSync } from "./src/lib/requestSync";

// ─── design tokens ────────────────────────────────────────────────
const C = {
  bg: "#FFFFFF",
  surface: "#FAFAFA",
  border: "#E2E2E2",
  border2: "#CCCCCC",
  text: "#111111",
  muted: "#888888",
  dim: "#BBBBBB",
  accent: "#FF4F00",
  red: "#E60000",
} as const;

// ─── date helpers ─────────────────────────────────────────────────
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const DAYS   = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

function formatSectionDate(iso: string): string {
  const clean = iso.slice(0, 10); // strip any time component from Supabase timestamps
  const [y, m, d] = clean.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${DAYS[date.getDay()]} ${d} ${MONTHS[m - 1]}`;
}

// ─── grouping ─────────────────────────────────────────────────────
type TaskSection = { key: string; label: string; data: MobileTask[] };

function sortTasks(tasks: MobileTask[]): MobileTask[] {
  return [...tasks].sort((a, b) => {
    if (a.status !== b.status) return a.status === "done" ? 1 : -1;
    if ((a.workingDate ?? "") !== (b.workingDate ?? "")) {
      if (!a.workingDate) return 1;
      if (!b.workingDate) return -1;
      return a.workingDate < b.workingDate ? -1 : 1;
    }
    return a.createdAt < b.createdAt ? -1 : 1;
  });
}

function buildSections(tasks: MobileTask[]): TaskSection[] {
  const today = todayISO();
  const byDate = new Map<string, MobileTask[]>();

  for (const t of tasks) {
    // normalize to YYYY-MM-DD regardless of what Supabase returned
    const k = t.workingDate ? t.workingDate.slice(0, 10) : "__inbox__";
    const arr = byDate.get(k) ?? [];
    arr.push(t);
    byDate.set(k, arr);
  }

  const overdueKeys: string[] = [];
  const futureKeys: string[] = [];

  for (const k of byDate.keys()) {
    if (k === "__inbox__") continue;
    if (k < today) overdueKeys.push(k);
    else if (k > today) futureKeys.push(k);
  }
  overdueKeys.sort();
  futureKeys.sort();

  const sections: TaskSection[] = [];

  const overdueTasks = sortTasks(overdueKeys.flatMap((k) => byDate.get(k)!));
  if (overdueTasks.length > 0)
    sections.push({ key: "overdue", label: "OVERDUE", data: overdueTasks });

  const todayTasks = sortTasks(byDate.get(today) ?? []);
  if (todayTasks.length > 0)
    sections.push({ key: "today", label: `TODAY · ${formatSectionDate(today)}`, data: todayTasks });

  for (const k of futureKeys) {
    const data = sortTasks(byDate.get(k)!);
    sections.push({ key: k, label: formatSectionDate(k), data });
  }

  const inboxTasks = sortTasks(byDate.get("__inbox__") ?? []);
  if (inboxTasks.length > 0)
    sections.push({ key: "inbox", label: "INBOX", data: inboxTasks });

  return sections;
}

// ─── TaskRow ──────────────────────────────────────────────────────
function TaskRow({
  task,
  today,
  onToggle,
}: {
  task: MobileTask;
  today: string;
  onToggle: () => void;
}) {
  const done = task.status === "done";
  // use != null to guard against undefined from pre-migration AsyncStorage entries
  const overdue = !done && task.workingDate != null && task.workingDate < today;
  const showDate = task.workingDate != null && task.workingDate !== today && !done;

  return (
    <Pressable style={styles.taskRow} onPress={onToggle}>
      <View style={styles.checkbox}>
        {done && <View style={styles.checkFill} />}
      </View>
      <Text style={[styles.taskTitle, done && styles.taskDone]}>
        {task.title}
      </Text>
      {showDate && task.workingDate ? (
        <Text style={[styles.dateMeta, overdue && styles.dateOverdue]}>
          {overdue ? "▲ " : ""}{formatSectionDate(task.workingDate)}
        </Text>
      ) : null}
    </Pressable>
  );
}

// ─── App ──────────────────────────────────────────────────────────
function AppContent() {
  const { user, loading, signInWithMagicLink, signInWithGoogle, signOut } = useAuth();
  const syncStatus = useSync(user);
  const [tasks, setTasks] = useState<MobileTask[]>([]);
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  async function reloadTasks() {
    setTasks(await getTasks());
  }

  useEffect(() => { void reloadTasks(); }, [syncStatus, user]);

  async function onCreateTask() {
    if (!title.trim()) return;
    await upsertTask(newInboxTask(title));
    setTitle("");
    await reloadTasks();
    requestSync();
  }

  async function onToggleTask(id: string) {
    await toggleTaskDone(id);
    await reloadTasks();
    requestSync();
  }

  const today = useMemo(todayISO, []);
  const sections = useMemo(() => buildSections(tasks), [tasks]);

  if (!isSupabaseConfigured) {
    return (
      <SafeAreaView style={styles.authRoot}>
        <Text style={styles.sectionLabel}>MISSING CONFIG</Text>
        <Text style={styles.muted}>Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.rootCentered}>
        <ActivityIndicator color={C.accent} />
        <Text style={styles.muted}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.authRoot}>
        <View style={styles.topbar}>
          <View style={styles.wordmarkRow}>
            <Text style={styles.wordmark}>Sift</Text>
            <View style={styles.accentDot} />
          </View>
        </View>
        <View style={styles.authBody}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@company.com"
            placeholderTextColor={C.dim}
            style={styles.input}
          />
          <Pressable
            onPress={() => {
              setAuthMessage(null);
              void signInWithMagicLink(email)
                .then(() => setAuthMessage("Check your email for the sign-in link."))
                .catch((err: unknown) =>
                  setAuthMessage(err instanceof Error ? err.message : "Sign-in failed"),
                );
            }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Send magic link</Text>
          </Pressable>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.muted}>or</Text>
            <View style={styles.dividerLine} />
          </View>
          <Pressable
            onPress={() => {
              setAuthMessage(null);
              void signInWithGoogle().catch((err: unknown) =>
                setAuthMessage(err instanceof Error ? err.message : "Google sign-in failed"),
              );
            }}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Continue with Google</Text>
          </Pressable>
          {authMessage ? <Text style={styles.muted}>{authMessage}</Text> : null}
        </View>
      </SafeAreaView>
    );
  }

  const syncColor = syncStatus === "syncing" ? C.accent : C.dim;
  const syncLabel = syncStatus === "syncing" ? "SYNCING" : syncStatus === "synced" ? "SYNCED" : "LOCAL";

  return (
    <SafeAreaView style={styles.mainRoot}>
      <StatusBar style="dark" />

      {/* Topbar */}
      <View style={styles.topbar}>
        <View style={styles.wordmarkRow}>
          <Text style={styles.wordmark}>Sift</Text>
          <View style={styles.accentDot} />
        </View>
        <Text style={[styles.syncLabel, { color: syncColor }]}>{syncLabel}</Text>
      </View>

      {/* Input row */}
      <View style={styles.inputRow}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="New inbox task"
          placeholderTextColor={C.dim}
          style={[styles.input, styles.inputFlex]}
          onSubmitEditing={() => void onCreateTask()}
          returnKeyType="done"
        />
        <Pressable style={styles.primaryButton} onPress={() => void onCreateTask()}>
          <Text style={styles.primaryButtonText}>Add</Text>
        </Pressable>
      </View>

      {/* Task list */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>{section.label}</Text>
            <View style={styles.sectionRule} />
          </View>
        )}
        renderItem={({ item }) => (
          <TaskRow
            task={item}
            today={today}
            onToggle={() => void onToggleTask(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.muted}>No tasks scheduled. Add one above.</Text>
          </View>
        }
        stickySectionHeadersEnabled={false}
        contentContainerStyle={sections.length === 0 ? styles.emptyFlex : undefined}
      />

      {/* Sign out */}
      <Pressable onPress={() => void signOut()} style={styles.signOut}>
        <Text style={styles.signOutText}>SIGN OUT</Text>
      </Pressable>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

// ─── styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  mainRoot: {
    flex: 1,
    backgroundColor: C.bg,
  },
  authRoot: {
    flex: 1,
    backgroundColor: C.bg,
  },
  rootCentered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.bg,
  },

  // ── topbar ──
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  wordmark: {
    fontSize: 15,
    fontWeight: "600",
    color: C.text,
    letterSpacing: -0.3,
  },
  accentDot: {
    width: 7,
    height: 7,
    backgroundColor: C.accent,
    shadowColor: C.accent,
    shadowOpacity: 0.45,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  syncLabel: {
    fontFamily: "Menlo",
    fontSize: 9,
    letterSpacing: 0.8,
  },

  // ── input row ──
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  inputFlex: { flex: 1 },
  input: {
    height: 36,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border2,
    paddingHorizontal: 12,
    fontSize: 14,
    color: C.text,
  },
  primaryButton: {
    height: 36,
    backgroundColor: C.accent,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  secondaryButton: {
    height: 36,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border2,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: C.text,
    fontSize: 13,
    fontWeight: "600",
  },

  // ── auth ──
  authBody: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
  },

  // ── section header ──
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
    gap: 10,
    backgroundColor: C.bg,
  },
  sectionLabel: {
    fontFamily: "Menlo",
    fontSize: 9,
    fontWeight: "500",
    letterSpacing: 1.2,
    color: C.muted,
  },
  sectionRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
  },

  // ── task row ──
  taskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 36,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  checkbox: {
    width: 16,
    height: 16,
    marginTop: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkFill: {
    width: 8,
    height: 8,
    backgroundColor: C.dim,
  },
  taskTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: C.text,
    letterSpacing: -0.2,
  },
  taskDone: {
    color: C.dim,
    textDecorationLine: "line-through",
    fontWeight: "400",
  },
  dateMeta: {
    fontFamily: "Menlo",
    fontSize: 9,
    color: C.muted,
    letterSpacing: 0.3,
    marginTop: 3,
    flexShrink: 0,
  },
  dateOverdue: {
    color: C.red,
  },

  // ── empty / footer ──
  emptyState: {
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  emptyFlex: {
    flexGrow: 1,
  },
  muted: {
    fontSize: 13,
    color: C.muted,
  },
  signOut: {
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  signOutText: {
    fontFamily: "Menlo",
    fontSize: 9,
    letterSpacing: 1.2,
    color: C.dim,
  },
});
