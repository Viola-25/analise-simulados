import React, { useEffect, useRef, useState } from 'react';
import FACULDADES from '../data/faculdades.json';

interface Props {
  value: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  id?: string;
}

export default function SearchableFaculdadeSelect({ value, onSelect, placeholder, id }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedFromList, setSelectedFromList] = useState(false);
  const [isOtherMode, setIsOtherMode] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // keep query in sync with externally selected value
    setQuery(value || '');
    const isFromList = FACULDADES.includes(value) || value === 'Minha faculdade não está na lista' || (value && !FACULDADES.includes(value));
    setSelectedFromList(Boolean(value));
    setIsOtherMode(false);
  }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const filtered = FACULDADES.filter((f) => f.toLowerCase().includes(query.toLowerCase())).slice(0, 100);

  function handleOptionClick(opt: string) {
    setQuery(opt);
    setOpen(false);
    setSelectedFromList(true);
    onSelect(opt);
  }

  function handleOutra() {
    setIsOtherMode(true);
    setQuery('');
    setOpen(false);
    setSelectedFromList(false);
    // focus next tick
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <div className="relative" ref={rootRef}>
      <input
        id={id}
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setSelectedFromList(false); if (!isOtherMode) setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (isOtherMode && e.key === 'Enter') {
            const v = query.trim();
            if (v) {
              onSelect(v);
              setSelectedFromList(true);
              setIsOtherMode(false);
            }
          }
        }}
        onBlur={() => {
          if (isOtherMode) {
            const v = query.trim();
            if (v) {
              onSelect(v);
              setSelectedFromList(true);
            }
            setIsOtherMode(false);
          }
        }}
        placeholder={isOtherMode ? 'Digite o nome da sua faculdade' : placeholder}
        className="w-full px-4 py-2.5 rounded-xl border border-white/10 focus:border-blue-500 focus:bg-white/8 outline-none text-white bg-white/3 transition-all text-sm placeholder-slate-500 font-sans"
        aria-autocomplete="list"
        autoComplete="off"
      />

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-auto rounded-xl bg-[#071029] border border-white/10 shadow-lg">
          <ul className="p-2">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-400">Nenhuma correspondência</li>
            )}
            {filtered.map((f) => (
              <li
                key={f}
                onClick={() => handleOptionClick(f)}
                className="px-3 py-2 text-sm text-slate-200 hover:bg-white/5 rounded-md cursor-pointer"
              >
                {f}
              </li>
            ))}
            <li className="border-t border-white/5 mt-2 pt-2">
              <button type="button" onClick={handleOutra} className="w-full text-left px-3 py-2 text-sm text-amber-300 hover:bg-white/5 rounded-md">
                Minha faculdade não está na lista
              </button>
            </li>
          </ul>
        </div>
      )}

      {isOtherMode && (
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const v = query.trim();
              if (!v) return;
              onSelect(v);
              setSelectedFromList(true);
              setIsOtherMode(false);
            }}
            disabled={!query.trim()}
            className="px-3 py-2 bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-sm"
          >
            Confirmar
          </button>
          <button
            type="button"
            onClick={() => { setIsOtherMode(false); setQuery(''); }}
            className="px-3 py-2 bg-rose-600 text-white rounded-xl text-sm"
          >
            Cancelar
          </button>
          <div className="text-xs text-slate-400">Digite o nome completo e pressione Confirmar.</div>
        </div>
      )}

      {selectedFromList && (
        <div className="mt-2 text-xs text-emerald-300 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="inline-block">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Seleção confirmada
        </div>
      )}

      {!selectedFromList && value && (
        <input type="hidden" />
      )}
    </div>
  );
}
