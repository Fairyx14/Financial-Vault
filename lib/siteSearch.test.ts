/**
 * Site search tests. Run with: npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SEARCH_INDEX, searchSite, SUGGESTED } from "./siteSearch.ts";

const top = (q: string) => searchSite(q)[0]?.title;
const titles = (q: string) => searchSite(q).map((r) => r.title);

describe("Site search", () => {
  it("finds each vault by name", () => {
    assert.equal(top("budget"), "Budget Vault");
    assert.equal(top("savings vault"), "Savings Vault");
    assert.equal(top("invest"), "Investment Vault");
  });

  it("understands everyday words", () => {
    assert.equal(top("netflix"), "Bills & subscriptions");
    assert.equal(top("rent"), "Bills & subscriptions");
    assert.equal(top("spending limit"), "Budgets");
    assert.equal(top("download my data"), "Export your data");
    assert.equal(top("compound interest"), "Growth calculator");
    assert.equal(top("salary"), "Income");
    assert.equal(top("where is my data stored"), "Privacy notice");
  });

  it("matches the start of words as you type", () => {
    assert.ok(titles("calen").includes("Cash-flow calendar"));
    assert.ok(titles("pass").includes("Change password"));
  });

  it("needs every word to match", () => {
    assert.deepEqual(searchSite("budget zzzz"), []);
    assert.deepEqual(searchSite("qwertyuiop"), []);
  });

  it("ignores case, punctuation and filler words", () => {
    assert.equal(top("  BILLS & Subscriptions!! "), "Bills & subscriptions");
    assert.equal(top("how do I change my password"), "Change password");
  });

  it("puts available features before coming-soon ones", () => {
    const results = titles("calculator");
    assert.equal(results[0], "Growth calculator");
    assert.ok(results.indexOf("Financial tools (coming soon)") > 0);
  });

  it("returns nothing for an empty search and respects the limit", () => {
    assert.deepEqual(searchSite("   "), []);
    assert.ok(searchSite("a", 3).length <= 3);
  });

  it("links every result to a real page", () => {
    const pages = ["/", "/vault", "/investments", "/budget", "/account", "/privacy", "/terms"];
    for (const item of SEARCH_INDEX) {
      const path = item.href.split("#")[0];
      assert.ok(pages.includes(path), `${item.title} links to ${item.href}`);
    }
    assert.equal(SUGGESTED.length, 6);
  });
});
