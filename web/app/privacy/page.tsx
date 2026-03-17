import { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침",
};

export default function PrivacyPage() {
  return (
    <div className="prose prose-sm max-w-none">
      <h1>개인정보처리방침</h1>
      <p>시행일: 2026년 3월 17일</p>

      <h2>1. 수집하는 개인정보</h2>
      <p>
        본 사이트는 회원가입 없이 이용할 수 있으며, 별도의 개인정보를 수집하지
        않습니다. 다만, 서비스 이용 과정에서 다음 정보가 자동으로 수집될 수
        있습니다:
      </p>
      <ul>
        <li>방문 기록 (IP 주소, 접속 시간, 브라우저 정보)</li>
        <li>쿠키 (Google Analytics, Google AdSense)</li>
      </ul>

      <h2>2. 개인정보의 이용 목적</h2>
      <ul>
        <li>서비스 이용 통계 분석 (Google Analytics)</li>
        <li>맞춤형 광고 제공 (Google AdSense)</li>
      </ul>

      <h2>3. 쿠키 사용</h2>
      <p>
        본 사이트는 Google Analytics와 Google AdSense를 통해 쿠키를 사용합니다.
        브라우저 설정에서 쿠키를 차단할 수 있으나, 일부 서비스 이용이 제한될 수
        있습니다.
      </p>

      <h2>4. 로컬 데이터 저장</h2>
      <p>
        오답노트 기능은 사용자의 브라우저 localStorage에 데이터를 저장합니다. 이
        데이터는 서버로 전송되지 않으며, 브라우저 데이터 삭제 시 함께
        삭제됩니다.
      </p>

      <h2>5. 제3자 제공</h2>
      <p>수집된 정보는 제3자에게 제공하지 않습니다.</p>

      <h2>6. 문의</h2>
      <p>개인정보 관련 문의: [이메일 주소]</p>
    </div>
  );
}
