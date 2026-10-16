import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import ItemQR, { itemLabel } from "../../../../components/ItemQR";
import RequireRole from "../../../../components/RequireRole";
import { colors } from "../../../../components/ui";
import { supabase } from "../../../../lib/supabase";

// Printable sheet of QR codes (Lab 3 Screens 12–13). Shows every item of one
// type, or just one item with ?item=<id>. Web-only page: plain HTML so the
// browser's print dialog lays it out cleanly.

// _document.js locks the body height for react-native-web; undo that here so
// the sheet scrolls on screen and prints across multiple pages.
const css = `
  .qr-page { height: 100vh; overflow-y: auto; background: ${colors.bg}; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: ${colors.text}; }
  .qr-inner { max-width: 900px; margin: 0 auto; padding: 16px; }
  .qr-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
  .qr-toolbar h1 { font-size: 24px; margin: 0; }
  .qr-btn { border: 1px solid ${colors.border}; background: #fff; color: ${colors.text}; border-radius: 8px; padding: 10px 16px; font-size: 15px; font-weight: 600; cursor: pointer; }
  .qr-btn.primary { background: ${colors.primary}; border-color: ${colors.primary}; color: #fff; }
  .qr-btn.primary:hover { background: ${colors.primaryDark}; }
  .qr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; }
  .qr-tag { background: #fff; border: 1px dashed ${colors.border}; border-radius: 8px; padding: 12px; text-align: center; break-inside: avoid; }
  .qr-tag svg { display: block; margin: 0 auto; }
  .qr-type { font-weight: 700; margin-top: 6px; }
  .qr-label { font-size: 13px; margin-top: 2px; overflow-wrap: anywhere; }
  .qr-id { font-size: 11px; color: ${colors.muted}; font-family: ui-monospace, Menlo, monospace; margin-top: 2px; }
  .qr-msg { color: ${colors.muted}; }
  .qr-err { color: ${colors.error}; }
  @media print {
    html, body, #__next { height: auto !important; overflow: visible !important; }
    .qr-page { height: auto; overflow: visible; background: #fff; }
    .qr-toolbar { display: none; }
    .qr-inner { padding: 0; max-width: none; }
    .qr-grid { grid-template-columns: repeat(3, 1fr); }
  }
`;

function QRSheet({ typeId, itemId }) {
  const router = useRouter();
  const [type, setType] = useState(null);
  const [fields, setFields] = useState([]);
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let itemQuery = supabase.from("items").select("id, data, created_at").eq("item_type_id", typeId)
      .order("created_at", { ascending: false });
    if (itemId) itemQuery = itemQuery.eq("id", itemId);

    Promise.all([
      supabase.from("item_types").select("id, name").eq("id", typeId).single(),
      supabase.from("field_definitions").select("key, label").eq("item_type_id", typeId).order("sort_order"),
      itemQuery,
    ]).then(([typeRes, fieldRes, itemRes]) => {
      const firstError = [typeRes, fieldRes, itemRes].find((r) => r.error)?.error;
      if (firstError) {
        setError(firstError.message);
        return;
      }
      setType(typeRes.data);
      setFields(fieldRes.data);
      setItems(itemRes.data);
    });
  }, [typeId, itemId]);

  const title = type ? `QR Codes: ${type.name}` : "QR Codes";

  return (
    <div className="qr-page">
      <style>{css}</style>
      <div className="qr-inner">
        <div className="qr-toolbar">
          <h1>{title}</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="qr-btn" onClick={() => router.push(`/admin/item-types/${typeId}`)}>Back</button>
            <button className="qr-btn primary" onClick={() => window.print()} disabled={!items?.length}>
              Print
            </button>
          </div>
        </div>

        {error && <p className="qr-err">{error}</p>}
        {!items && !error && <p className="qr-msg">Loading QR codes…</p>}
        {items && items.length === 0 && (
          <p className="qr-msg">{itemId ? "That item wasn't found." : `Nothing has been registered as ${type?.name} yet.`}</p>
        )}

        {items && items.length > 0 && (
          <div className="qr-grid">
            {items.map((item) => (
              <div className="qr-tag" key={item.id}>
                <ItemQR itemId={item.id} size={150} />
                <div className="qr-type">{type?.name}</div>
                <div className="qr-label">{itemLabel(item, fields)}</div>
                <div className="qr-id">#{item.id.slice(0, 8)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function QRSheetPage() {
  const router = useRouter();
  const { id, item } = router.query;
  return (
    <RequireRole role="admin">
      {router.isReady && id ? <QRSheet typeId={id} itemId={item} /> : null}
    </RequireRole>
  );
}
