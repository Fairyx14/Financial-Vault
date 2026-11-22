"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { searchSite, SUGGESTED, type SearchItem } from "@/lib/siteSearch";
import styles from "./search.module.css";

const SEARCH_ICON = ["M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z", "m20 20-4-4"];

/**
 * Header search. Opens a dialog with a search box; results update as you type and can be
 * chosen with the mouse or the arrow keys. Opens with Ctrl+K / Cmd+K or "/".
 * Searches the site's pages and features (lib/siteSearch.ts), entirely in the browser.
 */
export default function SiteSearch() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [isMac, setIsMac] = useState(false);
  const listId = useId();

  const results: SearchItem[] = useMemo(() => (query.trim() ? searchSite(query, 8) : SUGGESTED), [query]);
  const showingSuggestions = !query.trim();

  const open = () => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    setQuery("");
    setActive(0);
    dialog.showModal();
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const close = () => dialogRef.current?.close();

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
    const onKey = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      if ((event.key === "k" || event.key === "K") && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        open();
      } else if (event.key === "/" && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /** Goes to a result. Same-page links (e.g. another Budget Vault tab) just change the #. */
  const choose = (item: SearchItem) => {
    close();
    const [path, hash] = item.href.split("#");
    if (path === window.location.pathname && hash !== undefined) {
      if (window.location.hash === `#${hash}`) window.dispatchEvent(new HashChangeEvent("hashchange"));
      else window.location.hash = hash;
      return;
    }
    router.push(item.href);
  };

  const onInputKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (event.key === "Enter" && results[active]) {
      event.preventDefault();
      choose(results[active]);
    }
  };

  // Keep the highlighted result in view as the arrow keys move through the list.
  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  const optionId = (i: number) => `${listId}-${i}`;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        onClick={open}
        aria-haspopup="dialog"
        aria-label="Search Dream Vault"
        aria-keyshortcuts="Control+K Meta+K /"
        title={`Search (${isMac ? "⌘K" : "Ctrl+K"})`}
      >
        <Icon paths={SEARCH_ICON} size={18} />
        <span className={styles.triggerText} aria-hidden="true">
          Search…
        </span>
        <kbd className={styles.kbd} aria-hidden="true">
          {isMac ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-label="Search Dream Vault"
        onClick={(event) => event.target === dialogRef.current && close()}
        onClose={() => triggerRef.current?.focus()}
      >
        <div className={styles.panel}>
          <div className={styles.inputRow}>
            <Icon paths={SEARCH_ICON} size={20} />
            <input
              ref={inputRef}
              type="search"
              className={styles.input}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onInputKey}
              placeholder="Search vaults, tools and help"
              aria-label="Search Dream Vault"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls={listId}
              aria-activedescendant={results.length ? optionId(active) : undefined}
              aria-autocomplete="list"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="button" className={styles.close} onClick={close}>
              Close
            </button>
          </div>

          <p className={styles.heading} id={`${listId}-label`}>
            {showingSuggestions ? "Popular" : results.length ? "Results" : ""}
          </p>

          {results.length === 0 ? (
            <p className={styles.empty} role="status">
              Nothing matches &ldquo;{query.trim()}&rdquo;. Try a vault name, or words like &ldquo;bills&rdquo;,
              &ldquo;export&rdquo; or &ldquo;password&rdquo;.
            </p>
          ) : (
            <ul id={listId} role="listbox" aria-labelledby={`${listId}-label`} className={styles.results}>
              {results.map((item, i) => (
                <li
                  key={`${item.title}-${item.href}`}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  className={`${styles.result} ${i === active ? styles.resultActive : ""}`}
                  onMouseMove={() => setActive(i)}
                  onClick={() => choose(item)}
                >
                  <span className={styles.resultMain}>
                    <span className={styles.resultTitle}>{item.title}</span>
                    <span className={styles.resultDesc}>{item.description}</span>
                  </span>
                  <span className={styles.group}>{item.group}</span>
                </li>
              ))}
            </ul>
          )}

          <p className={styles.footer} aria-hidden="true">
            <span>
              <kbd className={styles.kbd}>↑</kbd> <kbd className={styles.kbd}>↓</kbd> to move
            </span>
            <span>
              <kbd className={styles.kbd}>Enter</kbd> to open
            </span>
            <span>
              <kbd className={styles.kbd}>Esc</kbd> to close
            </span>
          </p>
          <p className="visually-hidden" aria-live="polite">
            {query.trim() ? `${results.length} ${results.length === 1 ? "result" : "results"}` : ""}
          </p>
        </div>
      </dialog>
    </>
  );
}
