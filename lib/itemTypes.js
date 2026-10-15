import { parseOptions, toKey } from "./fields";
import { supabase } from "./supabase";

// Builder field (form state) → field_definitions row.
// Existing fields keep their key so items already saved under it still match.
function toRow(f, itemTypeId, sortOrder) {
  return {
    ...(f.id ? { id: f.id } : {}),
    item_type_id: itemTypeId,
    key: f.key || toKey(f.label),
    label: f.label.trim(),
    field_type: f.field_type,
    options: f.field_type === "select" ? parseOptions(f.optionsText) : [],
    required: f.required,
    is_public: f.is_public,
    sort_order: sortOrder,
  };
}

// field_definitions row → builder field (form state).
export function toBuilderField(row, localId) {
  return {
    localId,
    id: row.id,
    key: row.key,
    originalType: row.field_type,
    label: row.label,
    field_type: row.field_type,
    optionsText: (row.options || []).join(", "),
    required: row.required,
    is_public: row.is_public,
  };
}

// True if making typeId contain childTypeId would loop back to typeId
// (e.g. Truck contains Bin, and Bin is set to contain Truck).
export function wouldCreateCycle(typeId, childTypeId, types) {
  if (!typeId || !childTypeId) return false;
  const childOf = Object.fromEntries(types.map((t) => [t.id, t.child_type_id]));
  const seen = new Set();
  for (let id = childTypeId; id; id = childOf[id]) {
    if (id === typeId) return true;
    if (seen.has(id)) return false;
    seen.add(id);
  }
  return false;
}

function friendly(error) {
  if (error.code === "23505") return "An item type with that name already exists.";
  return error.message;
}

// Creates a new item type, or updates an existing one (typeId set).
// originalFieldIds = ids of the fields the type had when the editor opened;
// any that are no longer in `fields` are deleted.
export async function saveItemType({ companyId, typeId, name, childTypeId, fields, originalFieldIds = [] }) {
  const typeRow = { name: name.trim(), child_type_id: childTypeId };

  if (!typeId) {
    const { data, error } = await supabase
      .from("item_types")
      .insert({ ...typeRow, company_id: companyId })
      .select("id")
      .single();
    if (error) throw new Error(friendly(error));
    const { error: fieldErr } = await supabase
      .from("field_definitions")
      .insert(fields.map((f, i) => toRow(f, data.id, i)));
    if (fieldErr) {
      // Don't leave a type with no fields behind.
      await supabase.from("item_types").delete().eq("id", data.id);
      throw new Error(fieldErr.message);
    }
    return data.id;
  }

  const { data: updated, error: typeErr } = await supabase
    .from("item_types")
    .update(typeRow)
    .eq("id", typeId)
    .select("id");
  if (typeErr) throw new Error(friendly(typeErr));
  if (!updated?.length) throw new Error("Nothing was saved. You may not have permission.");

  const keptIds = new Set(fields.filter((f) => f.id).map((f) => f.id));
  const removedIds = originalFieldIds.filter((id) => !keptIds.has(id));
  if (removedIds.length) {
    const { error } = await supabase.from("field_definitions").delete().in("id", removedIds);
    if (error) throw new Error(error.message);
  }

  const rows = fields.map((f, i) => toRow(f, typeId, i));
  const existingRows = rows.filter((r) => r.id);
  const newRows = rows.filter((r) => !r.id);
  if (existingRows.length) {
    const { error } = await supabase.from("field_definitions").upsert(existingRows);
    if (error) throw new Error(error.message);
  }
  if (newRows.length) {
    const { error } = await supabase.from("field_definitions").insert(newRows);
    if (error) throw new Error(error.message);
  }
  return typeId;
}
