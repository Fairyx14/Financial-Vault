/**
 * Sign-in sync tests. Run with: npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EMPTY_SYNC, hasContent, importSteps, planSignIn, type RemoteDoc, type Vault } from "./syncPlan.ts";

const ME = "user-1";
const budget = (n: number) => JSON.stringify({ version: 1, incomes: [], expenses: Array.from({ length: n }, (_, i) => ({ id: `e${i}` })), customCategories: [], budgets: {}, paidBills: [], allocations: [] });
const savings = (n: number) => JSON.stringify({ version: 1, currency: "GBP", goals: Array.from({ length: n }, (_, i) => ({ id: `g${i}` })) });
const doc = (text: string, revision = 3): RemoteDoc => ({ data: JSON.parse(text), revision });
const actions = (plan: ReturnType<typeof planSignIn>): Record<string, string> =>
  plan.kind === "ready" ? Object.fromEntries(plan.steps.map((s) => [s.vault, s.action === "upload" ? `upload@${s.base}` : s.action])) : { kind: plan.kind };

describe("What counts as data", () => {
  it("ignores empty shells the app creates on first open", () => {
    assert.equal(hasContent("budget", budget(0)), false);
    assert.equal(hasContent("savings", savings(0)), false);
    assert.equal(hasContent("budget", null), false);
    assert.equal(hasContent("budget", "not json"), false);
  });

  it("spots real entries", () => {
    assert.equal(hasContent("budget", budget(1)), true);
    assert.equal(hasContent("savings", savings(2)), true);
    assert.equal(hasContent("budget", JSON.stringify({ budgets: { "2026-11": { groceries: "300" } } })), true);
    assert.equal(hasContent("investments", JSON.stringify({ version: 1, investments: [{ id: "x" }] })), true);
  });
});

describe("Signing in", () => {
  it("brand-new user on a fresh browser: nothing to ask, just use the (empty) account", () => {
    assert.deepEqual(actions(planSignIn(ME, EMPTY_SYNC, { budget: budget(0) }, {})), {
      savings: "download",
      investments: "download",
      "investment-goals": "download",
      budget: "download",
    });
  });

  it("browser data from before accounts, empty account: offers to move it in", () => {
    assert.equal(planSignIn(ME, EMPTY_SYNC, { budget: budget(3) }, {}).kind, "ask-import");
  });

  it("browser data from before accounts, account already has data: asks which to keep", () => {
    assert.equal(planSignIn(ME, EMPTY_SYNC, { savings: savings(1) }, { budget: doc(budget(2)) }).kind, "ask-choose");
  });

  it("never mixes another account's data into yours", () => {
    const record = { owner: "someone-else", revisions: { budget: 7 }, pending: ["budget" as Vault] };
    assert.equal(actions(planSignIn(ME, record, { budget: budget(5) }, { budget: doc(budget(1)) })).budget, "download");
  });

  it("returning on the same browser: uploads unsent changes and downloads newer account data", () => {
    const record = { owner: ME, revisions: { budget: 3, savings: 2 }, pending: ["budget" as Vault] };
    const plan = planSignIn(ME, record, { budget: budget(4), savings: savings(1) }, { budget: doc(budget(3), 3), savings: doc(savings(2), 5) });
    assert.deepEqual(actions(plan), {
      savings: "download", // changed on another device (revision 2 -> 5)
      investments: "download", // nothing anywhere: clears the browser copy
      "investment-goals": "download",
      budget: "upload@3", // changed here, based on revision 3
    });
  });

  it("returning with nothing new anywhere: keeps everything as it is", () => {
    const record = { owner: ME, revisions: { budget: 3 }, pending: [] };
    assert.equal(actions(planSignIn(ME, record, { budget: budget(1) }, { budget: doc(budget(1), 3) })).budget, "keep");
  });

  it("importing uploads every vault on top of whatever the account has", () => {
    assert.deepEqual(
      importSteps({ budget: doc(budget(0), 2) }).map((s) => (s.action === "upload" ? `${s.vault}@${s.base}` : s.action)),
      ["savings@null", "investments@null", "investment-goals@null", "budget@2"],
    );
  });
});
