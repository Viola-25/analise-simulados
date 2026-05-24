/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Simulado, GrandeArea, GRANDES_AREAS } from '../types';

// Hastings approximation for standard normal cumulative distribution (percentile estimation from Z-score)
export function getPercentile(z: number): number {
  const t = 1.0 / (1.0 + 0.2316419 * Math.abs(z));
  const d = 0.39894228 * Math.exp(-z * z / 2.0);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  let value = 1.0 - p;
  if (z < 0) {
    value = p;
  }
  return value * 100;
}

export function computeSimuladoStats(
  nome: string,
  data: string,
  tempoResolucaoMinutos: number,
  desempenhoAreas: Record<GrandeArea, { acertos: number; total: number }>,
  mediaParticipantes?: number,
  desvioPadrao?: number,
  posicaoRanking?: number,
  totalParticipantes?: number,
  cadernoErros?: string,
  ehSimuladoCursinho?: boolean,
  origemSimuladoCursinho?: 'proprio' | 'outro' | null,
  cursinhoOrigemNome?: string,
): Omit<Simulado, 'id'> {
  let acertosTotais = 0;
  let questoesTotais = 0;

  GRANDES_AREAS.forEach((area) => {
    const areaStats = desempenhoAreas[area];
    if (areaStats) {
      acertosTotais += Number(areaStats.acertos || 0);
      questoesTotais += Number(areaStats.total || 0);
    }
  });

  const percentualAcertos = questoesTotais > 0 ? (acertosTotais / questoesTotais) * 100 : 0;

  let zScore: number | undefined = undefined;
  let percentilEstimado: number | undefined = undefined;

  if (mediaParticipantes !== undefined && desvioPadrao !== undefined && desvioPadrao > 0) {
    zScore = (acertosTotais - mediaParticipantes) / desvioPadrao;
    percentilEstimado = getPercentile(zScore);
  }

  return {
    nome,
    data,
    tempoResolucaoMinutos: Number(tempoResolucaoMinutos),
    desempenhoAreas: {
      'Clínica Médica': {
        acertos: Number(desempenhoAreas['Clínica Médica']?.acertos || 0),
        total: Number(desempenhoAreas['Clínica Médica']?.total || 0),
      },
      'Cirurgia Geral': {
        acertos: Number(desempenhoAreas['Cirurgia Geral']?.acertos || 0),
        total: Number(desempenhoAreas['Cirurgia Geral']?.total || 0),
      },
      'Pediatria': {
        acertos: Number(desempenhoAreas['Pediatria']?.acertos || 0),
        total: Number(desempenhoAreas['Pediatria']?.total || 0),
      },
      'Ginecologia e Obstetrícia': {
        acertos: Number(desempenhoAreas['Ginecologia e Obstetrícia']?.acertos || 0),
        total: Number(desempenhoAreas['Ginecologia e Obstetrícia']?.total || 0),
      },
      'Medicina Preventiva': {
        acertos: Number(desempenhoAreas['Medicina Preventiva']?.acertos || 0),
        total: Number(desempenhoAreas['Medicina Preventiva']?.total || 0),
      },
    },
    mediaParticipantes: mediaParticipantes !== undefined ? Number(mediaParticipantes) : undefined,
    desvioPadrao: desvioPadrao !== undefined ? Number(desvioPadrao) : undefined,
    posicaoRanking: posicaoRanking !== undefined ? Number(posicaoRanking) : undefined,
    totalParticipantes: totalParticipantes !== undefined ? Number(totalParticipantes) : undefined,
    cadernoErros: cadernoErros || '',
    ehSimuladoCursinho: Boolean(ehSimuladoCursinho),
    origemSimuladoCursinho: ehSimuladoCursinho ? (origemSimuladoCursinho || null) : null,
    cursinhoOrigemNome: ehSimuladoCursinho ? cursinhoOrigemNome?.trim() || undefined : undefined,
    acertosTotais,
    questoesTotais,
    percentualAcertos,
    zScore,
    percentilEstimado,
  };
}

