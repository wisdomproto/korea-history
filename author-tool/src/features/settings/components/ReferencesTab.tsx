import type { ProjectSettings, ReferenceFile } from '../types';
import { SettingField, TextInput, Textarea } from './SettingField';
import { useState } from 'react';

interface Props {
  settings: ProjectSettings;
  onPatch: (patch: Partial<ProjectSettings>) => void;
}

export function ReferencesTab({ settings, onPatch }: Props) {
  const files = settings.referenceFiles ?? [];
  const [newName, setNewName] = useState('');
  const [newText, setNewText] = useState('');

  const addReference = () => {
    if (!newText.trim()) return;
    const ref: ReferenceFile = {
      id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newName.trim() || `참고 자료 #${files.length + 1}`,
      extractedText: newText.trim(),
      addedAt: new Date().toISOString(),
    };
    onPatch({ referenceFiles: [...files, ref] });
    setNewName('');
    setNewText('');
  };

  const deleteReference = (id: string) => {
    onPatch({ referenceFiles: files.filter((f) => f.id !== id) });
  };

  const updateReference = (id: string, partial: Partial<ReferenceFile>) => {
    onPatch({
      referenceFiles: files.map((f) => (f.id === id ? { ...f, ...partial } : f)),
    });
  };

  return (
    <div className="max-w-3xl space-y-8">
      <section className="space-y-4">
        <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-200 pb-2">
          참고 자료
        </h3>
        <p className="text-xs text-gray-500">
          AI가 콘텐츠를 생성할 때 참고할 공식 문서, 용어집, 경쟁사 자료 등을 붙여넣으세요. 각 자료는 제목과 본문으로 구성됩니다.
          <br />
          <span className="text-amber-600">※ PDF/DOCX 파일 업로드는 다음 업데이트에 추가 예정입니다. 지금은 내용을 복사해 붙여넣어 주세요.</span>
        </p>

        {/* Add form */}
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 space-y-3">
          <SettingField label="제목">
            <TextInput
              value={newName}
              onChange={setNewName}
              placeholder="예: 한능검 출제 기준 (국사편찬위원회)"
              maxLength={100}
            />
          </SettingField>
          <SettingField label="본문 (텍스트)">
            <Textarea
              value={newText}
              onChange={setNewText}
              placeholder="자료 본문을 붙여넣으세요. 용어 정의, 공식 수치, 자주 인용할 문구 등."
              rows={6}
              maxLength={20000}
            />
          </SettingField>
          <div className="flex justify-end">
            <button
              onClick={addReference}
              disabled={!newText.trim()}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-emerald-700"
            >
              + 추가
            </button>
          </div>
        </div>

        {/* List */}
        {files.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">
            등록된 참고 자료가 없습니다.
          </p>
        ) : (
          <ul className="space-y-3">
            {files.map((f) => (
              <li
                key={f.id}
                className="rounded-xl border border-gray-200 p-4 space-y-2 bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <input
                    value={f.name}
                    onChange={(e) => updateReference(f.id, { name: e.target.value })}
                    className="flex-1 bg-transparent text-sm font-semibold text-gray-800 outline-none focus:bg-gray-50 rounded px-1"
                  />
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <span>{new Date(f.addedAt).toLocaleDateString('ko-KR')}</span>
                    <button
                      onClick={() => deleteReference(f.id)}
                      className="rounded px-1.5 py-0.5 hover:bg-rose-50 hover:text-rose-600"
                    >
                      삭제
                    </button>
                  </div>
                </div>
                <textarea
                  value={f.extractedText ?? ''}
                  onChange={(e) => updateReference(f.id, { extractedText: e.target.value })}
                  rows={5}
                  className="w-full rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2 text-[12px] text-gray-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 resize-y"
                />
                <div className="text-[10px] text-gray-400 text-right">
                  {(f.extractedText ?? '').length.toLocaleString()}자
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-200 pb-2">
          자료 요약 (선택)
        </h3>
        <p className="text-xs text-gray-500">
          모든 자료를 요약한 한두 단락. 개별 자료를 읽기 전 AI에게 주는 첫 번째 컨텍스트로 쓰입니다.
        </p>
        <Textarea
          value={settings.referenceSummary}
          onChange={(v) => onPatch({ referenceSummary: v })}
          placeholder="예: 한국사능력검정시험은 국가 공인 시험으로 심화(1~3급)·기본(4~6급) 두 등급이 있으며..."
          rows={5}
          maxLength={2000}
        />
      </section>
    </div>
  );
}
