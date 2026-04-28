"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { NoteGroup, NoteListItem, NotesShellMeta, BreadcrumbItem } from "./types";

interface Props {
  meta: NotesShellMeta;
  groups: NoteGroup[];
  breadcrumb: BreadcrumbItem[];
  /** 현재 선택된 노트/단원 id (단원 상세 페이지에서 하이라이트) */
  activeId?: string;
  /** 우측 본문. 미제공 시 인덱스 카드 그리드 자동 생성 */
  children?: React.ReactNode;
  /** 단원 카드에 추가 액션 (선택) */
  cardFooter?: (item: NoteListItem) => React.ReactNode;
}

/**
 * 한능검·단권화·자동 가이드 공통 노트 셸 — 좌측 사이드바(트리) + 우측 본문/카드 그리드.
 */
export default function NotesShell({
  meta,
  groups,
  breadcrumb,
  activeId,
  children,
  cardFooter,
}: Props) {
  const [search, setSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // flat 모든 아이템 (검색용)
  const allItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const totalItems = allItems.length;

  const filtered = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return allItems.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        (n.keywords ?? []).some((k) => k.toLowerCase().includes(q)),
    );
  }, [allItems, search]);

  function toggleGroup(key: string) {
    setCollapsedGroups((s) => ({ ...s, [key]: !s[key] }));
  }

  return (
    <main className="bg-[var(--gc-bg)] min-h-[calc(100vh-68px)]">
      <div className="mx-auto max-w-[1200px] px-5 py-8 md:py-10">
        {/* Breadcrumbs */}
        {breadcrumb.length > 0 && (
          <nav className="text-xs text-[var(--gc-ink2)] mb-4 font-mono">
            {breadcrumb.map((b, i) => (
              <span key={i}>
                {b.href ? (
                  <Link href={b.href} className="hover:text-[var(--gc-amber)]">
                    {b.label}
                  </Link>
                ) : (
                  <span className="text-[var(--gc-amber)] font-bold">{b.label}</span>
                )}
                {i < breadcrumb.length - 1 && <span className="mx-2">›</span>}
              </span>
            ))}
          </nav>
        )}

        {/* Header (인덱스에서만 — 상세 페이지는 children 안에서 자체 헤더) */}
        {!children && (
          <header className="mb-6">
            <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--gc-amber)] font-bold mb-2">
              {meta.eyebrow}
            </div>
            <h1 className="font-serif-kr text-3xl md:text-4xl font-black text-[var(--gc-ink)] tracking-tight">
              {meta.titleLead && <span>{meta.titleLead} </span>}
              <span className="text-[var(--gc-amber)]">{meta.titleAccent}</span>
            </h1>
            {meta.subtitle && (
              <p className="text-sm text-[var(--gc-ink2)] mt-2">{meta.subtitle}</p>
            )}
          </header>
        )}

        <div className="md:flex md:gap-6">
          {/* 좌측 사이드바 */}
          <aside className="md:w-72 md:shrink-0 mb-6 md:mb-0">
            <div className="md:sticky md:top-20 space-y-3">
              {/* 검색 */}
              <div className="rounded-2xl border border-[var(--gc-hairline)] bg-white px-3 py-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={meta.searchPlaceholder || `${totalItems}개 검색...`}
                  className="flex-1 text-sm bg-transparent outline-none"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="text-xs text-slate-400 hover:text-slate-600"
                    aria-label="검색 지우기"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* 트리 */}
              <nav className="rounded-2xl border border-[var(--gc-hairline)] bg-white max-h-[calc(100vh-220px)] overflow-y-auto">
                {filtered ? (
                  <ul className="p-2 space-y-0.5">
                    {filtered.map((t) => (
                      <li key={t.id}>
                        <SidebarLink item={t} active={t.id === activeId} />
                      </li>
                    ))}
                    {filtered.length === 0 && (
                      <li className="px-3 py-4 text-xs text-slate-400 text-center">검색 결과 없음</li>
                    )}
                  </ul>
                ) : (
                  <div className="p-1.5">
                    {groups.map((g) => {
                      const collapsed = collapsedGroups[g.key];
                      const colorClass = g.colorClass ?? "border-l-slate-300";
                      return (
                        <div key={g.key} className="mb-0.5">
                          <button
                            onClick={() => toggleGroup(g.key)}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-50 rounded-lg border-l-2 ${colorClass}`}
                          >
                            <svg
                              className={`w-3 h-3 transition-transform ${collapsed ? "" : "rotate-90"}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.5}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="flex-1 text-left">{g.label}</span>
                            <span className="text-[9px] font-mono">{g.items.length}</span>
                          </button>
                          {!collapsed && (
                            <ul className="ml-3 mt-0.5 space-y-0.5">
                              {g.items.map((t) => (
                                <li key={t.id}>
                                  <SidebarLink item={t} active={t.id === activeId} />
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </nav>

              {/* 빠른 액션 */}
              {meta.quickActions && meta.quickActions.length > 0 && (
                <div className="rounded-2xl border border-[var(--gc-hairline)] bg-white p-3 space-y-1.5">
                  {meta.quickActions.map((a) =>
                    a.primary ? (
                      <Link
                        key={a.href}
                        href={a.href}
                        className="block text-xs text-center font-bold text-[var(--gc-ink)] bg-[var(--gc-bg)] rounded-lg py-2 hover:bg-[#FFF7ED] hover:text-[var(--gc-amber)]"
                      >
                        {a.label}
                      </Link>
                    ) : (
                      <Link
                        key={a.href}
                        href={a.href}
                        className="block text-xs text-center font-medium text-slate-500 hover:text-[var(--gc-amber)] py-1"
                      >
                        {a.label}
                      </Link>
                    ),
                  )}
                </div>
              )}
            </div>
          </aside>

          {/* 우측 본문 */}
          <div className="flex-1 min-w-0">
            {children ? (
              children
            ) : filtered && filtered.length === 0 ? (
              <div className="rounded-2xl border border-[var(--gc-hairline)] bg-white p-12 text-center">
                <p className="text-slate-400">검색 결과가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(filtered ?? allItems).map((item, idx) => (
                  <NoteCard key={item.id} item={item} colorClass={getColorForItem(item, groups)} cardFooter={cardFooter} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function SidebarLink({ item, active }: { item: NoteListItem; active?: boolean }) {
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2 px-2.5 py-1.5 text-[13px] rounded-md transition-colors ${
        active
          ? "bg-[#FFF7ED] text-[var(--gc-amber)] font-bold"
          : "text-[var(--gc-ink)] hover:bg-[var(--gc-bg)] hover:text-[var(--gc-amber)]"
      }`}
    >
      {item.ord != null && (
        <span className="font-mono text-[10px] text-slate-400 shrink-0">
          {String(item.ord).padStart(2, "0")}
        </span>
      )}
      <span className="flex-1 truncate">{item.title}</span>
      {item.freqCount != null && item.freqCount > 0 && (
        <span className="text-[9px] text-[var(--gc-amber)] font-bold shrink-0">{item.freqCount}</span>
      )}
    </Link>
  );
}

function NoteCard({
  item,
  colorClass,
  cardFooter,
}: {
  item: NoteListItem;
  colorClass: string;
  cardFooter?: (item: NoteListItem) => React.ReactNode;
}) {
  return (
    <Link
      href={item.href}
      className={`block rounded-2xl border border-[var(--gc-hairline)] border-l-4 ${colorClass} bg-white p-5 hover:shadow-md hover:border-[var(--gc-amber)] transition-all group`}
    >
      <div className="flex items-start gap-3">
        {item.ord != null && (
          <div className="font-mono text-xs text-slate-400 mt-1 shrink-0">
            {String(item.ord).padStart(2, "0")}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-serif-kr text-lg font-bold text-[var(--gc-ink)] group-hover:text-[var(--gc-amber)] transition-colors">
            {item.title}
          </h3>
          {item.meta && (
            <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-[var(--gc-ink2)]">
              {item.meta}
            </div>
          )}
          {item.keywords && item.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2.5">
              {item.keywords.slice(0, 8).map((k) => (
                <span
                  key={k}
                  className="text-[10px] px-1.5 py-0.5 bg-[#F5EFE4] text-[var(--gc-ink2)] rounded font-medium"
                >
                  {k}
                </span>
              ))}
              {item.keywords.length > 8 && (
                <span className="text-[10px] text-slate-400">+{item.keywords.length - 8}</span>
              )}
            </div>
          )}
          {cardFooter && cardFooter(item)}
        </div>
        <svg
          className="w-5 h-5 text-slate-300 group-hover:text-[var(--gc-amber)] group-hover:translate-x-0.5 transition-all shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

function getColorForItem(item: NoteListItem, groups: NoteGroup[]): string {
  for (const g of groups) {
    if (g.items.some((i) => i.id === item.id)) {
      return g.colorClass ?? "border-l-slate-300";
    }
  }
  return "border-l-slate-300";
}
