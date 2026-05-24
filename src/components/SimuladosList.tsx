/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Simulado, GRANDES_AREAS, GrandeArea } from '../types';
import { Calendar, Tag, Clock, Award, Users, Trash2, Edit2, ChevronDown, ChevronUp, Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SimuladosListProps {
  simulados: Simulado[];
  onRequestDelete: (simulado: Simulado) => void;
  onEdit: (simulado: Simulado) => void;
  onAddNew: () => void;
}

export default function SimuladosList({ simulados, onRequestDelete, onEdit, onAddNew }: SimuladosListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'data-desc' | 'data-asc' | 'aproveitamento-desc' | 'aproveitamento-asc'>('data-desc');

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredAndSorted = simulados
    .filter((sim) => sim.nome.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'data-desc') {
        return new Date(b.data).getTime() - new Date(a.data).getTime();
      } else if (sortBy === 'data-asc') {
        return new Date(a.data).getTime() - new Date(b.data).getTime();
      } else if (sortBy === 'aproveitamento-desc') {
        return b.percentualAcertos - a.percentualAcertos;
      } else {
        return a.percentualAcertos - b.percentualAcertos;
      }
    });

  return (
    <div className="space-y-4" id="simulados-list-container">
      {/* Barra de Filtragem / Pesquisa */}
      <div className="glass-panel-heavy p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-1/2">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar simulado por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 focus:border-blue-500 focus:bg-white/8 outline-none text-sm text-white bg-white/3 font-sans transition-all placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2 bg-white/3 rounded-xl border border-white/10 px-3 py-1.5">
            <ArrowUpDown size={14} className="text-slate-400 shrink-0" />
            <select
              id="ordenacao"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border-none focus:outline-none bg-transparent text-sm text-slate-200 font-medium py-1 outline-none cursor-pointer"
            >
              <option value="data-desc" className="bg-[#0f172a] text-slate-200">Mais Recentes</option>
              <option value="data-asc" className="bg-[#0f172a] text-slate-200">Mais Antigos</option>
              <option value="aproveitamento-desc" className="bg-[#0f172a] text-slate-200">Melhor Aproveitamento</option>
              <option value="aproveitamento-asc" className="bg-[#0f172a] text-slate-200">Pior Aproveitamento</option>
            </select>
          </div>

          <button
            onClick={onAddNew}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl transition-all shadow-md flex items-center gap-1 shrink-0 border border-blue-500/10"
            id="btn-registar-simulado-list"
          >
            Cadastrar Simulado
          </button>
        </div>
      </div>

      {/* Lista de Registros */}
      {filteredAndSorted.length === 0 ? (
        <div className="glass-panel-heavy p-12 rounded-2xl text-center space-y-4 shadow-xl">
          <Calendar size={40} className="text-slate-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">Nenhum simulado registrado!</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto font-sans">
            {searchTerm ? 'Nenhum simulado corresponde à sua pesquisa.' : 'Comece registrando o seu primeiro simulado médico para destrinchar suas estatísticas.'}
          </p>
          <button
            onClick={onAddNew}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-xl shadow-md border border-blue-500/10"
          >
            Cadastrar Novo Simulado
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAndSorted.map((sim) => {
            const isExpanded = expandedId === sim.id;

            // Determinar classe de cor do percentual geral
            let badgeClass = 'bg-[#f43f5e]/10 border-[#f43f5e]/20 text-[#f43f5e] font-black font-mono';
            if (sim.percentualAcertos >= 80) {
              badgeClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-black font-mono';
            } else if (sim.percentualAcertos >= 70) {
              badgeClass = 'bg-blue-500/10 border-blue-500/20 text-blue-400 font-black font-mono';
            } else if (sim.percentualAcertos >= 60) {
              badgeClass = 'bg-amber-500/10 border-amber-500/20 text-amber-400 font-black font-mono';
            }

            return (
              <div
                key={sim.id}
                className="glass-card rounded-2xl border border-white/7 transition-all shadow-md overflow-hidden"
              >
                {/* Accordion Header */}
                <div
                  onClick={() => toggleExpand(sim.id)}
                  className="p-4 md:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/5 transition-all select-none"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className={`p-2 w-16 h-10 rounded-xl border shrink-0 hidden md:flex items-center justify-center ${badgeClass}`}>
                      <span className="text-sm font-black font-mono leading-none block">{sim.percentualAcertos.toFixed(0)}%</span>
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-100 truncate leading-snug">{sim.nome}</h4>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 font-medium font-sans">
                        <Calendar size={12} className="text-slate-400" />
                        <span>{sim.data.split('-').reverse().join('/')}</span>
                        <span className="text-slate-600">•</span>
                        <Clock size={12} className="text-slate-400" />
                        <span>{sim.tempoResolucaoMinutos} min</span>
                        <span className="text-slate-600">•</span>
                        <span>{sim.acertosTotais}/{sim.questoesTotais} q.</span>
                        {sim.ehSimuladoCursinho && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span className="text-emerald-300">{sim.origemSimuladoCursinho === 'proprio' ? 'Seu cursinho' : sim.cursinhoOrigemNome || 'Outro cursinho'}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`p-1 px-2.5 rounded-full text-xs font-bold md:hidden shrink-0 ${badgeClass}`}>
                      {sim.percentualAcertos.toFixed(0)}%
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(sim);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/5"
                        title="Editar simulado"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRequestDelete(sim);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/5"
                        title="Excluir simulado"
                      >
                        <Trash2 size={15} />
                      </button>
                      <span className="text-slate-600 hidden md:inline">|</span>
                      {isExpanded ? (
                        <ChevronUp size={18} className="text-slate-400" />
                      ) : (
                        <ChevronDown size={18} className="text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Accordion Body */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-white/8 bg-white/2 p-5 space-y-6"
                    >
                      {/* Grid de estatísticas por grande área no simulado */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gabarito por Grande Área</span>

                        {sim.ehSimuladoCursinho && (
                          <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-200">
                            Origem do simulado: <span className="font-semibold">{sim.origemSimuladoCursinho === 'proprio' ? 'Seu cursinho atual' : sim.cursinhoOrigemNome || 'Outro cursinho'}</span>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          {GRANDES_AREAS.map((area) => {
                            const { acertos, total } = sim.desempenhoAreas[area];
                            const perc = total > 0 ? (acertos / total) * 100 : 0;
                            
                            let barColor = 'bg-[#f43f5e]';
                            let textTone = 'text-rose-400';
                            if (perc >= 80) {
                              barColor = 'bg-emerald-500';
                              textTone = 'text-emerald-400';
                            } else if (perc >= 60) {
                              barColor = 'bg-amber-500';
                              textTone = 'text-amber-400';
                            }

                            return (
                              <div key={area} className="bg-white/3 p-3 rounded-xl border border-white/5 flex flex-col justify-between">
                                <span className="text-[10px] font-bold text-slate-300 block truncate">{area}</span>
                                
                                <div className="mt-2 flex items-baseline justify-between gap-1">
                                  <span className="text-xs text-slate-500 font-medium font-sans">Acertos</span>
                                  <span className="text-sm font-bold text-slate-150 font-mono">{acertos}/{total}</span>
                                </div>
                                <div className="mt-1.5 flex justify-between items-center text-[10px] font-mono font-bold">
                                  <span className={textTone}>{perc.toFixed(0)}%</span>
                                </div>
                                {/* Barra micro */}
                                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1.5">
                                  <div className={`h-full ${barColor}`} style={{ width: `${perc}%` }}></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Seção de Concorrência e Rankings (Se fornecidos) */}
                      {(sim.mediaParticipantes !== undefined || sim.posicaoRanking !== undefined) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-950/25 border border-blue-500/15 p-4 rounded-2xl">
                          <div className="flex items-start gap-2.5">
                            <Users size={16} className="text-blue-400 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <span className="text-xs font-bold text-blue-300 block uppercase">Avaliação Estatística comparativa</span>
                              
                              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                                {sim.mediaParticipantes !== undefined && (sim.desvioPadrao !== undefined || sim.desvioPadrao) ? (
                                  <>
                                    A média desta prova foi de <span className="font-bold text-white">{sim.mediaParticipantes} q.</span> com desvio padrão de <span className="font-bold text-white">{sim.desvioPadrao} q.</span>. Seu <span className="font-bold text-white">Z-score calculador é {sim.zScore?.toFixed(2)}</span>, o que estima que seu rendimento superou aproximadamente <span className="font-bold text-blue-300 underline font-mono text-xs">{sim.percentilEstimado?.toFixed(1)}%</span> dos candidatos participantes (percentil estimado).
                                  </>
                                ) : (
                                  <>
                                    Estatísticas comparativas ativas. Insira a média e desvio padrão para obter o seu ranking percentilar percentual.
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5 border-t md:border-t-0 md:border-l border-white/10 pt-2.5 md:pt-0 md:pl-4">
                            <Award size={16} className="text-blue-400 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <span className="text-xs font-bold text-blue-300 block uppercase">Posicionamento Real</span>
                              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                                {sim.posicaoRanking !== undefined && sim.totalParticipantes ? (
                                  <>
                                    Você ficou na posição <span className="font-bold font-mono text-blue-350">{sim.posicaoRanking}°</span> de um universo de <span className="font-bold font-mono text-slate-200">{sim.totalParticipantes}</span> concorrentes reais. Isso o posiciona fisicamente dentro dos <span className="font-extrabold text-blue-300 font-mono">{((sim.posicaoRanking / sim.totalParticipantes) * 100).toFixed(1)}%</span> melhores colocados.
                                  </>
                                ) : sim.posicaoRanking !== undefined ? (
                                  <>
                                    Seu ranking real registrado: posição <span className="font-bold text-white">{sim.posicaoRanking}°</span>.
                                  </>
                                ) : (
                                  <>
                                    O ranking oficial e o número total de participantes não foram informados para este simulado.
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Caderno de Erros */}
                      {sim.cadernoErros && (
                        <div className="space-y-1.5 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-950/20 text-emerald-100">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                            Caderno de Erros / anotações de Revisão
                          </span>
                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans italic">
                            "{sim.cadernoErros}"
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
