import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

type HealthState =
  | { kind: "loading" }
  | { kind: "ok"; status: string }
  | { kind: "error"; message: string };

export default function Home() {
  const [state, setState] = useState<HealthState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/health`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setState({ kind: "ok", status: data.status });
      })
      .catch((err) => {
        if (!cancelled) setState({ kind: "error", message: String(err.message ?? err) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CaePe</Text>
      <Text style={styles.subtitle}>API: {API_URL}</Text>
      {state.kind === "loading" && <ActivityIndicator />}
      {state.kind === "ok" && <Text style={styles.ok}>health: {state.status}</Text>}
      {state.kind === "error" && <Text style={styles.err}>error: {state.message}</Text>}
      <Text style={styles.meta}>Expo {Constants.expoConfig?.version ?? ""}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 14, opacity: 0.7 },
  ok: { fontSize: 18, color: "#0a7d2c", fontWeight: "600" },
  err: { fontSize: 14, color: "#c62828" },
  meta: { fontSize: 12, opacity: 0.5, marginTop: 16 },
});
