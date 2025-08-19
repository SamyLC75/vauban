import * as yaml from 'js-yaml';
import { promises as fs } from 'fs';
import path from 'path';

export type DuerRelevance = "direct" | "indirect" | "hors_champ";

export interface CategoryDefinition {
  name: string;                // slug canonical (ascii, snake_case)
  aliases: string[];
  parent?: string;             // slug d’une autre catégorie
  duer_relevance: DuerRelevance;
  description?: string;
  keywords: string[];
  auto_created?: boolean;
  created_at?: string;
}

interface CategoryYaml {
  categories: Record<string, {
    aliases?: string[];
    parent?: string;
    duer_relevance?: DuerRelevance;
    description?: string;
    keywords?: string[];
  }>;
}

export class CategoryRegistry {
  private categories = new Map<string, CategoryDefinition>();
  private aliasIndex = new Map<string, string>();     // alias_slug -> canonical
  private keywordIndex = new Map<string, Set<string>>(); // keyword_slug -> set(category)

  constructor(private configPath = path.join(process.cwd(), 'src/config/categories.yaml')) {}

  // ---------- lifecycle ----------
  async load(): Promise<void> {
    let content = '';
    try {
      content = await fs.readFile(this.configPath, 'utf8');
    } catch {
      console.warn(`[CategoryRegistry] Fichier ${this.configPath} introuvable. Seed minimal en mémoire.`);
      content = 'categories: {}';
    }
    const parsed = yaml.load(content) as CategoryYaml;
    if (!parsed?.categories) throw new Error('categories.yaml: champ "categories" manquant');

    for (const [rawName, cfg] of Object.entries(parsed.categories)) {
      this.register(rawName, {
        aliases: cfg.aliases ?? [],
        parent: cfg.parent ? this.slugify(cfg.parent) : undefined,
        duer_relevance: cfg.duer_relevance ?? 'direct',
        description: cfg.description,
        keywords: cfg.keywords ?? []
      });
    }
    console.log(`[CategoryRegistry] Chargé: ${this.categories.size} catégories`);
  }

  // ---------- registration ----------
  register(name: string, partial: Partial<CategoryDefinition> = {}): CategoryDefinition {
    const canonical = this.slugify(name);
    if (this.categories.has(canonical)) return this.categories.get(canonical)!;

    const def: CategoryDefinition = {
      name: canonical,
      aliases: (partial.aliases ?? []).map(a => this.slugify(a)),
      parent: partial.parent ? this.slugify(partial.parent) : undefined,
      duer_relevance: partial.duer_relevance ?? 'direct',
      description: partial.description,
      keywords: (partial.keywords ?? []).map(k => this.slugify(k)),
      auto_created: !!partial.auto_created,
      created_at: partial.auto_created ? new Date().toISOString() : undefined
    };

    this.categories.set(canonical, def);
    for (const a of def.aliases) this.aliasIndex.set(a, canonical);
    for (const k of def.keywords) {
      if (!this.keywordIndex.has(k)) this.keywordIndex.set(k, new Set());
      this.keywordIndex.get(k)!.add(canonical);
    }
    return def;
  }

  ensure(name: string, options: Partial<CategoryDefinition> = {}): CategoryDefinition {
    const canonical = this.slugify(name);
    if (this.categories.has(canonical)) return this.categories.get(canonical)!;

    if (process.env.AUTO_CREATE_CATEGORIES !== 'true') {
      // si on ne permet pas l’auto-create, on mappe par défaut vers "organisationnel"
      return this.register('organisationnel', {});
    }
    const inferredParent = this.inferParent(canonical);
    const inferredRelevance = this.inferRelevance(canonical);
    return this.register(canonical, {
      ...options,
      parent: options.parent ?? inferredParent,
      duer_relevance: options.duer_relevance ?? inferredRelevance,
      auto_created: true
    });
  }

  // ---------- matching ----------
  /**
   * Retourne une liste de catégories (slugs) pertinentes trouvées dans le texte.
   */
  match(text: string): string[] {
    const hay = this.slugify(text);
    const found = new Set<string>();

    // par nom direct
    for (const name of this.categories.keys()) if (hay.includes(name)) found.add(name);
    // par alias
    for (const [alias, name] of this.aliasIndex.entries()) if (hay.includes(alias)) found.add(name);
    // par keywords
    for (const [kw, names] of this.keywordIndex.entries()) if (hay.includes(kw)) names.forEach(n => found.add(n));

    // filtrage relevance
    const includeIndirect = process.env.INCLUDE_INDIRECT === 'true';
    return Array.from(found).filter(cat => {
      const c = this.categories.get(cat);
      if (!c) return false;
      if (c.duer_relevance === 'direct') return true;
      if (c.duer_relevance === 'indirect') return includeIndirect;
      return false; // hors_champ
    });
  }

  // ---------- helpers ----------
  private slugify(s: string): string {
    return s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private inferParent(cat: string): string | undefined {
    const hints: Record<string,string> = {
      cybersecurite: 'organisationnel',
      climat: 'environnemental',
      transport: 'mecanique',
      travail_isole: 'organisationnel',
      ergonomie: 'physique',
      bruit: 'environnemental'
    };
    return hints[cat];
  }

  private inferRelevance(cat: string): DuerRelevance {
    const indirect = new Set(['cybersecurite','climat','supply_chain','fraude','energie','reputation']);
    if (indirect.has(cat)) return 'indirect';
    return 'direct';
  }

  // ---------- public API ----------
  all(): CategoryDefinition[] { return Array.from(this.categories.values()); }
  get(name: string): CategoryDefinition | undefined { return this.categories.get(this.slugify(name)); }
}

let singleton: CategoryRegistry | null = null;
export async function getCategoryRegistry(): Promise<CategoryRegistry> {
  if (!singleton) {
    singleton = new CategoryRegistry();
    await singleton.load();
  }
  return singleton;
}
export function resetCategoryRegistry() { singleton = null; }
