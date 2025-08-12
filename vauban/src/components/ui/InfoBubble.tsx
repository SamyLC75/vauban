import React from "react";
export default function InfoBubble({ text }: { text: string }) {
  return (
    <span className="ml-2 text-xs bg-gray-100 text-gray-700 rounded px-2 py-1 border border-gray-300">
      {text}
    </span>
  );
}
