import { describe, it, expect } from "vitest";
import { BeeAdapter, fixtureBeeApi, BeeUnavailableError, BeeApiShape } from "../src/beeAdapter.js";

const fixtures = {
  conversations: [
    {
      id: "conv-1",
      started_at: "2026-10-20T14:00:00Z",
      utterances: [
        { speaker: "user", text: "remind me to prep slides for Friday", timestamp: "2026-10-20T14:01:00Z" },
      ],
    },
  ],
  todos: [{ id: "t1", text: "Prep slides for Friday demo", completed: false, alarm_at: "2026-10-23T09:00:00Z" }],
  daily: [{ date: "2026-10-20", summary: "Deep work morning, calls afternoon." }],
};

const failingApi: BeeApiShape = {
  now: async () => { throw new Error("not logged in"); },
  todos: { list: async () => { throw new Error("not logged in"); } },
  daily: { list: async () => { throw new Error("not logged in"); } },
};

describe("BeeAdapter", () => {
  it("parses conversations from fixture data", async () => {
    const bee = new BeeAdapter(fixtureBeeApi(fixtures));
    const convos = await bee.getRecentConversations();
    expect(convos).toHaveLength(1);
    expect(convos[0].id).toBe("conv-1");
    expect(convos[0].utterances[0].text).toContain("prep slides");
  });

  it("parses todos including alarm times", async () => {
    const bee = new BeeAdapter(fixtureBeeApi(fixtures));
    const todos = await bee.getTodos();
    expect(todos).toHaveLength(1);
    expect(todos[0].text).toBe("Prep slides for Friday demo");
    expect(todos[0].completed).toBe(false);
    expect(todos[0].alarmAt).toBe("2026-10-23T09:00:00Z");
  });

  it("finds the daily summary by date, undefined when missing", async () => {
    const bee = new BeeAdapter(fixtureBeeApi(fixtures));
    expect(await bee.getDailySummary("2026-10-20")).toBe("Deep work morning, calls afternoon.");
    expect(await bee.getDailySummary("2026-10-21")).toBeUndefined();
  });

  it("never fabricates: empty fixtures yield empty results", async () => {
    const bee = new BeeAdapter(fixtureBeeApi({}));
    expect(await bee.getRecentConversations()).toEqual([]);
    expect(await bee.getTodos()).toEqual([]);
    expect(await bee.getDailySummary("2026-10-20")).toBeUndefined();
  });

  it("throws BeeUnavailableError when the Bee backend is unreachable", async () => {
    const bee = new BeeAdapter(failingApi);
    await expect(bee.getRecentConversations()).rejects.toBeInstanceOf(BeeUnavailableError);
    await expect(bee.getTodos()).rejects.toBeInstanceOf(BeeUnavailableError);
    await expect(bee.getDailySummary("2026-10-20")).rejects.toBeInstanceOf(BeeUnavailableError);
  });
});
