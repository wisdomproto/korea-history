import { Suspense } from "react";
import StudySession from "./StudySession";

export default function SessionPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-slate-400">불러오는 중...</div>}>
      <StudySession />
    </Suspense>
  );
}
