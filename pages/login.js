import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Text } from "react-native";
import { isConfigured, supabase } from "../lib/supabase";
import { homePathFor, useSession } from "../lib/useSession";
import { Button, Card, ErrorText, Input, Label, Screen, styles } from "../components/ui";

// Screens 1 & 7: one login for employees and managers; role decides where they land.
export default function Login() {
  const router = useRouter();
  const { loading, session, profile } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Already signed in (including offline with a saved session) → skip the form.
  useEffect(() => {
    if (!loading && session && profile) router.replace(homePathFor(profile));
  }, [loading, session, profile, router]);

  async function handleLogin() {
    setError("");
    if (!isConfigured) {
      setError("Supabase isn't configured — see .env.example.");
      return;
    }
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setError("You're offline. Connect once to log in; after that you'll stay signed in offline.");
      return;
    }
    setSubmitting(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSubmitting(false);
    if (authError) setError(authError.message);
    // On success, useSession picks up the new session and the effect above redirects.
  }

  return (
    <Screen title="Traceability Login">
      <Card>
        <Label>Email</Label>
        <Input
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@farm.com"
        />
        <Label>Password</Label>
        <Input
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          onSubmitEditing={handleLogin}
        />
        <ErrorText>
          {error ||
            (!loading && session && !profile
              ? "Signed in, but this account has no profile yet. Ask an admin to add it (see supabase/seed.sql)."
              : "")}
        </ErrorText>
        <Button
          title={submitting ? "Logging in…" : "Login"}
          onPress={handleLogin}
          disabled={submitting}
          style={{ marginTop: 16 }}
        />
      </Card>
      <Text style={styles.muted}>Accounts are created by your manager.</Text>
    </Screen>
  );
}
