import React from "react";

export default function Badge({ children, color = "blue" }: { children: string; color?: string }) {
  const bg = {
    blue: "bg-blue-200 text-blue-900",
    yellow: "bg-yellow-200 text-yellow-800",
    red: "bg-red-200 text-red-900",
  }[color];
  return <span className={`inline-block rounded px-2 py-1 text-xs font-bold ${bg}`}>{children}</span>;
}
