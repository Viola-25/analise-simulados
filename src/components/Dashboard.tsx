/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Simulado, PerfilAluno, GRANDES_AREAS, GrandeArea } from '../types';
import { calcularMetricasGlobais, MetricasGlobais } from '../utils/stats';
import { Award, Clock, BookOpen, ChevronUp, ChevronDown, CheckCircle2, TrendingUp, AlertTriangle, Target } from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  simulados: Simulado[];
  perfil: PerfilAluno;
}

export default function Dashboard({ simulados, perfil }: DashboardProps) {
  const [hoveredSimuladoIdx, setHoveredSimuladoIdx] = useState<number | null>(null);

  const stats: MetricasGlobais = calcularMetricasGlobais(simulados);

  // Ordenar simulados por data para os gráficos temporais
  const simuladosOrdenados = [...simulados].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  // Renderizador de Gráfico de Linha de Evolução Temporal (% Acertos) usando SVG puro
  const renderGraficoEvolucao = () => {
    if (simuladosOrdenados.length === 0) {
      return (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
          Aguardando registros de simulados para desenhar a curva clínica de evolução...
        </div>
      );
    }

    const width = 600;
    const height = 220;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Pontos estruturais de dados (X: índice do simulado, Y: percentual)
    const count = simuladosOrdenados.length;
    const points = simuladosOrdenados.map((sim, idx) => {
      const x = paddingLeft + (count > 1 ? (idx / (count - 1)) * chartWidth : chartWidth / 2);
      const y = paddingTop + chartHeight - (sim.percentualAcertos / 100) * chartHeight;
      return { x, y, sim, idx };
    });

    // Gerar string de linha d="..." de SVG
    let linePath = '';
    if (points.length > 1) {
      linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    } else if (points.length === 1) {
      linePath = `M ${paddingLeft} ${points[0].y} L ${paddingLeft + chartWidth} ${points[0].y}`;
    }

    // Linha de Meta (%)
    const yMeta = paddingTop + chartHeight - (perfil.metaAcertosPercentual / 100) * chartHeight;
    const metaPath = `M ${paddingLeft} ${yMeta} L ${paddingLeft + chartWidth} ${yMeta}`;

    return (
      <div className="relative" id="chart-evolucao-container">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none font-sans">
          {/* Grade Horizontal (25%, 50%, 75%, 100%) */}
          {[25, 50, 75, 100].map((val) => {
            const yGrade = paddingTop + chartHeight - (val / 100) * chartHeight;
            return (
              <g key={val} className="opacity-30">
                <line x1={paddingLeft} y1={yGrade} x2={paddingLeft + chartWidth} y2={yGrade} stroke="#E2E8F0" strokeDasharray="4 4" />
                <text x={paddingLeft - 8} y={yGrade + 4} textAnchor="end" className="text-[10px] fill-gray-400 font-mono font-medium">{val}%</text>
              </g>
            );
          })}

          <text x={paddingLeft - 8} y={paddingTop + chartHeight + 4} textAnchor="end" className="text-[10px] fill-gray-400 font-mono font-medium">0%</text>

          {/* Linha da Meta do Aluno */}
          <path d={metaPath} stroke="#10B981" strokeWidth="1.5" strokeDasharray="3 3" />
          <text x={paddingLeft + chartWidth - 10} y={yMeta - 6} textAnchor="end" className="text-[9px] fill-emerald-600 font-semibold uppercase tracking-wider">
            Meta ({perfil.metaAcertosPercentual}%)
          </text>

          {/* Curva de Desempenho Realizada */}
          {simuladosOrdenados.length > 0 && (
            <>
              {/* Efeito de preenchimento sobre a área abaixo da linha */}
              {points.length > 1 && (
                <path
                  d={`${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`}
                  fill="url(#gradient-desempenho)"
                  className="opacity-5"
                />
              )}
              <path d={linePath} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}

          {/* Definições de Gradientes */}
          <defs>
            <linearGradient id="gradient-desempenho" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Círculos dos Pontos */}
          {points.map((pt) => {
            const isHovered = hoveredSimuladoIdx === pt.idx;
            const radius = isHovered ? 8 : 4.5;
            const circleStroke = isHovered ? '#1E3A8A' : '#FFFFFF';
            const strokeWidth = isHovered ? 3 : 1.5;
            
            return (
              <g key={pt.sim.id} className="cursor-pointer"
                 onMouseEnter={() => setHoveredSimuladoIdx(pt.idx)}
                 onMouseLeave={() => setHoveredSimuladoIdx(null)}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={radius}
                  fill="#2563EB"
                  stroke={circleStroke}
                  strokeWidth={strokeWidth}
                  className="transition-all duration-150"
                />
                
                {/* Legendas horizontais de data */}
                <text x={pt.x} y={paddingTop + chartHeight + 16} textAnchor="middle" className="text-[9px] fill-gray-400 font-medium">
                  {pt.sim.data.split('-').slice(1, 3).reverse().join('/')}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip Dinâmico Absoluto */}
        {hoveredSimuladoIdx !== null && simuladosOrdenados[hoveredSimuladoIdx] && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-lg px-3 py-2 text-xs shadow-md border border-slate-700 pointer-events-none z-10 space-y-1 w-48 transition-all">
            <p className="font-bold truncate text-slate-100">{simuladosOrdenados[hoveredSimuladoIdx].nome}</p>
            <div className="flex justify-between items-center text-slate-300">
              <span>Nota:</span>
              <span className="font-mono font-bold text-blue-300">
                {simuladosOrdenados[hoveredSimuladoIdx].acertosTotais}/{simuladosOrdenados[hoveredSimuladoIdx].questoesTotais} ({simuladosOrdenados[hoveredSimuladoIdx].percentualAcertos.toFixed(1)}%)
              </span>
            </div>
            {simuladosOrdenados[hoveredSimuladoIdx].percentilEstimado ? (
              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span>Percentil:</span>
                <span className="font-mono font-bold text-emerald-300">
                  {simuladosOrdenados[hoveredSimuladoIdx].percentilEstimado.toFixed(1)}°
                </span>
              </div>
            ) : null}
            <p className="text-[10px] text-slate-400 text-right">{simuladosOrdenados[hoveredSimuladoIdx].data}</p>
          </div>
        )}
      </div>
    );
  };

  // Renderizador de Gráfico de Barras por Área
  const renderBarrasAreas = () => {
    return (
      <div className="space-y-4" id="chart-areas-container">
        {GRANDES_AREAS.map((area) => {
          const areaData = stats.desempenhoPorArea[area];
          const percentual = areaData.percentual;
          const meta = perfil.metaAcertosPercentual;
          let colorClass = 'bg-red-500';
          let borderLightClass = 'bg-red-100/30';
          let textTone = 'text-red-700';

          if (percentual >= meta) {
            colorClass = 'bg-emerald-600';
            borderLightClass = 'bg-emerald-100/30';
            textTone = 'text-emerald-700';
          } else if (percentual >= meta - 10) {
            colorClass = 'bg-amber-500';
            borderLightClass = 'bg-amber-100/30';
            textTone = 'text-amber-700';
          }

          return (
            <div key={area} className="space-y-1 text-sm">
              <div className="flex justify-between font-medium">
                <span className="text-gray-700 text-xs font-semibold flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${colorClass}`}></span>
                  {area}
                </span>
                <span className="text-gray-500 text-xs font-mono">
                  <span className="font-bold text-gray-800">{areaData.acertos}</span> acertos de {areaData.total} ({percentual.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden relative">
                {/* Linha vertical tracejada indicando o target da meta */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-emerald-600 z-10" style={{ left: `${meta}%` }} title={`Sua meta de ${meta}%`}></div>
                
                <div
                  className={`h-full ${colorClass} transition-all duration-500`}
                  style={{ width: `${percentual}%` }}
                ></div>
              </div>
            </div>
          );
        })}
        <div className="flex items-center justify-end gap-3 text-[10px] text-gray-400 uppercase font-bold tracking-wider pt-2">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-1 bg-emerald-600 block"></span> Acima/Na Meta
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-1 bg-amber-500 block"></span> Próximo à Meta
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-1 bg-red-500 block"></span> Crítico / Fora da Meta
          </span>
          <span className="flex items-center gap-1">
            <span className="w-0.5 h-3 bg-emerald-600 block"></span> Linha de Target
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" id="dashboard-tab-container">
      {/* SEÇÃO 1: Cards Rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between text-slate-100 transition-all duration-300" id="metric-card-total">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Simulados Feitos</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-black text-white font-mono">{stats.totalSimulados}</span>
            <span className="text-xs text-slate-400">provas</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Histórico total cadastrado</span>
        </div>

        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between text-slate-100 transition-all duration-300" id="metric-card-questoes">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Questões Feitas</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-black text-white font-mono">{stats.questoesTotaisFeitas}</span>
            <span className="text-xs text-slate-400">resolvidas</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Aproveitadas por matéria</span>
        </div>

        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between text-slate-100 transition-all duration-300" id="metric-card-aproveitamento">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Aproveitamento Geral</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-black text-emerald-400 font-mono">{stats.porcentagemAcertosGeral.toFixed(1)}%</span>
          </div>
          
          <div className="mt-1 flex items-center gap-1 text-[10px]">
            {stats.porcentagemAcertosGeral >= perfil.metaAcertosPercentual ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-0.5"><CheckCircle2 size={10} /> Meta Superada</span>
            ) : (
              <span className="text-amber-400 font-semibold flex items-center gap-0.5"><AlertTriangle size={10} /> { (perfil.metaAcertosPercentual - stats.porcentagemAcertosGeral).toFixed(1) }% abaixo</span>
            )}
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between text-slate-100 transition-all duration-300" id="metric-card-melhor">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Melhor Área</span>
          <div className="mt-2">
            <span className="text-xs font-extrabold text-emerald-400 truncate block h-8 leading-tight">
              {simulados.length > 0 ? stats.melhorArea.area : 'Clínica Médica'}
            </span>
            <span className="text-2xl font-black text-emerald-400 font-mono">{stats.melhorArea.percentual.toFixed(0)}%</span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between text-slate-100 transition-all duration-300" id="metric-card-pior">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Foco de Atenção</span>
          <div className="mt-2">
            <span className="text-xs font-extrabold text-[#f43f5e] truncate block h-8 leading-tight">
              {simulados.length > 0 ? stats.piorArea.area : 'Pediatria'}
            </span>
            <span className="text-2xl font-black text-[#f43f5e] font-mono">{stats.piorArea.percentual.toFixed(0)}%</span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between text-slate-100 transition-all duration-300" id="metric-card-tempo">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cadência de Prova</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-black text-white font-mono">
              {stats.tempoMedioPorQuestaoSegundos.toFixed(0)}
            </span>
            <span className="text-xs text-slate-400">s/questão</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Ideal: &lt;144s (2.4 min)</span>
        </div>
      </div>

      {/* SEÇÃO 2: Gráficos Lado a Lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Curva Clinica */}
        <div className="glass-panel-heavy p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp size={16} className="text-blue-400" /> Curva de Evolução
              </h3>
              <p className="text-xs text-slate-400">Aproveitamento geral obtido por data de simulado</p>
            </div>
            <div className="text-[10px] text-slate-500 uppercase font-bold font-mono">Linha temporal</div>
          </div>
          {renderGraficoEvolucao()}
        </div>

        {/* Desempenho por Area */}
        <div className="glass-panel-heavy p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Target size={16} className="text-emerald-400" /> Aproveitamento por Metodologia
              </h3>
              <p className="text-xs text-slate-400">Médias acumuladas comparadas com a sua meta de {perfil.metaAcertosPercentual}%</p>
            </div>
            <div className="text-[10px] text-slate-500 uppercase font-bold font-mono">Colunas médicas</div>
          </div>
          {renderBarrasAreas()}
        </div>
      </div>

      {/* SEÇÃO 3: Análise Clínica Própria / Checklist Diagnóstico */}
      <div className="bg-emerald-950/20 backdrop-blur-xl p-6 rounded-2xl border border-emerald-500/20 space-y-4">
        <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
          <Award size={18} className="text-emerald-400" /> Análise de Estudos e Alocação de Tempo
        </h3>
        
        {simulados.length === 0 ? (
          <p className="text-xs text-emerald-200/80 leading-relaxed">
            Cadastre pelo menos 1 simulado de residência médica para obter sua prescrição acadêmica de forma imediata! Suas fraquezas serão listadas aqui com base nos notas.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-slate-250">
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-emerald-400 uppercase block">1. Diagnóstico de Pontos Falhos</span>
              <p className="text-xs text-slate-300 leading-relaxed">
                Seu aproveitamento mais fraco se encontra em <span className="font-extrabold text-[#f43f5e] underline">{stats.piorArea.area} ({stats.piorArea.percentual.toFixed(1)}%)</span>, estando abaixo do seu target desejável de {perfil.metaAcertosPercentual}%. Essa disciplina deve passar a encabeçar as revisões ativas imediatas e engenharia reversa por provas anteriores.
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold text-emerald-400 uppercase block">2. Ritmo e Gestão de Tempo</span>
              <p className="text-xs text-slate-300 leading-relaxed">
                Você gasta em média <span className="font-bold text-white">{stats.tempoMedioPorQuestaoSegundos.toFixed(0)} segundos</span> por questão. Para provas nacionais de residência (Amp, Enare, SUS), estimar no máximo <span className="font-bold text-white">2.4 minutos</span> por questão permite ter margem de segurança de 30 minutos finais exclusivamente para preenchimento de gabarito físico.
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold text-emerald-400 uppercase block">3. Reativação da Curva de Aprendizado</span>
              <p className="text-[#9bf4d5] text-xs leading-relaxed">
                Com base no seu aproveitamento médio geral de <span className="font-bold text-white">{stats.porcentagemAcertosGeral.toFixed(1)}%</span>, estime realizar de <span className="font-bold text-white">30 a 50 flashcards estruturados por dia</span> focando principalmente nos seus erros de {stats.piorArea.area} para alavancar sua base de recordação ativa.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
