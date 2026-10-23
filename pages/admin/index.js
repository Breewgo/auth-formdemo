import React from "react";
import { useRouter } from "next/router";
import { Text } from "react-native";
import RequireRole from "../../components/RequireRole";
import { Button, Card, Screen, styles } from "../../components/ui";
import { signOut } from "../../lib/useSession";

// Screen 8: management home.
export default function AdminHome() {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <RequireRole role="admin">
      {({ profile }) => (
        <Screen
          title="Management"
          right={<Button title="Sign out" variant="secondary" onPress={handleSignOut} />}
        >
          <Text style={[styles.muted, { marginBottom: 12 }]}>
            Signed in as {profile.full_name || "admin"}
          </Text>
          <Card>
            <Text style={{ fontSize: 17, fontWeight: "600", marginBottom: 4 }}>Item Creation</Text>
            <Text style={[styles.muted, { marginBottom: 12 }]}>
              Define item types (Field, Bin, Truck…) and the fields employees fill in.
            </Text>
            <Button title="Manage item types" onPress={() => router.push("/admin/item-types")} />
          </Card>
          <Card>
            <Text style={{ fontSize: 17, fontWeight: "600", marginBottom: 4 }}>Scan a QR code</Text>
            <Text style={[styles.muted, { marginBottom: 12 }]}>
              Point the camera at an item's QR label to see what it is and its details.
            </Text>
            <Button title="Open scanner" onPress={() => router.push("/scan")} />
          </Card>
          <Card>
            <Text style={{ fontSize: 17, fontWeight: "600", marginBottom: 4 }}>Preview forms</Text>
            <Text style={[styles.muted, { marginBottom: 12 }]}>
              See the form an employee gets for each item type.
            </Text>
            <Button title="Open form demo" variant="secondary" onPress={() => router.push("/form-demo")} />
          </Card>
        </Screen>
      )}
    </RequireRole>
  );
}
