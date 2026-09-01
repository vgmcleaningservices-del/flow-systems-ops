"use client";
import { useEffect, useState } from "react";

export function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) setPermission(Notification.permission);
  }, []);

  if (permission === "unsupported") {
    return <p className="section-sub" style={{ margin: 0 }}>Bureaubladmeldingen worden niet ondersteund door deze browser.</p>;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <span className="section-sub" style={{ margin: 0 }}>
        {permission === "granted" && "Aan — je krijgt een bureaubladmelding bij nieuwe chatberichten."}
        {permission === "denied" && "Uitgeschakeld in je browser. Zet dit aan via het slotje naast de adresbalk."}
        {permission === "default" && "Nog niet ingesteld."}
      </span>
      {permission === "default" && (
        <button className="btn ghost" onClick={() => Notification.requestPermission().then(setPermission)}>
          Bureaubladmeldingen aanzetten
        </button>
      )}
    </div>
  );
}
