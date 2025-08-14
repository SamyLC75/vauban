// src/components/settings/CryptoModeSwitch.tsx
import React, { useState } from "react";
import Badge from "../ui/Badge";

type CryptoMode = "online" | "offline";

interface Props {
  mode: CryptoMode;
  setMode: (mode: CryptoMode) => void;
  secret: string;
  setSecret: (secret: string) => void;
}

const CryptoModeSwitch: React.FC<Props> = ({ mode, setMode, secret, setSecret }) => {
  const [localKey, setLocalKey] = useState(secret);

  const handleMode = (newMode: CryptoMode) => {
    setMode(newMode);
    if (newMode === "offline") setSecret(localKey);
    else setSecret(""); // On efface la clé en mode online pour la sécurité
  };

  return (
    <div className="mb-4">
      <h2 className="font-bold mb-2">Mode de fonctionnement</h2>
      <div className="flex items-center gap-4">
        <Badge color={mode === "offline" ? "blue" : "yellow"}>
          {mode === "offline" ? "Mode Décrypté (offline)" : "Mode Crypté (online)"}
        </Badge>
        <button
          className="btn"
          onClick={() => handleMode(mode === "offline" ? "online" : "offline")}
        >
          {mode === "offline" ? "Basculer en mode crypté (online)" : "Basculer en mode décrypté (offline)"}
        </button>
        {mode === "offline" && (
          <input
            className="input ml-2"
            type="password"
            placeholder="Votre clé de chiffrement"
            value={localKey}
            onChange={e => setLocalKey(e.target.value)}
          />
        )}
      </div>
    </div>
  );
};

export default CryptoModeSwitch;
