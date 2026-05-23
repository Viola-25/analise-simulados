/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Simulado, GrandeArea, GRANDES_AREAS } from '../types';
import { computeSimuladoStats } from '../utils/stats';
import { Calendar, Tag, Clock, Award, Users, BookOpen, Save, X, PlusCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface SimuladoFormProps {
  simuladoEditando?: Simulado | null;
  onSave: (simulado: Simulado) => void;
  onCancel: () => void;
}

export default function SimuladoForm({ simuladoEditando, onSave, onCancel }: SimuladoFormProps) {
  const [nome, setNome] = useState('');
  const [data, setData] = useState('');
  const [tempoResolucaoMinutos, setTempoResolucaoMinutos] = useState<number>(240); // padrão de 4 horas
  
  // Áreas da medicina iniciadas vazias ou com padrão de 20 questões cada
  const [desempenhoAreas, setDesempenhoAreas] = useState<Record<GrandeArea, { acertos: number; total: number }>>({
    'Clínica Médica': { acertos: 0, total: 20 },
    'Cirurgia Geral': { acertos: 0, total: 20 },
    'Pediatria': { acertos: 0, total: 20 },
    'Ginecologia e Obstetrícia': { acertos: 0, total: 20 },
    'Medicina Preventiva': { acertos: 0, total: 20 },
  });

  // Dados adicionais (concorrência)
  const [mediaParticipantes, setMediaParticipantes] = useState<string>('');
  const [desvioPadrao, setDesvioPadrao] = useState<string>('');
  const [posicaoRanking, setPosicaoRanking] = useState<string>('');
  const [totalParticipantes, setTotalParticipantes] = useState<string>('');

  // Caderno de erros
  const [cadernoErros, setCadernoErros] = useState('');

  // Sincronizar com o simulado em edição (se houver)
  useEffect(() => {
    if (simuladoEditando) {
      setNome(simuladoEditando.nome);
      setData(simuladoEditando.data);
      setTempoResolucaoMinutos(simuladoEditando.tempoResolucaoMinutos);
      setDesempenhoAreas({ ...simuladoEditando.desempenhoAreas });
      setMediaParticipantes(simuladoEditando.mediaParticipantes?.toString() || '');
      setDesvioPadrao(simuladoEditando.desvioPadrao?.toString() || '');
      setPosicaoRanking(simuladoEditando.posicaoRanking?.toString() || '');
      setTotalParticipantes(simuladoEditando.totalParticipantes?.toString() || '');
      setCadernoErros(simuladoEditando.cadernoErros || '');
    } else {
      // Data padrão hoje
      const hoje = new Date().toISOString().split('T')[0];
      setData(hoje);
    }
  }, [simuladoEditando]);

  const handleUpdateArea = (area: GrandeArea, field: 'acertos' | 'total', val: number) => {
    setDesempenhoAreas(prev => {
      const updated = { ...prev };
      const current = { ...updated[area] };
      
      if (field === 'acertos') {
        // Garantir que acertos não excede total
        current.acertos = Math.max(0, Math.min(current.total, val));
      } else {
        current.total = Math.max(0, val);
        // Ajustar acertos caso total fique menor que acertos
        if (current.acertos > current.total) {
          current.acertos = current.total;
        }
      }
      
      updated[area] = current;
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const media = mediaParticipantes ? Number(mediaParticipantes) : undefined;
    const desvio = desvioPadrao ? Number(desvioPadrao) : undefined;
    const ranking = posicaoRanking ? Number(posicaoRanking) : undefined;
    const totalPart = totalParticipantes ? Number(totalParticipantes) : undefined;

    const stats = computeSimuladoStats(
      nome.trim(),
      data,
      tempoResolucaoMinutos,
      desempenhoAreas,
      media,
      desvio,
      ranking,
      totalPart,
      cadernoErros.trim()
    );

    const simuladoParaSalvar: Simulado = {
      ...stats,
      id: simuladoEditando ? simuladoEditando.id : crypto.randomUUID(),
    };

    onSave(simuladoParaSalvar);
  };

  // Soma de questões e acertos para feedback visual em tempo real
  const totalQuestoesSim = (Object.values(desempenhoAreas) as { acertos: number; total: number }[]).reduce((acc, curr) => acc + curr.total, 0);
  const totalAcertosSim = (Object.values(desempenhoAreas) as { acertos: number; total: number }[]).reduce((acc, curr) => acc + curr.acertos, 0);
  const percentualTempoReal = totalQuestoesSim > 0 ? (totalAcertosSim / totalQuestoesSim) * 100 : 0;
  const tempoMedioPorQuestao = totalQuestoesSim > 0 ? (tempoResolucaoMinutos * 60) / totalQuestoesSim : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="glass-card p-6 max-w-4xl mx-auto border border-white/10 shadow-2xl text-slate-100"
      id="simulado-form-wrapper"
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20" id="simulado-form-icon">
            <PlusCircle size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 uppercase tracking-wider" id="simulado-form-title">
              {simuladoEditando ? 'Editar Gabarito de Simulado' : 'Registrar Novo Simulado'}
            </h2>
            <p className="text-xs text-slate-400" id="simulado-form-desc">
              Preencha os acertos por disciplina para calcular seu desempenho detalhado
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors"
          id="btn-close-form"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" id="simulado-form-element">
        {/* PARTE A: Dados Globais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-white/3 p-4 rounded-xl border border-white/10">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1" htmlFor="nome-simulado">
              <Tag size={13} className="text-blue-450" /> Nome do Simulado
            </label>
            <input
              id="nome-simulado"
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Simulado Medgrupo R1 - 01"
              className="w-full px-3 py-2 rounded-lg border border-white/10 focus:border-blue-500 focus:bg-white/8 outline-none text-sm text-white bg-white/3 placeholder-slate-500 font-sans transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1" htmlFor="data-simulado">
              <Calendar size={13} className="text-blue-450" /> Data de Realização
            </label>
            <input
              id="data-simulado"
              type="date"
              required
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-white/10 focus:border-blue-500 focus:bg-white/8 outline-none text-sm text-white bg-white/3 placeholder-slate-500 font-sans transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1" htmlFor="tempo-simulado">
              <Clock size={13} className="text-blue-450" /> Tempo Total (Minutos)
            </label>
            <input
              id="tempo-simulado"
              type="number"
              min="10"
              max="600"
              required
              value={tempoResolucaoMinutos}
              onChange={(e) => setTempoResolucaoMinutos(Number(e.target.value))}
              placeholder="Ex: 240"
              className="w-full px-3 py-2 rounded-lg border border-white/10 focus:border-blue-500 focus:bg-white/8 outline-none text-sm text-white bg-white/3 placeholder-slate-500 font-sans transition-all"
            />
          </div>
        </div>

        {/* PARTE B: Desempenho por Grande Área */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10 pb-2">
            Desempenho por Disciplina (Grandes Áreas de Residência)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {GRANDES_AREAS.map((area) => {
              const { acertos, total } = desempenhoAreas[area];
              const percentual = total > 0 ? (acertos / total) * 100 : 0;
              
              // Cores dinâmicas para o feedback de desempenho
              let barColor = 'bg-rose-500';
              let ringColor = 'border-rose-500/15 bg-rose-500/5 text-rose-300';
              if (percentual >= 80) {
                barColor = 'bg-emerald-500';
                ringColor = 'border-emerald-500/15 bg-emerald-500/5 text-emerald-300';
              } else if (percentual >= 70) {
                barColor = 'bg-blue-500';
                ringColor = 'border-blue-500/15 bg-blue-500/5 text-blue-300';
              } else if (percentual >= 60) {
                barColor = 'bg-amber-500';
                ringColor = 'border-amber-500/15 bg-amber-500/5 text-amber-300';
              }

              return (
                <div key={area} className={`p-4 rounded-xl border flex flex-col justify-between ${ringColor}`}>
                  <div className="mb-2">
                    <span className="text-xs font-bold leading-tight block h-8 overflow-hidden text-slate-100">{area}</span>
                    <span className="text-[10px] font-mono opacity-80 font-bold">Aprov: {percentual.toFixed(0)}%</span>
                  </div>

                  <div className="space-y-2 mt-2">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-450 tracking-wide block" htmlFor={`questoes-${area}`}>Questões</label>
                      <input
                        id={`questoes-${area}`}
                        type="number"
                        min="0"
                        max="200"
                        value={total}
                        onChange={(e) => handleUpdateArea(area, 'total', Number(e.target.value))}
                        className="w-full px-2 py-1 rounded border border-white/10 text-xs font-bold text-slate-100 bg-[#0f172a]/95 outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-450 tracking-wide block" htmlFor={`acertos-${area}`}>Acertos</label>
                      <input
                        id={`acertos-${area}`}
                        type="number"
                        min="0"
                        max={total}
                        value={acertos}
                        onChange={(e) => handleUpdateArea(area, 'acertos', Number(e.target.value))}
                        className="w-full px-2 py-1 rounded border border-white/10 text-xs font-bold text-slate-100 bg-[#0f172a]/95 outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* Barra de progresso micro */}
                  <div className="w-full h-1.5 bg-[#0f172a] rounded-full overflow-hidden mt-3 border border-white/5">
                    <div className={`h-full ${barColor}`} style={{ width: `${percentual}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Placar Informativo em tempo real */}
        <div className="flex flex-col md:flex-row items-center justify-between p-4 bg-emerald-950/25 rounded-2xl border border-emerald-500/20 gap-4 text-emerald-200">
          <div className="text-xs font-sans">
            Aproveitamento Geral Estimador: <span className="text-base font-bold text-slate-100">{totalAcertosSim} de {totalQuestoesSim}</span> questões correspondente a <span className="text-base font-extrabold text-emerald-400 font-mono">{percentualTempoReal.toFixed(1)}%</span>
          </div>
          <div className="text-[11px] text-emerald-300 bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-500/10 leading-relaxed max-w-xs font-sans">
            Velocidade média calculada: <span className="font-bold underline text-emerald-250">
              {tempoMedioPorQuestao.toFixed(0)} seg/questão
            </span>. Recomenda-se manter abaixo de <span className="font-bold text-slate-100">144s/questão</span>.
          </div>
        </div>

        {/* PARTE C: Dados de Concorrência e Rankings (OPCIONAIS) */}
        <div className="space-y-3 bg-[#1e293b]/25 p-4 rounded-2xl border border-white/10">
          <div className="flex items-center gap-1.5 border-b border-white/15 pb-2 mb-2">
            <Users size={16} className="text-blue-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Estatísticas Correlacionais dos Participantes (Opcional)
            </h3>
          </div>
          <p className="text-xs text-slate-450 leading-relaxed mb-3">
            Preencher esses campos possibilita o cálculo do <span className="font-bold text-slate-200">Z-score acadêmico</span> e do <span className="font-bold text-slate-200">Percentil de Concorrência Estimado</span>. Isso mostra estatisticamente onde você se posiciona perante a concorrência geral.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1" htmlFor="media-participantes">
                Média Geral da Prova
              </label>
              <input
                id="media-participantes"
                type="number"
                step="0.1"
                min="0"
                max={totalQuestoesSim || 200}
                value={mediaParticipantes}
                onChange={(e) => setMediaParticipantes(e.target.value)}
                placeholder="Ex: 62.5"
                className="w-full px-3 py-1.5 rounded-lg border border-white/10 bg-white/3 focus:border-blue-500 outline-none text-sm text-slate-100 font-mono transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1" htmlFor="desvio-padrao">
                Desvio Padrão (SD)
              </label>
              <input
                id="desvio-padrao"
                type="number"
                step="0.1"
                min="0.1"
                max="50"
                value={desvioPadrao}
                onChange={(e) => setDesvioPadrao(e.target.value)}
                placeholder="Ex: 11.2"
                className="w-full px-3 py-1.5 rounded-lg border border-white/10 bg-white/3 focus:border-blue-500 outline-none text-sm text-slate-100 font-mono transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1" htmlFor="posicao-ranking">
                Sua Posição no Ranking
              </label>
              <input
                id="posicao-ranking"
                type="number"
                min="1"
                value={posicaoRanking}
                onChange={(e) => setPosicaoRanking(e.target.value)}
                placeholder="Ex: 84"
                className="w-full px-3 py-1.5 rounded-lg border border-white/10 bg-white/3 focus:border-blue-500 outline-none text-sm text-slate-100 font-mono transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1" htmlFor="total-participantes">
                Total de Candidatos
              </label>
              <input
                id="total-participantes"
                type="number"
                min="1"
                value={totalParticipantes}
                onChange={(e) => setTotalParticipantes(e.target.value)}
                placeholder="Ex: 1250"
                className="w-full px-3 py-1.5 rounded-lg border border-white/10 bg-white/3 focus:border-blue-500 outline-none text-sm text-slate-100 font-mono transition-all"
              />
            </div>
          </div>
        </div>

        {/* PARTE D: Caderno de Erros / Revisão Própria */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1" htmlFor="caderno-erros">
            <BookOpen size={13} className="text-blue-400" /> Caderno de Erros - Anotações Pedagógicas / Temas Falhos Para Revisar
          </label>
          <textarea
            id="caderno-erros"
            value={cadernoErros}
            onChange={(e) => setCadernoErros(e.target.value)}
            rows={3}
            placeholder="Registre aqui as questões ou temas mais complexos que você errou neste simulado. Isso alimentará o seu Caderno de Erros agrupado. Ex: Errei 3 questões de Clínica e Cirurgia sobre Pancreatite Aguda e critérios de Ranson; Errei G.O. sobre vacinação na gestante."
            className="w-full px-4 py-3 rounded-lg border border-white/10 focus:border-blue-500 focus:bg-white/8 outline-none text-sm text-slate-100 bg-[#0f172a]"
          />
        </div>

        {/* Botões do Rodapé */}
        <div className="flex justify-end gap-3 border-t border-white/10 pt-5">
          <button
            id="btn-cancelar-simulado"
            type="button"
            onClick={onCancel}
            className="px-5 py-2 hover:bg-white/5 text-slate-300 font-semibold text-sm rounded-xl transition-all border border-white/10"
          >
            Cancelar
          </button>
          
          <button
            id="btn-salvar-simulado"
            type="submit"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl transition-all shadow-md flex items-center gap-1.5 border border-blue-500/10"
          >
            <Save size={16} />
            {simuladoEditando ? 'Salvar Edição' : 'Registrar Desempenho'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
