import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-6 text-center text-sm text-gray-500">
        <div className="flex justify-center gap-4 mb-2">
          <Link href="/privacy" className="hover:text-gray-700 underline">
            개인정보처리방침
          </Link>
          <Link href="/terms" className="hover:text-gray-700 underline">
            이용약관
          </Link>
        </div>
        <p>&copy; {new Date().getFullYear()} 한국사기출. All rights reserved.</p>
      </div>
    </footer>
  );
}
