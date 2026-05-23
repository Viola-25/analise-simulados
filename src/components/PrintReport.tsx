/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Simulado, PerfilAluno } from '../types';
import { calcularMetricasGlobais, MetricasGlobais } from '../utils/stats';
import { Award, Calendar, BookOpen, Clock, Activity, Target } from 'lucide-react';

interface PrintReportProps {
  simulados: Simulado[];
  perfil: PerfilAluno;
}

export default function PrintReport({ simulados, perfil }: PrintReportProps) {
  const stats: MetricasGlobais = calcularMetricasGlobais(simulados);
  const dataHoje = new Date().toLocaleDateString('pt-BR');

  // Ordenar simulados por data para a cronologia
  const cronologico = [...simulados].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  return (
    <div className="hidden print:block bg-white text-black p-8 font-sans text-xs w-[21cm] min-h-[29.7cm] mx-auto space-y-8" id="print-academic-report">
      {/* 1. Cabeçalho Acadêmico Principal */}
      <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900">Prontuário Médico de Desempenho e Metodologia</h1>
          <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mt-1">Plataforma de Análise de Simulados de Medicina</p>
        </div>
        <div className="text-right">
          <span className="font-semibold block text-[10px] text-gray-500 uppercase">Laudo Gerado Em</span>
          <span className="font-mono text-[11px] font-bold text-slate-800">{dataHoje}</span>
        </div>
      </div>

      {/* 2. Dados Biográficos do Aluno */}
      <div className="grid grid-cols-4 gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl">
        <div>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Estudante de Medicina</span>
          <span className="font-bold text-slate-800 text-sm">{perfil.nome}</span>
        </div>
        <div>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Especialidade Alvo</span>
          <span className="font-bold text-slate-800 text-sm">{perfil.especialidadeAlvo}</span>
        </div>
        <div>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Instituição Alvo</span>
          <span className="font-bold text-slate-800 text-sm">{perfil.instituicaoAlvo}</span>
        </div>
        <div>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Meta Consolidada</span>
          <span className="font-bold text-emerald-800 text-sm font-mono">{perfil.metaAcertosPercentual}% de acertos</span>
        </div>
      </div>

      {/* 3. Indicadores de Triagem Geral */}
      <div className="space-y-3">
        <h3 className="text-sm font-extrabold uppercase tracking-wide border-b border-slate-200 pb-1 flex items-center gap-1">
          <Activity size={14} className="text-slate-800" /> I. Sumário de Indicadores Gerais
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="border border-slate-100 p-3 rounded-lg text-center bg-slate-50/50">
            <span className="text-[9px] font-bold text-gray-400 uppercase block">Aproveitador Geral</span>
            <span className="text-xl font-bold text-slate-900 font-mono mt-1 block">
              {stats.porcentagemAcertosGeral.toFixed(1)}%
            </span>
          </div>

          <div className="border border-slate-100 p-3 rounded-lg text-center bg-slate-50/50">
            <span className="text-[9px] font-bold text-gray-400 uppercase block">Total de Questões</span>
            <span className="text-xl font-bold text-slate-900 font-mono mt-1 block">
              {stats.questoesTotaisFeitas} <span className="text-[10px] text-gray-400">q.</span>
            </span>
          </div>

          <div className="border border-slate-100 p-3 rounded-lg text-center bg-slate-50/50">
            <span className="text-[9px] font-bold text-gray-400 uppercase block">Cadência Média</span>
            <span className="text-xl font-bold text-slate-900 font-mono mt-1 block">
              {stats.tempoMedioPorQuestaoSegundos.toFixed(0)} <span className="text-[10px] text-gray-400">seg/q</span>
            </span>
          </div>

          <div className="border border-slate-100 p-3 rounded-lg text-center bg-slate-50/50">
            <span className="text-[9px] font-bold text-gray-400 uppercase block">Simulados Feitos</span>
            <span className="text-xl font-bold text-slate-900 font-mono mt-1 block">
              {stats.totalSimulados} <span className="text-[10px] text-gray-400">provas</span>
            </span>
          </div>
        </div>
      </div>

      {/* 4. Quadro de Desempenho por Áreas Clínicas */}
      <div className="space-y-3">
        <h3 className="text-sm font-extrabold uppercase tracking-wide border-b border-slate-200 pb-1 flex items-center gap-1">
          <Target size={14} className="text-slate-800" /> II. Balanceamento por Grandes Áreas de Residência
        </h3>
        <table className="w-full text-left border-collapse border border-slate-200" id="print-areas-table">
          <thead>
            <tr className="bg-slate-100 text-slate-800">
              <th className="p-2 border border-slate-200 font-bold">Disciplina / Área Médica</th>
              <th className="p-2 border border-slate-200 font-bold text-center">Acertos Totais</th>
              <th className="p-2 border border-slate-200 font-bold text-center">Total Questões</th>
              <th className="p-2 border border-slate-200 font-bold text-right">Aproveitamento (%)</th>
              <th className="p-2 border border-slate-200 font-bold text-right">Status vs Meta ({perfil.metaAcertosPercentual}%)</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(stats.desempenhoPorArea) as Array<keyof typeof stats.desempenhoPorArea>).map((area) => {
              const areaInfo = stats.desempenhoPorArea[area];
              const diff = areaInfo.percentual - perfil.metaAcertosPercentual;

              return (
                <tr key={area} className="hover:bg-slate-50/50">
                  <td className="p-2 border border-slate-200 font-medium text-slate-800">{area}</td>
                  <td className="p-2 border border-slate-200 text-center font-mono font-bold">{areaInfo.acertos}</td>
                  <td className="p-2 border border-slate-200 text-center font-mono">{areaInfo.total}</td>
                  <td className="p-2 border border-slate-200 text-right font-mono font-bold">{areaInfo.percentual.toFixed(1)}%</td>
                  <td className={`p-2 border border-slate-200 text-right font-bold ${diff >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {diff >= 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 5. Histórico da Bateria de Exames */}
      <div className="space-y-3">
        <h3 className="text-sm font-extrabold uppercase tracking-wide border-b border-slate-200 pb-1 flex items-center gap-1">
          <Calendar size={14} className="text-slate-800" /> III. Histórico Cronológico de Provas Registradas
        </h3>
        <table className="w-full text-left border-collapse border border-slate-200" id="print-history-table">
          <thead>
            <tr className="bg-slate-100 text-slate-800">
              <th className="p-2 border border-slate-200 font-bold">Data</th>
              <th className="p-2 border border-slate-200 font-bold">Nome do Simulado</th>
              <th className="p-2 border border-slate-200 font-bold text-center">Acertos</th>
              <th className="p-2 border border-slate-200 font-bold text-center">Tempo (min)</th>
              <th className="p-2 border border-slate-200 font-bold text-right">Aproveit.</th>
              <th className="p-2 border border-slate-200 font-bold text-center">Z-Score</th>
              <th className="p-2 border border-slate-200 font-bold text-right">Percentil Est.</th>
            </tr>
          </thead>
          <tbody>
            {cronologico.reverse().map((sim) => (
              <tr key={sim.id} className="hover:bg-slate-50/50">
                <td className="p-2 border border-slate-200 font-mono text-[10px]">{sim.data.split('-').reverse().join('/')}</td>
                <td className="p-2 border border-slate-200 font-bold text-slate-800">{sim.nome}</td>
                <td className="p-2 border border-slate-200 text-center font-mono">{sim.acertosTotais}/{sim.questoesTotais}</td>
                <td className="p-2 border border-slate-200 text-center font-mono">{sim.tempoResolucaoMinutos}</td>
                <td className="p-2 border border-slate-200 text-right font-mono font-bold">{sim.percentualAcertos.toFixed(1)}%</td>
                <td className="p-2 border border-slate-200 text-center font-mono">{sim.zScore !== undefined ? sim.zScore.toFixed(2) : '-'}</td>
                <td className="p-2 border border-slate-200 text-right font-mono font-bold">{sim.percentilEstimado !== undefined ? `${sim.percentilEstimado.toFixed(1)}°` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 6. Caderno de Erros Médico Consolidado */}
      {simulados.some(s => s.cadernoErros) && (
        <div className="space-y-3" style={{ pageBreakBefore: 'always' }}>
          <h3 className="text-sm font-extrabold uppercase tracking-wide border-b border-slate-200 pb-1 flex items-center gap-1">
            <BookOpen size={14} className="text-slate-800" /> IV. Caderno Clínico de Erros para Revisão Ativa
          </h3>
          <div className="space-y-4">
            {simulados
              .filter(s => s.cadernoErros && s.cadernoErros.trim().length > 0)
              .map((sim) => (
                <div key={sim.id} className="border border-slate-200 rounded-lg p-3 space-y-1.5 bg-slate-50/20">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-500">
                    <span>{sim.nome}</span>
                    <span>{sim.data.split('-').reverse().join('/')}</span>
                  </div>
                  <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-serif italic">
                    "{sim.cadernoErros}"
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 7. Footer de Validade Científica */}
      <div className="text-center text-[9px] text-gray-400 border-t border-slate-200 pt-6 mt-12 space-y-1">
        <p className="font-bold uppercase tracking-widest">Documento Acadêmico Reservado - Preparação R1</p>
        <p>A estimação de percentis e Z-score é baseada no modelo de probabilidade de distribuição normal cumulativa estandarizada obtida a partir do tamanho da população informada.</p>
        <p className="font-mono text-[8px]">MD-ANALISE-SIMULADOS-CONCORRENCIA v1.0.0</p>
      </div>
    </div>
  );
}
