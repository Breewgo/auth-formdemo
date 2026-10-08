import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

export const colors = {
  primary: "#9b1c31", // pomegranate
  text: "#1f1f1f",
  muted: "#6b6b6b",
  border: "#d6d6d6",
  bg: "#f7f5f2",
  card: "#ffffff",
  error: "#c62828",
  success: "#2e7d32",
};

// Page body. _document.js disables body scrolling, so every page scrolls here.
export function Screen({ title, right, children }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      <View style={styles.inner}>
        {(title || right) && (
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            {right}
          </View>
        )}
        {children}
      </View>
    </ScrollView>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Label({ children }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Input({ style, ...props }) {
  return <TextInput placeholderTextColor={colors.muted} style={[styles.input, style]} {...props} />;
}

export function Button({ title, onPress, variant = "primary", disabled, style }) {
  const v = variant === "primary" ? styles.btnPrimary : styles.btnSecondary;
  const t = variant === "primary" ? styles.btnPrimaryText : styles.btnSecondaryText;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.btn, v, (pressed || disabled) && { opacity: 0.6 }, style]}
    >
      <Text style={t}>{title}</Text>
    </Pressable>
  );
}

// Row of pill buttons — stands in for a dropdown (works on web and native).
export function Choice({ options, value, onChange }) {
  return (
    <View style={styles.choiceRow}>
      {options.map((opt) => {
        const o = typeof opt === "string" ? { label: opt, value: opt } : opt;
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ErrorText({ children }) {
  if (!children) return null;
  return <Text style={styles.error}>{children}</Text>;
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenContent: { padding: 16, alignItems: "center" },
  inner: { width: "100%", maxWidth: 720 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "700", color: colors.text, flexShrink: 1 },
  card: { backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 4, marginTop: 10 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, backgroundColor: "#fff", color: colors.text },
  btn: { paddingVertical: 11, paddingHorizontal: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  btnSecondary: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border },
  btnSecondaryText: { color: colors.text, fontWeight: "600", fontSize: 15 },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: "#fff" },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 14 },
  chipTextSelected: { color: "#fff" },
  error: { color: colors.error, fontSize: 13, marginTop: 4 },
  muted: { color: colors.muted, fontSize: 14 },
});