export interface MetricasGlobais {
  totalSimulados: number;
  questoesTotaisFeitas: number;
  totalAcertosAcumulado: number;
  porcentagemAcertosGeral: number;
  tempoResolucaoTotalMinutos: number;
  tempoMedioPorQuestaoSegundos: number;
  melhorArea: { area: GrandeArea; percentual: number };
  piorArea: { area: GrandeArea; percentual: number };
  desempenhoPorArea: Record<GrandeArea, { acertos: number; total: number; percentual: number }>;
}

export function calcularMetricasGlobais(simulados: Simulado[]): MetricasGlobais {
  const desempenhoPorArea: Record<GrandeArea, { acertos: number; total: number; percentual: number }> = {
    'Clínica Médica': { acertos: 0, total: 0, percentual: 0 },
    'Cirurgia Geral': { acertos: 0, total: 0, percentual: 0 },
    'Pediatria': { acertos: 0, total: 0, percentual: 0 },
    'Ginecologia e Obstetrícia': { acertos: 0, total: 0, percentual: 0 },
    'Medicina Preventiva': { acertos: 0, total: 0, percentual: 0 },
  };

  let totalSimulados = simulados.length;
  let questoesTotaisFeitas = 0;
  let totalAcertosAcumulado = 0;
  let tempoResolucaoTotalMinutos = 0;

  simulados.forEach((s) => {
    questoesTotaisFeitas += s.questoesTotais;
    totalAcertosAcumulado += s.acertosTotais;
    tempoResolucaoTotalMinutos += s.tempoResolucaoMinutos;

    GRANDES_AREAS.forEach((area) => {
      const sArea = s.desempenhoAreas[area];
      if (sArea) {
        desempenhoPorArea[area].acertos += sArea.acertos;
        desempenhoPorArea[area].total += sArea.total;
      }
    });
  });

  GRANDES_AREAS.forEach((area) => {
    const areaAggregate = desempenhoPorArea[area];
    areaAggregate.percentual = areaAggregate.total > 0 ? (areaAggregate.acertos / areaAggregate.total) * 100 : 0;
  });

  const porcentagemAcertosGeral = questoesTotaisFeitas > 0 ? (totalAcertosAcumulado / questoesTotaisFeitas) * 100 : 0;
  const tempoMedioPorQuestaoSegundos = questoesTotaisFeitas > 0 ? (tempoResolucaoTotalMinutos * 60) / questoesTotaisFeitas : 0;

  // Encontrar melhor e pior área
  let melhorArea: GrandeArea = 'Clínica Médica';
  let piorArea: GrandeArea = 'Clínica Médica';
  let maxPercentual = -1;
  let minPercentual = 101;

  GRANDES_AREAS.forEach((area) => {
    const areaStats = desempenhoPorArea[area];
    // Se a área não tem questões feitas, ela não deve necessariamente ser computada nas pontas se houver outras com questões
    if (areaStats.total > 0) {
      if (areaStats.percentual > maxPercentual) {
        maxPercentual = areaStats.percentual;
        melhorArea = area;
      }
      if (areaStats.percentual < minPercentual) {
        minPercentual = areaStats.percentual;
        piorArea = area;
      }
    }
  });

  // Se nenhuma questão foi feita, dar padrões
  if (questoesTotaisFeitas === 0) {
    return {
      totalSimulados: 0,
      questoesTotaisFeitas: 0,
      totalAcertosAcumulado: 0,
      porcentagemAcertosGeral: 0,
      tempoResolucaoTotalMinutos: 0,
      tempoMedioPorQuestaoSegundos: 0,
      melhorArea: { area: 'Clínica Médica', percentual: 0 },
      piorArea: { area: 'Medicina Preventiva', percentual: 0 },
      desempenhoPorArea,
    };
  }

  return {
    totalSimulados,
    questoesTotaisFeitas,
    totalAcertosAcumulado,
    porcentagemAcertosGeral,
    tempoResolucaoTotalMinutos,
    tempoMedioPorQuestaoSegundos,
    melhorArea: { area: melhorArea, percentual: maxPercentual },
    piorArea: { area: piorArea, percentual: minPercentual },
    desempenhoPorArea,
  };
}
