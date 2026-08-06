import crypto from "crypto";

import type { OdooSession } from "@/lib/odooClient";

type SessionRecord = {
  id: string;
  createdAt: number;
  odoo: OdooSession;
};

const sessions = new Map<string, SessionRecord>();

export const createSession = (odoo: OdooSession) => {
  const id = crypto.randomUUID();
  sessions.set(id, { id, createdAt: Date.now(), odoo });
  return id;
};

export const getSession = (id: string | undefined | null) => {
  if (!id) {
    return null;
  }
  return sessions.get(id) ?? null;
};

export const deleteSession = (id: string | undefined | null) => {
  if (!id) {
    return;
  }
  sessions.delete(id);
};
