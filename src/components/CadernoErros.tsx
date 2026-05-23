/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Simulado, GRANDES_AREAS, GrandeArea } from '../types';
import { BookOpen, Search, Filter, AlertTriangle, Calendar, ClipboardList } from 'lucide-react';
import { motion } from 'motion/react';

interface CadernoErrosProps {
  simulados: Simulado[];
}

export default function CadernoErros({ simulados }: CadernoErrosProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState<GrandeArea | 'Todas'>('Todas');

  const simuladosComErros = simulados.filter(
    (s) => s.cadernoErros && s.cadernoErros.trim().length > 0
  );

  // Filtragem inteligente de erros baseados na busca textual e área selecionada
  // Note: Como as anotações são textuais livres por simulado, buscamos por strings ou correlacionamos por pior área
  const filteredErros = simuladosComErros.filter((s) => {
    const textMatches = s.cadernoErros?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        s.nome.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedArea === 'Todas') return textMatches;

    // Se uma área específica for selecionada, mostramos se ela for a pior área desse simulado OU se o texto contiver o nome da área
    const éPiorArea = Object.entries(s.desempenhoAreas).reduce((pior, [area, stats]) => {
      const perc = stats.total > 0 ? (stats.acertos / stats.total) * 100 : 101;
      const piorPerc = pior.total > 0 ? (pior.acertos / pior.total) * 100 : 101;
      return perc < piorPerc ? { area, ...stats } : pior;
    }, { area: '', acertos: 0, total: 0 }).area === selectedArea;

    const contemMencaoArea = s.cadernoErros?.toLowerCase().includes(selectedArea.toLowerCase());

    return textMatches && (éPiorArea || contemMencaoArea);
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
      id="caderno-erros-section"
    >
      {/* Cabeçalho */}
      <div className="glass-panel-heavy p-6 rounded-2xl border border-white/10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="text-blue-400" /> Caderno de Erros Médico Agrupado
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Revisão ativa das fraquezas e tópicos reincidentes preenchidos no cadastro dos simulados
          </p>
        </div>

        {/* Estatística rápida do caderno */}
        <div className="text-right">
          <span className="text-xs font-semibold text-slate-400 block uppercase">Registros com Revisão</span>
          <span className="text-2xl font-black text-emerald-400 font-mono">{simuladosComErros.length}</span>
          <span className="text-xs text-slate-500"> de {simulados.length} simulados</span>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por tema ou simulado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 focus:border-blue-500 focus:bg-white/8 outline-none text-sm text-white bg-white/3 font-sans transition-all placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 bg-white/3 rounded-xl border border-white/10 px-3 py-1.5">
          <Filter size={16} className="text-slate-400 shrink-0" />
          <select
            id="filtro-materia"
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value as any)}
            className="w-full border-none focus:outline-none bg-transparent text-sm text-slate-200 font-medium py-1 cursor-pointer"
          >
            <option value="Todas" className="bg-[#0f172a] text-slate-200">Anotações Gerais (Todas)</option>
            {GRANDES_AREAS.map((area) => (
              <option key={area} value={area} className="bg-[#0f172a] text-slate-200">{area}</option>
            ))}
          </select>
        </div>

        <div className="bg-emerald-950/20 text-emerald-100 border border-emerald-500/20 rounded-xl px-4 py-2.5 flex items-start gap-2.5 text-xs">
          <AlertTriangle size={16} className="text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-emerald-300">Dica de Residência:</span> Revise este caderno semanalmente em sessões rápidas de 15 minutos de recordação ativa antes de iniciar novos blocos de questões.
          </div>
        </div>
      </div>

      {/* Lista das Anotações */}
      {filteredErros.length === 0 ? (
        <div className="glass-panel-heavy p-12 rounded-2xl text-center space-y-3 shadow-xl">
          <ClipboardList size={40} className="text-slate-500 mx-auto" />
          <h4 className="text-sm font-bold text-slate-300">Nenhum registro encontrado!</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto font-sans">
            Grave observações ou os temas das questões erradas no campo "Caderno de Erros" ao cadastrar ou editar seus simulados para alimentar este painel.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredErros.map((sim, index) => {
            // Encontrar pior área deste simulado para colocar uma tag
            const piorAreaSimulado = Object.entries(sim.desempenhoAreas).reduce((pior, [area, stats]) => {
              const perc = stats.total > 0 ? (stats.acertos / stats.total) * 100 : 101;
              const piorPerc = pior.total > 0 ? (pior.acertos / pior.total) * 100 : 101;
              return perc < piorPerc ? { area: area as GrandeArea, ...stats } : pior;
            }, { area: 'Clínica Médica' as GrandeArea, acertos: 0, total: 0 });

            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={sim.id}
                className="glass-card p-5 rounded-2xl border border-white/7 hover:border-white/15 hover:shadow-xl transition-all flex flex-col justify-between space-y-4 text-slate-100"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-bold text-sm text-slate-100 leading-snug line-clamp-2">{sim.nome}</span>
                    <span className="text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap">
                      {sim.percentualAcertos.toFixed(0)}% Geral
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium font-sans">
                    <Calendar size={12} className="text-slate-400" />
                    <span>Realizado em {sim.data.split('-').reverse().join('/')}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-rose-450 font-bold bg-[#f43f5e]/10 px-1.5 py-0.5 rounded border border-[#f43f5e]/15">
                      Gargalo: {piorAreaSimulado.area}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 bg-[#0f172a] rounded-xl p-3 border border-white/5 whitespace-pre-wrap leading-relaxed h-28 overflow-y-auto font-sans italic">
                    "{sim.cadernoErros}"
                  </div>
                </div>

                <div className="border-t border-white/8 pt-3 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Revisão Pendente</span>
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded-full">
                    Estudo Ativo
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
