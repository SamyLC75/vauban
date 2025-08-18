// src/repositories/duer.repo.ts
import { prisma } from "../services/prisma";
import { encryptJson, decryptJson } from "../services/crypto.service";
import type { SizeClass } from ".prisma/client";

export type DuerDoc = {
  secteur: string;
  date_generation: string;
  unites: Array<{
    nom: string;
    risques: Array<any>;
  }>;
  synthese: any;
};

export const DuerRepo = {
  async create(params: {
    orgId: string;
    ownerId: string;
    sector: string;
    sizeClass: SizeClass; // "TPE" | "PME" | "ETI"
    doc: DuerDoc;
  }) {
    const jsonEnc = encryptJson(params.doc);
    const created = await prisma.duer.create({
      data: {
        orgId: params.orgId,
        ownerId: params.ownerId,
        sector: params.sector,
        sizeClass: params.sizeClass,
        jsonEnc,
        versions: { create: { version: 1, jsonEnc } },
      },
      include: { versions: true },
    });
    return created;
  },

  async getOne(id: string) {
    const d = await prisma.duer.findUnique({ where: { id } });
    if (!d) return null;
    const doc = decryptJson(Buffer.from(d.jsonEnc)) as DuerDoc;
    return { ...d, doc };
  },

  async listByOrg(orgId: string) {
    const rows = await prisma.duer.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        sector: true,
        sizeClass: true,
        createdAt: true,
        jsonEnc: true,
      },
    });

    // Typage de l'élément pour éviter "Parameter 'r' implicitly has an 'any' type"
    type Row = (typeof rows)[number];

    return rows.map((r: Row) => {
      const doc = decryptJson(Buffer.from(r.jsonEnc)) as DuerDoc;
      return {
        id: r.id,
        secteur: r.sector,
        sizeClass: r.sizeClass,
        dateCreation: r.createdAt,
        date_generation: doc.date_generation,
        unitesCount: doc.unites?.length || 0,
        crit: doc.synthese?.nb_risques_critiques ?? 0,
        imp: doc.synthese?.nb_risques_importants ?? 0,
        mod: doc.synthese?.nb_risques_moderes ?? 0,
      };
    });
  },

  async newVersion(id: string, doc: DuerDoc) {
    const existing = await prisma.duer.findUnique({ where: { id } });
    if (!existing) throw new Error("DUER not found");
    const nextVersion = (existing.version ?? 1) + 1;
    const jsonEnc = encryptJson(doc);
    await prisma.$transaction([
      prisma.duerVersion.create({
        data: { duerId: id, version: nextVersion, jsonEnc },
      }),
      prisma.duer.update({
        where: { id },
        data: { version: nextVersion, jsonEnc },
      }),
    ]);
  },

  // ✅ La méthode qu'il te manquait
  async delete(id: string) {
    await prisma.duerVersion.deleteMany({ where: { duerId: id } }).catch(() => {});
    await prisma.duer.delete({ where: { id } });
  },

  // 🔹 Update the DUER and create a new version automatically
  async update(id: string, doc: DuerDoc) {
    const jsonEnc = encryptJson(doc);
    // Increment the version and get the new value
    const updated = await prisma.duer.update({
      where: { id },
      data: { jsonEnc, version: { increment: 1 } },
      select: { id: true, version: true }
    });

    await prisma.duerVersion.create({
      data: { duerId: id, version: updated.version!, jsonEnc }
    });

    return updated;
  },
};
