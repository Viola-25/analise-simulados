/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Simulado, PerfilAluno, RespostaAnaliseIA, GrandeArea } from '../types';
import { Sparkles, Brain, Loader2, AlertCircle, RefreshCw, Calendar, CheckSquare, Target, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AiInsightsProps {
  simulados: Simulado[];
  perfil: PerfilAluno;
}

export default function AiInsights({ simulados, perfil }: AiInsightsProps) {
  const [loading, setLoading] = useState(false);
  const [analise, setAnalise] = useState<RespostaAnaliseIA | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Carregar análise anterior salva no localStorage
  useEffect(() => {
    const cached = localStorage.getItem('med_simulados_ai_insights');
    if (cached) {
      try {
        setAnalise(JSON.parse(cached));
      } catch (e) {
        console.error('Falha ao restaurar insights da IA salvos.', e);
      }
    }
  }, []);

  const handleFetchAiAnalysis = async () => {
    if (simulados.length === 0) {
      setErrorMsg('Cadastre pelo menos um simulado para permitir que a IA analise estatisticamente o seu desempenho.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/analyze-performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          perfil,
          simulados,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro desconhecido na comunicação com a Inteligência Artificial.');
      }

      const data: RespostaAnaliseIA = await response.json();
      setAnalise(data);
      localStorage.setItem('med_simulados_ai_insights', JSON.stringify(data));
    } catch (err: any) {
      console.error('Error fetching AI analysis:', err);
      setErrorMsg(err?.message || 'Falha na conexão com o servidor de IA. Verifique se o servidor está ativo.');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityStyles = (prioridade: string) => {
    switch (prioridade) {
      case 'Crítico':
        return {
          bg: 'bg-rose-500/10 border-rose-500/20',
          text: 'text-rose-300',
          badge: 'bg-rose-500/20 text-rose-200 border-rose-500/35',
          dot: 'bg-rose-400',
        };
      case 'Atenção':
        return {
          bg: 'bg-amber-500/10 border-amber-500/20',
          text: 'text-amber-300',
          badge: 'bg-amber-500/20 text-amber-200 border-amber-500/35',
          dot: 'bg-amber-400',
        };
      case 'Adequado':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/20',
          text: 'text-emerald-300',
          badge: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/35',
          dot: 'bg-emerald-400',
        };
      case 'Excelente':
        return {
          bg: 'bg-blue-500/10 border-blue-500/20',
          text: 'text-blue-300',
          badge: 'bg-blue-500/20 text-blue-200 border-blue-500/35',
          dot: 'bg-blue-400',
        };
      default:
        return {
          bg: 'bg-white/5 border-white/10',
          text: 'text-slate-300',
          badge: 'bg-white/10 text-slate-200 border-white/15',
          dot: 'bg-slate-500',
        };
    }
  };

  return (
    <div className="space-y-6" id="ai-insights-container">
      {/* SEÇÃO 1: Boas vindas ou Solicitação de Análise */}
      <div className="glass-panel-heavy p-6 rounded-2xl border border-white/10 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 text-slate-100">
        <div className="flex items-start gap-4 max-w-2xl">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20 shrink-0">
            <Sparkles size={24} className="animate-pulse" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              Check-up Pedagógico via Inteligência Artificial
            </h2>
            <p className="text-xs text-slate-400">
              A Groq analisa seus pontos fracos históricos por disciplina e monta um plano de revisão ativa focado na concorrência da sua instituição alvo: <span className="font-bold text-blue-400">{perfil.instituicaoAlvo}</span>.
            </p>
          </div>
        </div>

        <button
          onClick={handleFetchAiAnalysis}
          disabled={loading || simulados.length === 0}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl transition-all shadow-md border border-blue-500/10 flex items-center gap-2 shrink-0 disabled:opacity-45"
          id="btn-fetch-ai"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Sincronizando estatísticas...
            </>
          ) : (
            <>
              <Brain size={16} />
              {analise ? 'Recalcular Análise IA' : 'Solicitar Diagnóstico IA'}
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="bg-rose-950/20 border border-rose-500/20 text-rose-300 p-4 rounded-xl flex items-start gap-3 text-xs leading-relaxed shadow-lg">
          <ShieldAlert size={18} className="text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Falha no Check-up:</span> {errorMsg}
          </div>
        </div>
      )}

      {/* ÁREA DE CARREGAMENTO */}
      {loading && (
        <div className="glass-panel-heavy p-12 rounded-2xl border border-white/10 text-center space-y-4 shadow-xl animate-pulse text-slate-100">
          <Loader2 size={40} className="text-blue-400 animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-slate-200">A IA está processando sua ficha epidemiológica de estudos...</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto font-sans">
            Estamos cruzando seus acertos em Clínica, Cirurgia, G.O., Pediatria e Preventiva para traçar as recorrências mais prováveis da prova de residência {perfil.instituicaoAlvo}. Isso pode levar de 5 a 10 segundos.
          </p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {!loading && analise && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
            id="ai-analysis-results"
          >
            {/* SEÇÃO 2: Diagnóstico Geral */}
            <div className="glass-card p-6 rounded-2xl border border-white/7 shadow-xl space-y-3 text-slate-100">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider border-b border-white/10 pb-2.5 flex items-center gap-2">
                <Target size={16} className="text-blue-400" /> Diagnóstico de Tendência e Gestão Pedagógica
              </h3>
              <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-sans border-l-4 border-blue-500 pl-4 py-1 italic">
                  {analise.diagnosticoGeral}
              </div>
            </div>

            {/* SEÇÃO 3: Análise Individual por Disciplina */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert size={16} className="text-slate-400" /> Triagem Diagnóstica de Grandes Áreas
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {analise.analiseAreas.map((item, index) => {
                  const style = getPriorityStyles(item.grauPrioridade);

                  return (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      key={item.area}
                      className={`p-4 rounded-xl border flex flex-col justify-between ${style.bg} ${style.text}`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-bold leading-tight block h-8 overflow-hidden text-slate-100">
                            {item.area}
                          </span>
                          <span className={`text-[9px] font-bold border rounded-full px-2 py-0.5 whitespace-nowrap uppercase ${style.badge}`}>
                            {item.grauPrioridade}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-300 leading-relaxed font-sans line-clamp-4 h-20 mb-4 overflow-y-auto">
                          {item.diagnostico}
                        </p>
                      </div>

                      {/* Temas Recomendados para Estudar */}
                      <div className="space-y-1.5 pt-3 border-t border-white/10">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Temas Críticos</span>
                        <div className="flex flex-wrap gap-1">
                          {item.temasRecomendados.map((tema) => (
                            <span
                              key={tema}
                              className="text-[9px] font-bold bg-[#0f172a] border border-white/10 hover:border-blue-500 transition-colors text-slate-300 px-1.5 py-0.5 rounded truncate max-w-full block"
                              title={tema}
                            >
                              {tema}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* SEÇÃO 4: Prescrição / Plano de Ação Metodológico */}
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
              <div className="bg-[#0f172a]/80 text-white p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare size={18} /> Prescrição de Condutas de Estudo Ativo
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Realize as condutas abaixo ao longo das próximas semanas para alavancar sua curva de acertos e sanar os gargalos identificados na triagem:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analise.planoDeAcao.map((passo, idx) => (
                    <div key={idx} className="flex gap-3 bg-white/3 border border-white/5 rounded-xl p-3 items-start">
                      <span className="w-5 h-5 bg-blue-500/10 text-blue-300 border border-blue-500/30 rounded-full font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed font-sans">
                        {passo}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {!loading && !analise && simulados.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-panel-heavy p-12 rounded-2xl border border-white/10 text-center space-y-3 shadow-xl text-slate-200"
          >
            <Brain size={40} className="text-blue-400 mx-auto animate-bounce" />
            <h3 className="text-sm font-bold text-slate-100">Seu perfil pedagógico está pronto para diagnóstico!</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-sans">
              Clique no botão "Solicitar Diagnóstico IA" acima para fazer o check-up integral dos seus simulados e receber uma análise e planejamento de medicina elaborados sob medida pela Groq.
            </p>
          </motion.div>
        )}

        {simulados.length === 0 && (
          <div className="glass-panel-heavy p-12 rounded-2xl border border-white/10 text-center space-y-3 shadow-xl text-slate-200">
            <ShieldAlert size={40} className="text-slate-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-300 font-sans">Nenhum simulado cadastrado ainda!</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-sans">
              Cadastre o seu primeiro simulado médico para destravar a triagem diagnóstica por inteligência artificial.
            </p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
