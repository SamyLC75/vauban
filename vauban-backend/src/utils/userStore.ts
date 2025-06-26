import fs from "fs";
import path from "path";

const USERS_FILE = path.resolve(__dirname, "../data/users.json");

export function getUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
}

interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: string;
  maxUsage: number;
  currentUsage: number;
}

export function saveUsers(users: User[]) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}
