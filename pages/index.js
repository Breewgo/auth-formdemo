import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { ActivityIndicator, Text, View } from "react-native";
import { isConfigured } from "../lib/supabase";
import { homePathFor, useSession } from "../lib/useSession";

// Entry point: send the user to login or to their role's home page.
export default function Index() {
  const router = useRouter();
  const { loading, session, profile } = useSession();

  useEffect(() => {
    if (!isConfigured || loading) return;
    router.replace(session && profile ? homePathFor(profile) : "/login");
  }, [loading, session, profile, router]);

  if (!isConfigured) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Text style={{ fontSize: 16, textAlign: "center" }}>
          Supabase isn't configured. Copy .env.example to .env.local, fill in your project URL and
          anon key, then restart the dev server.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator />
    </View>
  );
}
