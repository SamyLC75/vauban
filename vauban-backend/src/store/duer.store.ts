import fs from 'fs';
import path from 'path';

export type DUERRecord = {
  id: string;
  ownerId: string;            // canonique
  dateCreation: string;
  orgCode?: string;
  duer: { [k: string]: any };

  // compat héritée (optionnels)
  ownerUserId?: string;
  userId?: string;
  createdBy?: string;
};

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DUERS_PATH = path.join(DATA_DIR, 'duers.json');

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DUERS_PATH)) fs.writeFileSync(DUERS_PATH, JSON.stringify({}), 'utf-8');
}

function readAll(): Record<string, DUERRecord> {
  ensure();
  try {
    const raw = fs.readFileSync(DUERS_PATH, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

function writeAll(obj: Record<string, DUERRecord>) {
  ensure();
  fs.writeFileSync(DUERS_PATH, JSON.stringify(obj, null, 2), 'utf-8');
}

export const DUERStore = {
  save(record: DUERRecord) {
    const all = readAll();
    all[record.id] = record;
    writeAll(all);
  },
  get(id: string): DUERRecord | undefined {
    const all = readAll();
    return all[id];
  },
  listAll(): DUERRecord[] {
    return Object.values(readAll());
  },
  listByOwner(ownerUserId: string): DUERRecord[] {
    return Object.values(readAll()).filter(r => r.ownerUserId === ownerUserId);
  },
  remove(id: string): boolean {
    const all = readAll();
    if (!all[id]) return false;
    delete all[id];
    writeAll(all);
    return true;
  }
};
