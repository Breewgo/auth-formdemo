import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ActivityIndicator } from "react-native";
import ItemTypeEditor, { newLocalId } from "../../../../components/ItemTypeEditor";
import RequireRole from "../../../../components/RequireRole";
import { ErrorText, Screen } from "../../../../components/ui";
import { toBuilderField } from "../../../../lib/itemTypes";
import { supabase } from "../../../../lib/supabase";

// Loads an existing item type and opens it in the same editor used for new types.
function EditItemType({ typeId, profile }) {
  const [initial, setInitial] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("item_types")
      .select("id, name, child_type_id, field_definitions(id, key, label, field_type, options, required, is_public, sort_order)")
      .eq("id", typeId)
      .single()
      .then(({ data, error: e }) => {
        if (e) {
          setError(e.message);
          return;
        }
        const fields = [...data.field_definitions]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((row) => toBuilderField(row, newLocalId()));
        setInitial({ id: data.id, name: data.name, child_type_id: data.child_type_id, fields });
      });
  }, [typeId]);

  if (error) {
    return (
      <Screen title="Edit Item Type">
        <ErrorText>{error}</ErrorText>
      </Screen>
    );
  }
  if (!initial) return <ActivityIndicator style={{ marginTop: 40 }} />;
  return <ItemTypeEditor profile={profile} initial={initial} />;
}

export default function EditItemTypePage() {
  const { id } = useRouter().query;
  return (
    <RequireRole role="admin">
      {({ profile }) => (id ? <EditItemType typeId={id} profile={profile} /> : <ActivityIndicator />)}
    </RequireRole>
  );
}
