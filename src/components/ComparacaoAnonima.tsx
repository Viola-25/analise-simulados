/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BarChart3, Filter, GraduationCap, RefreshCw, Target, TrendingUp, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { AnonymousComparisonResponse, PerfilAluno } from '../types';

interface ComparacaoAnonimaProps {
  perfil: PerfilAluno;
  accessToken: string | null;
}

interface ComparisonFiltersState {
  estado: string;
  faculdade: string;
  semestre: string;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function progressColor(delta: number) {
  if (delta >= 0) {
    return 'bg-emerald-500';
  }

  if (delta >= -5) {
    return 'bg-amber-500';
  }

  return 'bg-rose-500';
}

function cardTone(delta: number) {
  if (delta >= 0) {
    return 'text-emerald-300';
  }

  if (delta >= -5) {
    return 'text-amber-300';
  }

  return 'text-rose-300';
}

export default function ComparacaoAnonima({ perfil, accessToken }: ComparacaoAnonimaProps) {
  const [filters, setFilters] = useState<ComparisonFiltersState>({
    estado: '',
    faculdade: '',
    semestre: '',
  });
  const [availableFilters, setAvailableFilters] = useState<AnonymousComparisonResponse['availableFilters']>({
    estados: [],
    faculdades: [],
    semestres: [],
  });
  const [comparison, setComparison] = useState<AnonymousComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFilters({
      estado: perfil.estado && perfil.estado !== 'Não informado' ? perfil.estado : '',
      faculdade: perfil.faculdade && perfil.faculdade !== 'Não informada' ? perfil.faculdade : '',
      semestre: perfil.semestre && perfil.semestre !== 'Não informado' ? perfil.semestre : '',
    });
  }, [perfil.estado, perfil.faculdade, perfil.semestre]);

  const currentFiltersPayload = useMemo(() => ({
    estado: filters.estado || null,
    faculdade: filters.faculdade || null,
    semestre: filters.semestre || null,
  }), [filters]);

  const loadComparison = async (nextFilters: ComparisonFiltersState = filters) => {
    if (!accessToken) {
      setError('Você precisa entrar na conta para ver a comparação anônima.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/compare-performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          filters: {
            estado: nextFilters.estado || null,
            faculdade: nextFilters.faculdade || null,
            semestre: nextFilters.semestre || null,
          },
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || 'Não foi possível carregar a comparação anônima.');
      }

      setComparison(data);
      setAvailableFilters(data.availableFilters);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar a comparação anônima.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadComparison({ estado: '', faculdade: '', semestre: '' });
  }, [accessToken]);

  return (
    <div className="space-y-6" id="comparison-anonymous-container">
      <div className="glass-panel-heavy p-6 rounded-2xl border border-white/10 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 text-slate-100">
        <div className="flex items-start gap-4 max-w-2xl">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20 shrink-0">
            <Users size={24} className="animate-pulse" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              Comparação Anônima de Desempenho
            </h2>
            <p className="text-xs text-slate-400">
              Compare seu rendimento com a base agregada de usuários usando estado, faculdade e semestre, sem expor nomes ou perfis individuais.
            </p>
          </div>
        </div>

        <button
          onClick={() => void loadComparison(filters)}
          disabled={loading || !accessToken}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl transition-all shadow-md border border-blue-500/10 flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Atualizando...' : 'Atualizar comparação'}
        </button>
      </div>

      {error && (
        <div className="bg-rose-950/20 border border-rose-500/20 text-rose-300 p-4 rounded-xl flex items-start gap-3 text-xs leading-relaxed shadow-lg">
          <AlertCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Falha na comparação:</span> {error}
          </div>
        </div>
      )}

      <div className="glass-card p-5 rounded-2xl border border-white/7 shadow-xl space-y-4 text-slate-100">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Filter size={16} className="text-blue-400" /> Filtros do recorte
          </h3>
          <button
            onClick={() => setFilters({ estado: '', faculdade: '', semestre: '' })}
            className="text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            Limpar filtros
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="space-y-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Estado
            <select
              value={filters.estado}
              onChange={(e) => setFilters((current) => ({ ...current, estado: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:border-blue-500 transition-all text-sm"
            >
              <option value="" className="bg-[#0f172a]">Todos</option>
              {availableFilters.estados.map((estado) => (
                <option key={estado} value={estado} className="bg-[#0f172a]">{estado}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Faculdade
            <select
              value={filters.faculdade}
              onChange={(e) => setFilters((current) => ({ ...current, faculdade: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:border-blue-500 transition-all text-sm"
            >
              <option value="" className="bg-[#0f172a]">Todos</option>
              {availableFilters.faculdades.map((faculdade) => (
                <option key={faculdade} value={faculdade} className="bg-[#0f172a]">{faculdade}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Semestre
            <select
              value={filters.semestre}
              onChange={(e) => setFilters((current) => ({ ...current, semestre: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:border-blue-500 transition-all text-sm"
            >
              <option value="" className="bg-[#0f172a]">Todos</option>
              {availableFilters.semestres.map((semestre) => (
                <option key={semestre} value={semestre} className="bg-[#0f172a]">{semestre}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
          <div className="text-xs text-slate-400 leading-relaxed">
            Base atual: <span className="text-slate-200 font-semibold">{currentFiltersPayload.estado || 'todos os estados'}</span>
            {' · '}
            <span className="text-slate-200 font-semibold">{currentFiltersPayload.faculdade || 'todas as faculdades'}</span>
            {' · '}
            <span className="text-slate-200 font-semibold">{currentFiltersPayload.semestre || 'todos os semestres'}</span>
          </div>
          <button
            onClick={() => void loadComparison(filters)}
            disabled={loading || !accessToken}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all disabled:opacity-50"
          >
            Comparar agora
          </button>
        </div>
      </div>

      {!comparison && !loading && (
        <div className="glass-panel-heavy p-10 rounded-2xl border border-white/10 text-center space-y-3 shadow-xl text-slate-200">
          <BarChart3 size={40} className="text-blue-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-100">Carregue a comparação anônima</h3>
          <p className="text-xs text-slate-400 max-w-2xl mx-auto font-sans">
            Use os filtros acima para comparar seu desempenho com uma base anônima de usuários parecidos por estado, faculdade e semestre.
          </p>
        </div>
      )}

      {loading && (
        <div className="glass-panel-heavy p-10 rounded-2xl border border-white/10 text-center space-y-3 shadow-xl text-slate-200">
          <RefreshCw size={40} className="text-blue-400 mx-auto animate-spin" />
          <h3 className="text-sm font-bold text-slate-100">Processando base anônima...</h3>
          <p className="text-xs text-slate-400 max-w-2xl mx-auto font-sans">
            Estamos cruzando os usuários do recorte para calcular média, mediana, percentil e distribuição sem expor identidades.
          </p>
        </div>
      )}

      {comparison && !loading && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {comparison.warning && (
            <div className="bg-amber-950/20 border border-amber-500/20 text-amber-200 p-4 rounded-xl flex items-start gap-3 text-xs leading-relaxed shadow-lg">
              <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div>{comparison.warning}</div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="glass-card p-4 rounded-2xl border border-white/10">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sua média geral</span>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-3xl font-black text-white font-mono">{formatPercent(comparison.usuario.mediaGeral)}</span>
                <span className={`text-xs font-semibold ${cardTone(comparison.usuario.deltaParaMedia)}`}>
                  {comparison.usuario.deltaParaMedia >= 0 ? '+' : ''}{comparison.usuario.deltaParaMedia.toFixed(1)} vs grupo
                </span>
              </div>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-white/10">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Média do grupo</span>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-3xl font-black text-blue-300 font-mono">{formatPercent(comparison.cohort.mediaGeral)}</span>
                <span className="text-xs text-slate-400">{comparison.cohort.totalUsuarios} usuários</span>
              </div>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-white/10">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Seu percentil</span>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-3xl font-black text-emerald-300 font-mono">{comparison.usuario.percentil.toFixed(0)}°</span>
                <span className="text-xs text-slate-400">posição: {comparison.usuario.posicao || '-'}</span>
              </div>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-white/10">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Base filtrada</span>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-3xl font-black text-white font-mono">{comparison.cohort.totalSimulados}</span>
                <span className="text-xs text-slate-400">simulados</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="glass-panel-heavy p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-400" /> Distribuição do grupo
              </h3>
              <div className="space-y-3">
                {comparison.cohort.distribution.map((bucket) => (
                  <div key={bucket.faixa} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>{bucket.faixa}</span>
                      <span className="font-mono">{bucket.quantidade} ({bucket.percentual.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${Math.max(bucket.percentual, 3)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel-heavy p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Target size={16} className="text-emerald-400" /> Comparação por área
              </h3>
              <div className="space-y-4">
                {comparison.usuario.areaBenchmarks.map((area) => (
                  <div key={area.area} className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300 gap-3">
                      <span className="font-semibold text-slate-100">{area.area}</span>
                      <span className="font-mono">{area.mediaUsuario.toFixed(1)}% vs {area.mediaGrupo.toFixed(1)}%</span>
                    </div>
                    <div className="relative w-full h-3 rounded-full bg-white/5 overflow-hidden">
                      <div className="absolute inset-y-0 left-0 w-full bg-slate-800/60" />
                      <div className={`absolute inset-y-0 left-0 ${progressColor(area.delta)}`} style={{ width: `${Math.max(Math.min(area.mediaGrupo, 100), 0)}%` }} />
                      <div className="absolute inset-y-0 left-0 bg-white" style={{ width: `${Math.max(Math.min(area.mediaUsuario, 100), 0)}%`, opacity: 0.55 }} />
                    </div>
                    <div className={`text-[10px] font-semibold ${cardTone(area.delta)} uppercase tracking-wider`}>
                      {area.delta >= 0 ? 'Acima do grupo' : 'Abaixo do grupo'} por {Math.abs(area.delta).toFixed(1)} pontos
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-panel-heavy p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <GraduationCap size={16} className="text-blue-400" /> Leitura do recorte
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mediana do grupo</span>
                <div className="mt-2 text-2xl font-black text-white font-mono">{formatPercent(comparison.cohort.medianaGeral)}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Desvio padrão</span>
                <div className="mt-2 text-2xl font-black text-white font-mono">{formatPercent(comparison.cohort.desvioPadrao)}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Melhor média</span>
                <div className="mt-2 text-2xl font-black text-emerald-300 font-mono">{formatPercent(comparison.cohort.melhorGeral)}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pior média</span>
                <div className="mt-2 text-2xl font-black text-rose-300 font-mono">{formatPercent(comparison.cohort.piorGeral)}</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
