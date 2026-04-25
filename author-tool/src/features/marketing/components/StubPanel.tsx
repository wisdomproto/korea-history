interface StubPanelProps {
  icon: string;
  title: string;
  subtitle: string;
  description?: string;
  features?: string[];
}

export function StubPanel({ icon, title, subtitle, description, features }: StubPanelProps) {
  return (
    <div className="flex flex-1 items-center justify-center bg-gray-50 p-8">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-4">{icon}</div>
        <h2 className="text-xl font-bold mb-1">{title}</h2>
        <p className="text-sm text-gray-500 mb-4">{subtitle}</p>

        {description && (
          <p className="text-xs text-gray-600 mb-5 leading-relaxed">{description}</p>
        )}

        {features && features.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-left">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
              예정된 기능
            </div>
            <ul className="space-y-1.5 text-xs text-gray-700">
              {features.map((f, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-emerald-500">•</span>
                  <span className="flex-1">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 inline-block bg-amber-50 border border-amber-200 rounded-full px-3 py-1 text-[10px] font-semibold text-amber-700">
          🚧 개발 중
        </div>
      </div>
    </div>
  );
}
