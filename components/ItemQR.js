import React from "react";
import { QRCodeSVG } from "qrcode.react";

// QR code for one item. It holds just the item's id (a UUID), so scanning it
// later is a single lookup: items where id = <scanned value>.
// Based on Raul's qr-generator-demo (same library and settings).
export default function ItemQR({ itemId, size = 120 }) {
  return <QRCodeSVG value={itemId} size={size} level="M" marginSize={4} />;
}

// One-line label printed under a QR code: the item's first filled-in field
// (e.g. "Lot Code: L-1042"), so a sticker is readable by people too.
export function itemLabel(item, fields) {
  const first = fields.find((f) => {
    const v = item.data?.[f.key];
    return v !== undefined && v !== "";
  });
  return first ? `${first.label}: ${item.data[first.key]}` : "";
}
