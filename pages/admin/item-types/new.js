import React from "react";
import ItemTypeEditor from "../../../components/ItemTypeEditor";
import RequireRole from "../../../components/RequireRole";

export default function NewItemTypePage() {
  return (
    <RequireRole role="admin">
      {({ profile }) => <ItemTypeEditor profile={profile} />}
    </RequireRole>
  );
}
