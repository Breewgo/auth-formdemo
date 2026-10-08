import { useEffect } from "react";
import { useRouter } from "next/router";
import { ActivityIndicator, View } from "react-native";
import { homePathFor, useSession } from "../lib/useSession";

// Wraps a page. Sends signed-out users to /login and users with the wrong
// role to their own home page. Children can be a function receiving the session.
export default function RequireRole({ role, children }) {
  const router = useRouter();
  const { loading, session, profile } = useSession();

  const allowed = session && profile && (!role || profile.role === role);

  useEffect(() => {
    if (loading) return;
    if (!session || !profile) router.replace("/login");
    else if (!allowed) router.replace(homePathFor(profile));
  }, [loading, session, profile, allowed, router]);

  if (!allowed) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return typeof children === "function" ? children({ session, profile }) : children;
}
