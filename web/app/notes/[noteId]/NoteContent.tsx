"use client";

import { useRef, useCallback, useState, useEffect } from "react";

interface NoteContentProps {
  html: string;
}

export default function NoteContent({ html }: NoteContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [showSearch, setShowSearch] = useState(false);

  const expandAll = useCallback(() => {
    if (!contentRef.current) return;
    contentRef.current.querySelectorAll("details").forEach((d) => d.setAttribute("open", ""));
  }, []);

  const collapseAll = useCallback(() => {
    if (!contentRef.current) return;
    contentRef.current.querySelectorAll("details").forEach((d) => d.removeAttribute("open"));
  }, []);

  // Highlight search matches in the DOM
  useEffect(() => {
    if (!contentRef.current) return;

    // Clear previous highlights
    const existing = contentRef.current.querySelectorAll("mark[data-search-highlight]");
    existing.forEach((mark) => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
        parent.normalize();
      }
    });

    if (!search.trim()) {
      setMatchCount(0);
      setCurrentMatch(0);
      return;
    }

    // Expand all details so we can search inside them
    contentRef.current.querySelectorAll("details").forEach((d) => d.setAttribute("open", ""));

    const query = search.trim().toLowerCase();
    const walker = document.createTreeWalker(
      contentRef.current,
      NodeFilter.SHOW_TEXT,
      null,
    );

    const matches: { node: Text; start: number; length: number }[] = [];
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      const text = node.textContent || "";
      const lower = text.toLowerCase();
      let idx = 0;
      while ((idx = lower.indexOf(query, idx)) !== -1) {
        matches.push({ node, start: idx, length: query.length });
        idx += query.length;
      }
    }

    // Insert highlights (reverse order to preserve indices)
    const grouped = new Map<Text, { start: number; length: number }[]>();
    for (const m of matches) {
      if (!grouped.has(m.node)) grouped.set(m.node, []);
      grouped.get(m.node)!.push(m);
    }

    let globalIdx = matches.length - 1;
    for (const [textNode, nodeMatches] of grouped) {
      // Process in reverse order within this text node
      const sorted = nodeMatches.sort((a, b) => b.start - a.start);
      for (const m of sorted) {
        const original = textNode.textContent || "";
        const before = original.slice(0, m.start);
        const matched = original.slice(m.start, m.start + m.length);
        const after = original.slice(m.start + m.length);

        const mark = document.createElement("mark");
        mark.setAttribute("data-search-highlight", "");
        mark.setAttribute("data-match-index", String(globalIdx));
        mark.className = "bg-amber-200/80 text-inherit rounded-sm px-0.5";
        mark.textContent = matched;

        const parent = textNode.parentNode;
        if (parent) {
          const frag = document.createDocumentFragment();
          if (before) frag.appendChild(document.createTextNode(before));
          frag.appendChild(mark);
          if (after) frag.appendChild(document.createTextNode(after));
          parent.replaceChild(frag, textNode);
        }
        globalIdx--;
      }
    }

    setMatchCount(matches.length);
    setCurrentMatch(matches.length > 0 ? 0 : 0);
  }, [search]);

  // Scroll to current match
  useEffect(() => {
    if (!contentRef.current || matchCount === 0) return;

    // Remove active styling from all
    const all = contentRef.current.querySelectorAll("mark[data-search-highlight]");
    all.forEach((m) => {
      (m as HTMLElement).className = "bg-amber-200/80 text-inherit rounded-sm px-0.5";
    });

    // Highlight active match
    const active = contentRef.current.querySelector(
      `mark[data-match-index="${currentMatch}"]`
    ) as HTMLElement | null;
    if (active) {
      active.className = "bg-indigo-400 text-white rounded-sm px-0.5";
      active.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentMatch, matchCount]);

  const goNext = () => {
    if (matchCount === 0) return;
    setCurrentMatch((prev) => (prev + 1) % matchCount);
  };

  const goPrev = () => {
    if (matchCount === 0) return;
    setCurrentMatch((prev) => (prev - 1 + matchCount) % matchCount);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.shiftKey ? goPrev() : goNext();
    }
    if (e.key === "Escape") {
      setShowSearch(false);
      setSearch("");
    }
  };

  return (
    <div>
      {/* Toolbar: expand/collapse + search toggle */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={expandAll}
          className="btn-primary flex items-center gap-1.5 !rounded-full !px-4 !py-2 text-xs"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          전체 펼치기
        </button>
        <button
          onClick={collapseAll}
          className="btn-secondary flex items-center gap-1.5 !rounded-full !px-4 !py-2 text-xs"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
          전체 닫기
        </button>
        <button
          onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearch(""); }}
          className={`ml-auto flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
            showSearch
              ? "bg-indigo-100 text-indigo-600"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          검색
        </button>
      </div>

      {/* Sticky search bar */}
      {showSearch && (
        <div className="sticky top-14 z-40 -mx-4 px-4 py-2 bg-white/95 backdrop-blur-sm border-b border-slate-100 shadow-sm mb-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="노트에서 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
              />
              {search && (
                <span className="text-[11px] font-bold text-slate-400 shrink-0">
                  {matchCount > 0 ? `${currentMatch + 1}/${matchCount}` : "0"}
                </span>
              )}
            </div>
            {/* Prev/Next buttons */}
            <button
              onClick={goPrev}
              disabled={matchCount === 0}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={goNext}
              disabled={matchCount === 0}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              onClick={() => { setShowSearch(false); setSearch(""); }}
              className="rounded-lg p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Note HTML content */}
      <div
        ref={contentRef}
        className="note-content prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
