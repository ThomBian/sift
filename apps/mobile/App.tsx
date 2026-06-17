import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
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

function AppContent() {
  const { user, loading, signInWithMagicLink, signInWithGoogle, signOut } = useAuth();
  const syncStatus = useSync(user);
  const [tasks, setTasks] = useState<MobileTask[]>([]);
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  async function reloadTasks() {
    const all = await getTasks();
    all.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    setTasks(all);
  }

  useEffect(() => {
    void reloadTasks();
  }, [syncStatus, user]);

  async function onCreateTask() {
    if (!title.trim()) return;
    const task = newInboxTask(title);
    await upsertTask(task);
    setTitle("");
    await reloadTasks();
    requestSync();
  }

  async function onToggleTask(taskId: string) {
    await toggleTaskDone(taskId);
    await reloadTasks();
    requestSync();
  }

  const syncText = useMemo(() => {
    if (syncStatus === "syncing") return "Syncing";
    if (syncStatus === "synced") return "Synced";
    return "Local";
  }, [syncStatus]);

  if (!isSupabaseConfigured) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.title}>Missing Supabase config</Text>
        <Text style={styles.muted}>
          Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
        </Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.rootCentered}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading session...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.muted}>Authenticated users only.</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@company.com"
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
          style={styles.button}
        >
          <Text style={styles.buttonText}>Send magic link</Text>
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
          style={styles.googleButton}
        >
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </Pressable>
        {authMessage ? <Text style={styles.muted}>{authMessage}</Text> : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="auto" />
      <View style={styles.row}>
        <Text style={styles.title}>Inbox</Text>
        <Text style={styles.muted}>{syncText}</Text>
      </View>
      <View style={styles.row}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Create inbox task"
          style={[styles.input, styles.grow]}
        />
        <Pressable style={styles.button} onPress={() => void onCreateTask()}>
          <Text style={styles.buttonText}>Add</Text>
        </Pressable>
      </View>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.task} onPress={() => void onToggleTask(item.id)}>
            <Text style={styles.checkbox}>{item.status === "done" ? "x" : " "}</Text>
            <Text style={item.status === "done" ? styles.taskDone : styles.taskTitle}>
              {item.title}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.muted}>No tasks yet.</Text>}
      />
      <Pressable onPress={() => void signOut()} style={styles.signOut}>
        <Text style={styles.muted}>Sign out</Text>
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    gap: 12,
  },
  rootCentered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  grow: { flex: 1 },
  title: { fontSize: 22, fontWeight: "700" },
  muted: { color: "#666" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    backgroundColor: "#111",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#eee" },
  googleButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  googleButtonText: { color: "#111", fontWeight: "600" },
  task: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: "#444",
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 12,
  },
  taskTitle: { fontSize: 16, color: "#111" },
  taskDone: { fontSize: 16, color: "#777", textDecorationLine: "line-through" },
  signOut: { alignItems: "center", paddingVertical: 10 },
});
