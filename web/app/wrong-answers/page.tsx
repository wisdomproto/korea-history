"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getWrongAnswers,
  saveWrongAnswers,
  WrongAnswer,
} from "@/lib/wrong-answers";

type MainTab = "all" | "analysis";
type StatusFilter = "all" | "unresolved" | "resolved";
type AnalysisTab = "era" | "category";

export default function WrongAnswersPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<WrongAnswer[]>([]);
  const [mounted, setMounted] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>("era");

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setAnswers(getWrongAnswers());
    setMounted(true);
  }, []);

  const refresh = useCallback(() => {
    setAnswers(getWrongAnswers());
  }, []);

  // Stats
  const unresolvedCount = useMemo(
    () => answers.filter((a) => !a.resolved).length,
    [answers]
  );
  const resolvedCount = useMemo(
    () => answers.filter((a) => a.resolved).length,
    [answers]
  );

  // Filtered list
  const filtered = useMemo(() => {
    let list = [...answers];
    if (statusFilter === "unresolved") list = list.filter((a) => !a.resolved);
    if (statusFilter === "resolved") list = list.filter((a) => a.resolved);
    return list.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [answers, statusFilter]);

  // Analysis data — group by era or category
  const analysisBuckets = useMemo(() => {
    const unresolved = answers.filter((a) => !a.resolved);
    const map = new Map<string, WrongAnswer[]>();
    for (const a of unresolved) {
      const key = analysisTab === "era" ? a.era : (a.category || "기타");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return Array.from(map.entries())
      .map(([label, items]) => ({ label, count: items.length, items }))
      .sort((a, b) => b.count - a.count);
  }, [answers, analysisTab]);

  // Selection helpers
  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    setSelectedIds(new Set(filtered.map((a) => a.questionId)));
  };

  const cancelEdit = () => {
    setEditMode(false);
    setSelectedIds(new Set());
  };

  // Batch actions
  const batchResolve = () => {
    const updated = answers.map((a) =>
      selectedIds.has(a.questionId)
        ? { ...a, resolved: true, resolvedAt: new Date().toISOString() }
        : a
    );
    saveWrongAnswers(updated);
    setAnswers(updated);
    cancelEdit();
  };

  const batchUnresolve = () => {
    const updated = answers.map((a) =>
      selectedIds.has(a.questionId)
        ? { ...a, resolved: false, resolvedAt: undefined }
        : a
    );
    saveWrongAnswers(updated);
    setAnswers(updated);
    cancelEdit();
  };

  const batchDelete = () => {
    if (!confirm(`${selectedIds.size}개의 오답을 삭제하시겠습니까?`)) return;
    const updated = answers.filter((a) => !selectedIds.has(a.questionId));
    saveWrongAnswers(updated);
    setAnswers(updated);
    cancelEdit();
  };

  if (!mounted) {
    return (
      <div className="py-8">
        <h1 className="text-xl font-extrabold text-slate-900 mb-2">오답노트</h1>
        <p className="text-slate-400 text-sm">로딩 중...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-extrabold text-slate-900">오답노트</h1>
        {answers.length > 0 && (
          <button
            onClick={() => {
              if (!confirm("오답 기록을 모두 초기화하시겠습니까?")) return;
              saveWrongAnswers([]);
              setAnswers([]);
            }}
            className="text-[11px] font-semibold text-slate-400 hover:text-red-500 transition-colors"
          >
            초기화
          </button>
        )}
      </div>

      {/* Summary stats bar */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-3 text-xs text-slate-500">
          <span>
            전체 <b className="text-slate-800">{answers.length}</b>
          </span>
          <span>
            미해결 <b className="text-red-500">{unresolvedCount}</b>
          </span>
          <span>
            해결 <b className="text-emerald-600">{resolvedCount}</b>
          </span>
        </div>
        {unresolvedCount > 0 && (
          <button
            onClick={() => {
              const unresolved = answers.filter((a) => !a.resolved);
              const ids = unresolved.map((a) => a.examNumber * 1000 + a.questionNumber);
              const shuffled = ids.sort(() => Math.random() - 0.5).slice(0, 100);
              sessionStorage.setItem("studySession", JSON.stringify({
                ids: shuffled,
                title: "오답 복습",
                totalAvailable: ids.length,
              }));
              router.push("/study/session");
            }}
            className="ml-auto rounded-full bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-600 transition-colors"
          >
            미해결 복습 ({unresolvedCount})
          </button>
        )}
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 mb-4 rounded-2xl bg-slate-100 p-1">
        <TabButton
          active={mainTab === "all"}
          onClick={() => setMainTab("all")}
        >
          전체 보기
        </TabButton>
        <TabButton
          active={mainTab === "analysis"}
          onClick={() => setMainTab("analysis")}
        >
          유형별 보기
        </TabButton>
      </div>

      {/* ALL VIEW */}
      {mainTab === "all" && (
        <>
          {/* Status filter + edit toggle */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1">
              {(["all", "unresolved", "resolved"] as StatusFilter[]).map(
                (f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                      statusFilter === f
                        ? "bg-indigo-500 text-white"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {f === "all"
                      ? "전체"
                      : f === "unresolved"
                        ? "미해결"
                        : "해결"}
                  </button>
                )
              )}
            </div>
            {filtered.length > 0 && !editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="text-xs text-indigo-600 font-semibold hover:underline"
              >
                편집
              </button>
            )}
            {editMode && (
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs text-indigo-600 font-semibold hover:underline"
                >
                  전체
                </button>
                <button
                  onClick={cancelEdit}
                  className="text-xs text-slate-500 font-semibold hover:underline"
                >
                  취소
                </button>
              </div>
            )}
          </div>

          {/* Edit mode action bar */}
          {editMode && selectedIds.size > 0 && (
            <div className="flex items-center gap-2 mb-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-3">
              <span className="text-xs font-bold text-indigo-700">
                {selectedIds.size}개 선택
              </span>
              <div className="ml-auto flex gap-1.5">
                <button
                  onClick={batchResolve}
                  className="rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-600"
                >
                  ✓ 해결
                </button>
                <button
                  onClick={batchUnresolve}
                  className="rounded-full bg-orange-400 px-2.5 py-1 text-xs font-bold text-white hover:bg-orange-500"
                >
                  ✕ 미해결
                </button>
                <button
                  onClick={batchDelete}
                  className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white hover:bg-red-600"
                >
                  삭제
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-4xl mb-3">
                {statusFilter === "unresolved" ? "🎉" : "📭"}
              </p>
              <p className="text-slate-500 text-sm">
                {statusFilter === "unresolved"
                  ? "미해결 오답이 없습니다!"
                  : statusFilter === "resolved"
                    ? "아직 해결된 오답이 없습니다"
                    : "오답 기록이 없습니다"}
              </p>
              {answers.length === 0 && (
                <Link
                  href="/study"
                  className="mt-4 inline-block text-sm text-indigo-600 hover:underline"
                >
                  학습하러 가기 →
                </Link>
              )}
            </div>
          )}

          {/* Answer list */}
          <div className="space-y-2">
            {filtered.map((answer) => {
              const isSelected = selectedIds.has(answer.questionId);
              return (
                <div
                  key={answer.questionId}
                  className={`flex items-center rounded-2xl border transition-all card-shadow ${
                    isSelected
                      ? "border-indigo-300 bg-indigo-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  {/* Checkbox in edit mode */}
                  {editMode && (
                    <button
                      onClick={() => toggleSelect(answer.questionId)}
                      className="pl-3 pr-1"
                    >
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-500 text-white"
                            : "border-slate-300"
                        }`}
                      >
                        {isSelected && (
                          <span className="text-xs">✓</span>
                        )}
                      </div>
                    </button>
                  )}

                  <button
                    className="flex flex-1 items-center p-3 min-w-0 text-left"
                    onClick={() => {
                      if (editMode) {
                        toggleSelect(answer.questionId);
                        return;
                      }
                      const id = answer.examNumber * 1000 + answer.questionNumber;
                      sessionStorage.setItem("studySession", JSON.stringify({
                        ids: [id],
                        title: `오답 복습 — 제${answer.examNumber}회 ${answer.questionNumber}번`,
                      }));
                      router.push("/study/session");
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-600">
                          제{answer.examNumber}회 {answer.questionNumber}번
                        </span>
                        <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600">
                          {answer.era}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 line-clamp-2 leading-snug">
                        {answer.questionContent}
                      </p>
                      <div className="mt-1.5 flex items-center gap-3 text-[11px]">
                        <span className="text-slate-400">
                          내 답: {answer.selectedAnswer}번 → 정답:{" "}
                          {answer.correctAnswer}번
                        </span>
                        <span className="text-slate-300">
                          {(() => {
                            const d = new Date(answer.createdAt);
                            return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
                          })()}
                        </span>
                      </div>
                    </div>
                    {/* Status dot */}
                    <div className="shrink-0 ml-3 flex flex-col items-center gap-1">
                      <div
                        className={`h-2.5 w-2.5 rounded-full ${
                          answer.resolved ? "bg-emerald-500" : "bg-red-400"
                        }`}
                      />
                      <span className="text-[10px] text-slate-400">
                        {answer.resolved ? "해결" : "미해결"}
                      </span>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ANALYSIS VIEW */}
      {mainTab === "analysis" && (
        <>
          {/* Sub-tabs */}
          <div className="flex gap-1 mb-4">
            <button
              onClick={() => setAnalysisTab("era")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                analysisTab === "era"
                  ? "bg-indigo-500 text-white"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              시대별
            </button>
            <button
              onClick={() => setAnalysisTab("category")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                analysisTab === "category"
                  ? "bg-indigo-500 text-white"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              유형별
            </button>
          </div>

          {analysisBuckets.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-4xl mb-3">🎉</p>
              <p className="text-slate-500 text-sm">미해결 오답이 없습니다!</p>
            </div>
          )}

          <div className="space-y-2">
            {analysisBuckets.map(({ label, count, items }) => {
              const maxCount = analysisBuckets[0]?.count || 1;
              return (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-200 bg-white p-4 card-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-800">
                      {label}
                    </span>
                    <span className="text-xs font-bold text-red-500">
                      {count}문제
                    </span>
                  </div>
                  {/* Bar */}
                  <div className="h-2 rounded-full bg-slate-100 mb-2">
                    <div
                      className="h-full rounded-full bg-red-400 transition-all"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                  {/* Preview questions */}
                  <div className="space-y-1">
                    {items.slice(0, 3).map((a) => (
                      <button
                        key={a.questionId}
                        onClick={() => {
                          const id = a.examNumber * 1000 + a.questionNumber;
                          sessionStorage.setItem("studySession", JSON.stringify({
                            ids: [id],
                            title: `오답 복습 — 제${a.examNumber}회 ${a.questionNumber}번`,
                          }));
                          router.push("/study/session");
                        }}
                        className="block w-full text-left text-xs text-slate-500 hover:text-indigo-600 line-clamp-1 transition-colors"
                      >
                        {a.examNumber}회 {a.questionNumber}번: {a.questionContent}
                      </button>
                    ))}
                    {count > 3 && (
                      <p className="text-[10px] text-slate-400">
                        외 {count - 3}문제
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
        active
          ? "bg-white text-indigo-600 card-shadow"
          : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}
