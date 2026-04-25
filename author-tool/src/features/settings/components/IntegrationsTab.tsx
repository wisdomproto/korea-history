import { useEnvStatus } from '../hooks/useSettings';
import type { ProjectSettings } from '../types';
import { SettingField, TextInput } from './SettingField';

interface Props {
  settings: ProjectSettings;
  onPatch: (patch: Partial<ProjectSettings>) => void;
}

export function IntegrationsTab({ settings, onPatch }: Props) {
  const { data, isLoading } = useEnvStatus();
  const wp = settings.channelCredentials?.wordpress ?? {};

  const updateWp = (partial: Partial<typeof wp>) => {
    onPatch({
      channelCredentials: {
        ...(settings.channelCredentials ?? {}),
        wordpress: { ...wp, ...partial },
      },
    });
  };

  return (
    <div className="max-w-3xl space-y-8">
      {/* ───── 서버 환경변수 (읽기 전용) ───── */}
      <section className="space-y-4">
        <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-200 pb-2">
          API · 외부 서비스 연동 상태
        </h3>
        <p className="text-xs text-gray-500">
          서버 <code className="bg-gray-100 px-1 rounded">.env</code> 파일에 설정된 키를 읽어 표시합니다. 값은 마스킹되며, 수정은 <code className="bg-gray-100 px-1 rounded">.env</code>에서 직접 하세요.
        </p>

        {isLoading ? (
          <div className="h-32 bg-gray-50 rounded-xl animate-pulse" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data?.services.map((s) => (
              <div
                key={s.id}
                className={`rounded-xl border p-3 ${
                  s.connected ? 'border-emerald-200 bg-emerald-50/40' : 'border-gray-200 bg-gray-50/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{s.icon}</span>
                  <span className="text-sm font-bold text-gray-800 flex-1">{s.label}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      s.connected
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {s.connected ? '연결됨' : '미설정'}
                  </span>
                </div>
                {s.note && <p className="text-[11px] text-gray-500 mb-2">{s.note}</p>}
                {s.fields && (
                  <div className="space-y-0.5 pt-1.5 border-t border-gray-100">
                    {s.fields.map((f) => (
                      <div key={f.key} className="flex items-center gap-2 text-[10px] font-mono">
                        <span className={f.set ? 'text-emerald-600' : 'text-gray-300'}>
                          {f.set ? '●' : '○'}
                        </span>
                        <span className="text-gray-500 flex-1 truncate">{f.key}</span>
                        {f.preview && <span className="text-gray-400 truncate max-w-[120px]">{f.preview}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ───── WordPress (프로젝트별 저장) ───── */}
      <section className="space-y-4">
        <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-200 pb-2">
          WordPress 연동
        </h3>
        <p className="text-xs text-gray-500">
          WordPress 사이트에 직접 발행하려면 사이트 URL + 사용자명 + Application Password가 필요합니다.
          Application Password는 WP 관리자 → 프로필 → Application Passwords에서 발급받으세요.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingField label="사이트 URL">
            <TextInput
              value={wp.siteUrl}
              onChange={(v) => updateWp({ siteUrl: v })}
              placeholder="https://yoursite.com"
            />
          </SettingField>
          <SettingField label="사용자명">
            <TextInput
              value={wp.username}
              onChange={(v) => updateWp({ username: v })}
              placeholder="admin"
            />
          </SettingField>
        </div>
        <SettingField label="Application Password" hint="XXXX XXXX XXXX XXXX XXXX XXXX">
          <TextInput
            value={wp.appPassword}
            onChange={(v) => updateWp({ appPassword: v })}
            placeholder="XXXX XXXX XXXX XXXX XXXX XXXX"
          />
        </SettingField>
        <p className="text-[11px] text-amber-600">
          ⚠️ 현재는 값만 저장합니다. 실제 발행 연동은 추후 WordPress 탭 구현 시 활성화됩니다.
        </p>
      </section>
    </div>
  );
}
