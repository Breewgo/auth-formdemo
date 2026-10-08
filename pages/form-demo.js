import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ActivityIndicator, Text, View } from "react-native";
import DynamicForm from "../components/DynamicForm";
import RequireRole from "../components/RequireRole";
import { Button, Card, Choice, ErrorText, Label, Screen, colors, styles } from "../components/ui";
import { supabase } from "../lib/supabase";
import { signOut } from "../lib/useSession";

// Employee home for now: pick an item type → generated form → saved to items.
// Later, Arnav's scan flow renders <DynamicForm> after a scan instead.
function FormDemo({ session, profile }) {
  const router = useRouter();
  const [types, setTypes] = useState(null);
  const [typeId, setTypeId] = useState(null);
  const [error, setError] = useState("");
  const [lastSaved, setLastSaved] = useState(null);

  useEffect(() => {
    supabase.from("item_types").select("id, name").order("name").then(({ data, error: e }) => {
      if (e) setError(e.message);
      else setTypes(data);
    });
  }, []);

  async function save(payload) {
    const { error: e } = await supabase.from("items").insert(payload);
    if (e) throw e;
    setLastSaved(payload);
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  const selected = types?.find((t) => t.id === typeId);

  return (
    <Screen
      title="Register Item"
      right={
        <View style={{ flexDirection: "row", gap: 8 }}>
          {profile.role === "admin" && (
            <Button title="Admin" variant="secondary" onPress={() => router.push("/admin")} />
          )}
          <Button title="Sign out" variant="secondary" onPress={handleSignOut} />
        </View>
      }
    >
      <Card>
        <Label>Item type</Label>
        <ErrorText>{error}</ErrorText>
        {!types && !error && <ActivityIndicator />}
        {types && (
          <Choice
            options={types.map((t) => ({ label: t.name, value: t.id }))}
            value={typeId}
            onChange={(id) => {
              setTypeId(id);
              setLastSaved(null);
            }}
          />
        )}
      </Card>

      {selected && (
        <Card>
          <Text style={{ fontSize: 18, fontWeight: "600" }}>New {selected.name}</Text>
          <DynamicForm
            itemTypeId={selected.id}
            userId={session.user.id}
            companyId={profile.company_id}
            onSubmit={save}
          />
        </Card>
      )}

      {lastSaved && (
        <Card style={{ borderColor: colors.success }}>
          <Text style={{ color: colors.success, fontWeight: "600" }}>Saved {selected?.name}</Text>
          <Text style={[styles.muted, { fontFamily: "monospace", fontSize: 12, marginTop: 6 }]}>
            {JSON.stringify(lastSaved.data, null, 2)}
          </Text>
        </Card>
      )}
    </Screen>
  );
}

export default function FormDemoPage() {
  return <RequireRole>{(ctx) => <FormDemo {...ctx} />}</RequireRole>;
}
