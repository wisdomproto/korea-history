import type { Metadata } from "next";
import MembershipClient from "./MembershipClient";

export const metadata: Metadata = {
  title: "프리미엄 멤버십 — 광고 없이 무제한 | 기출노트",
  description:
    "기출노트 프리미엄: 광고 없이 모든 기출문제·요약노트를 무제한으로. 가입 즉시 7일 무료 체험.",
  robots: { index: false, follow: true }, // 결제 페이지 — 색인 불필요
};

export default function MembershipPage() {
  return <MembershipClient />;
}
