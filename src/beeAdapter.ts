import { createBeeClient } from "@beeai/cli/lib";

/**
 * Bee (Wearable AI) integration — the hackathon track's required technology.
 *
 * This module REALLY imports and calls the Bee SDK (@beeai/cli). The data
 * source is swappable: a live Bee login when available, clearly-labeled
 * fixture data otherwise (organizer-blessed for entrants without a device).
 *
 * Iron rule: if Bee data can't be retrieved, we throw BeeUnavailableError.
 * We NEVER fabricate conversations, todos, or summaries.
 */

export class BeeUnavailableError extends Error {
  constructor(message = "Bee data unavailable") {
    super(message);
    this.name = "BeeUnavailableError";
  }
}

export interface BeeUtterance {
  speaker: string;
  text: string;
  at: string;
}

export interface BeeConversation {
  id: string;
  startedAt: string;
  utterances: BeeUtterance[];
}

export interface BeeTodo {
  id: string;
  text: string;
  completed: boolean;
  alarmAt?: string;
}

/** Minimal surface of the Bee SDK we rely on — keeps the adapter testable. */
export interface BeeApiShape {
  now: () => Promise<unknown>;
  todos: { list: () => Promise<unknown> };
  daily: { list: () => Promise<unknown> };
}

/** The real thing: wraps createBeeClient() from @beeai/cli/lib. */
export function realBeeApi(): BeeApiShape {
  const client = createBeeClient();
  return {
    now: () => client.api.now<unknown>(),
    todos: { list: () => client.api.todos.list<unknown>() },
    daily: { list: () => client.api.daily.list<unknown>() },
  };
}

export interface BeeFixtures {
  conversations?: unknown;
  todos?: unknown;
  daily?: unknown;
}

/** Clearly-labeled fixture source for demo/CI without a Bee login. */
export function fixtureBeeApi(fixtures: BeeFixtures): BeeApiShape {
  return {
    now: async () => fixtures.conversations ?? [],
    todos: { list: async () => fixtures.todos ?? [] },
    daily: { list: async () => fixtures.daily ?? [] },
  };
}

// ---- tolerant parsers: the CLI's JSON shapes vary; parse what we can ----

function asArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const k of ["conversations", "todos", "summaries", "daily", "items", "results", "data"]) {
      if (Array.isArray(o[k])) return o[k] as unknown[];
    }
  }
  return [];
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function parseUtterance(u: unknown): BeeUtterance | null {
  if (!u || typeof u !== "object") return null;
  const o = u as Record<string, unknown>;
  const text = str(o.text ?? o.content ?? o.utterance);
  if (!text) return null;
  return {
    speaker: str(o.speaker ?? o.role, "unknown"),
    text,
    at: str(o.at ?? o.timestamp ?? o.time),
  };
}

function parseConversation(c: unknown): BeeConversation | null {
  if (!c || typeof c !== "object") return null;
  const o = c as Record<string, unknown>;
  const id = str(o.id);
  if (!id) return null;
  const rawUtt = o.utterances ?? o.messages ?? o.transcript ?? [];
  const utterances = asArray(rawUtt).map(parseUtterance).filter((u): u is BeeUtterance => u !== null);
  return {
    id,
    startedAt: str(o.startedAt ?? o.started_at ?? o.createdAt ?? o.created_at),
    utterances,
  };
}

function parseTodo(t: unknown): BeeTodo | null {
  if (!t || typeof t !== "object") return null;
  const o = t as Record<string, unknown>;
  const id = str(o.id);
  const text = str(o.text ?? o.task ?? o.title);
  if (!id || !text) return null;
  const status = o.status ?? o.state;
  return {
    id,
    text,
    completed: o.completed === true || o.done === true || status === "completed" || status === "done",
    alarmAt: typeof o.alarmAt === "string" ? o.alarmAt : typeof o.alarm_at === "string" ? o.alarm_at : undefined,
  };
}

export class BeeAdapter {
  private readonly api: BeeApiShape;

  /** Pass an api for tests/fixtures; otherwise the real Bee SDK is used. */
  constructor(api?: BeeApiShape) {
    this.api = api ?? realBeeApi();
  }

  /** Recent conversations (Bee `now`: last ~10h of utterances). */
  async getRecentConversations(limit = 5): Promise<BeeConversation[]> {
    try {
      const raw = await this.api.now();
      return asArray(raw).map(parseConversation).filter((c): c is BeeConversation => c !== null).slice(0, limit);
    } catch (err) {
      throw new BeeUnavailableError(err instanceof Error ? err.message : String(err));
    }
  }

  async getTodos(): Promise<BeeTodo[]> {
    try {
      const raw = await this.api.todos.list();
      return asArray(raw).map(parseTodo).filter((t): t is BeeTodo => t !== null);
    } catch (err) {
      throw new BeeUnavailableError(err instanceof Error ? err.message : String(err));
    }
  }

  /** Daily summary text for a YYYY-MM-DD date, if one exists. */
  async getDailySummary(dateISO: string): Promise<string | undefined> {
    try {
      const raw = await this.api.daily.list();
      const day = dateISO.slice(0, 10);
      for (const item of asArray(raw)) {
        if (!item || typeof item !== "object") continue;
        const o = item as Record<string, unknown>;
        const itemDay = str(o.date ?? o.day ?? o.id).slice(0, 10);
        if (itemDay === day) {
          const text = str(o.summary ?? o.text ?? o.content);
          return text || undefined;
        }
      }
      return undefined;
    } catch (err) {
      throw new BeeUnavailableError(err instanceof Error ? err.message : String(err));
    }
  }
}
