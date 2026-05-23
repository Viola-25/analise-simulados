/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnonymousComparisonAreaBenchmark, AnonymousComparisonDistributionBucket, AnonymousComparisonFilters, AnonymousComparisonResponse, GrandeArea, PerfilAluno, Simulado } from '../types';

export interface ComparisonRecord {
  user_id: string;
  perfil: PerfilAluno;
  simulados: Simulado[];
}

interface UserStats {
  user_id: string;
  perfil: PerfilAluno;
  mediaGeral: number;
  simuladosConsiderados: number;
  areaAverages: Record<GrandeArea, number>;
}

const FAIXAS = [
  { label: '0-49%', min: 0, max: 49.999 },
  { label: '50-59%', min: 50, max: 59.999 },
  { label: '60-69%', min: 60, max: 69.999 },
  { label: '70-79%', min: 70, max: 79.999 },
  { label: '80-89%', min: 80, max: 89.999 },
  { label: '90-100%', min: 90, max: 100 },
];

function normalizeText(value?: string | null) {
  return (value ?? '').trim().toLowerCase();
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function mean(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function stdDev(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const avg = mean(values);
  const variance = mean(values.map((value) => (value - avg) ** 2));
  return Math.sqrt(variance);
}

function percentileRank(values: number[], target: number) {
  if (values.length === 0) {
    return 0;
  }

  const lessOrEqual = values.filter((value) => value <= target).length;
  return (lessOrEqual / values.length) * 100;
}

function collectDistinctValues(records: ComparisonRecord[], selector: (perfil: PerfilAluno) => string) {
  const seen = new Map<string, string>();

  records.forEach((record) => {
    const rawValue = selector(record.perfil).trim();
    if (!rawValue) {
      return;
    }

    const key = normalizeText(rawValue);
    if (!key || key === 'não informado' || key === 'nao informado') {
      return;
    }

    if (!seen.has(key)) {
      seen.set(key, rawValue);
    }
  });

  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function getUserStats(record: ComparisonRecord): UserStats {
  const areaTotals: Record<GrandeArea, { acertos: number; total: number }> = {
    'Clínica Médica': { acertos: 0, total: 0 },
    'Cirurgia Geral': { acertos: 0, total: 0 },
    'Pediatria': { acertos: 0, total: 0 },
    'Ginecologia e Obstetrícia': { acertos: 0, total: 0 },
    'Medicina Preventiva': { acertos: 0, total: 0 },
  };

  const scores = record.simulados
    .map((simulado) => simulado.percentualAcertos)
    .filter((value) => Number.isFinite(value));

  record.simulados.forEach((simulado) => {
    Object.entries(simulado.desempenhoAreas).forEach(([area, desempenho]) => {
      areaTotals[area as GrandeArea].acertos += desempenho.acertos;
      areaTotals[area as GrandeArea].total += desempenho.total;
    });
  });

  return {
    user_id: record.user_id,
    perfil: record.perfil,
    mediaGeral: mean(scores),
    simuladosConsiderados: scores.length,
    areaAverages: {
      'Clínica Médica': areaTotals['Clínica Médica'].total ? (areaTotals['Clínica Médica'].acertos / areaTotals['Clínica Médica'].total) * 100 : 0,
      'Cirurgia Geral': areaTotals['Cirurgia Geral'].total ? (areaTotals['Cirurgia Geral'].acertos / areaTotals['Cirurgia Geral'].total) * 100 : 0,
      'Pediatria': areaTotals['Pediatria'].total ? (areaTotals['Pediatria'].acertos / areaTotals['Pediatria'].total) * 100 : 0,
      'Ginecologia e Obstetrícia': areaTotals['Ginecologia e Obstetrícia'].total ? (areaTotals['Ginecologia e Obstetrícia'].acertos / areaTotals['Ginecologia e Obstetrícia'].total) * 100 : 0,
      'Medicina Preventiva': areaTotals['Medicina Preventiva'].total ? (areaTotals['Medicina Preventiva'].acertos / areaTotals['Medicina Preventiva'].total) * 100 : 0,
    },
  };
}

function buildAreaBenchmarks(userAreaAverages: UserStats['areaAverages'], groupStats: UserStats[]): AnonymousComparisonAreaBenchmark[] {
  return (Object.keys(userAreaAverages) as GrandeArea[]).map((area) => {
    const groupAverage = mean(groupStats.map((item) => item.areaAverages[area]));
    const userAverage = userAreaAverages[area];

    return {
      area,
      mediaUsuario: round(userAverage),
      mediaGrupo: round(groupAverage),
      delta: round(userAverage - groupAverage),
    };
  });
}

function buildDistribution(values: number[]): AnonymousComparisonDistributionBucket[] {
  const total = values.length;

  return FAIXAS.map((faixa) => {
    const quantidade = values.filter((value) => value >= faixa.min && value <= faixa.max).length;
    return {
      faixa: faixa.label,
      quantidade,
      percentual: total > 0 ? round((quantidade / total) * 100) : 0,
    };
  });
}

export function buildAnonymousComparisonResponse(records: ComparisonRecord[], currentUserId: string, filters: AnonymousComparisonFilters): AnonymousComparisonResponse {
  const normalizedFilters = {
    estado: filters.estado?.trim() || null,
    faculdade: filters.faculdade?.trim() || null,
    semestre: filters.semestre?.trim() || null,
  };

  const availableFilters = {
    estados: collectDistinctValues(records, (perfil) => perfil.estado),
    faculdades: collectDistinctValues(records, (perfil) => perfil.faculdade),
    semestres: collectDistinctValues(records, (perfil) => perfil.semestre),
  };

  const allUserStats = records.map(getUserStats);
  const currentUserStats = allUserStats.find((item) => item.user_id === currentUserId);

  const cohortRecords = records.filter((record) => {
    const estado = normalizeText(record.perfil.estado);
    const faculdade = normalizeText(record.perfil.faculdade);
    const semestre = normalizeText(record.perfil.semestre);

    const estadoMatches = !normalizedFilters.estado || estado === normalizeText(normalizedFilters.estado);
    const faculdadeMatches = !normalizedFilters.faculdade || faculdade === normalizeText(normalizedFilters.faculdade);
    const semestreMatches = !normalizedFilters.semestre || semestre === normalizeText(normalizedFilters.semestre);

    return estadoMatches && faculdadeMatches && semestreMatches;
  });

  const cohortStats = cohortRecords.map(getUserStats).filter((item) => item.simuladosConsiderados > 0);
  const cohortAverages = cohortStats.map((item) => item.mediaGeral);

  const usuarioMedia = currentUserStats?.mediaGeral ?? 0;
  const usuarioAreaAverages = currentUserStats?.areaAverages ?? {
    'Clínica Médica': 0,
    'Cirurgia Geral': 0,
    'Pediatria': 0,
    'Ginecologia e Obstetrícia': 0,
    'Medicina Preventiva': 0,
  };

  const isIncluded = cohortRecords.some((record) => record.user_id === currentUserId);
  const percentile = percentileRank(cohortAverages, usuarioMedia);
  const position = cohortAverages.length > 0
    ? cohortAverages.filter((value) => value > usuarioMedia).length + 1
    : 0;

  return {
    availableFilters,
    appliedFilters: normalizedFilters as Required<AnonymousComparisonFilters>,
    cohort: {
      totalUsuarios: cohortStats.length,
      totalSimulados: cohortStats.reduce((sum, item) => sum + item.simuladosConsiderados, 0),
      mediaGeral: round(mean(cohortAverages)),
      medianaGeral: round(median(cohortAverages)),
      desvioPadrao: round(stdDev(cohortAverages)),
      melhorGeral: round(cohortAverages.length > 0 ? Math.max(...cohortAverages) : 0),
      piorGeral: round(cohortAverages.length > 0 ? Math.min(...cohortAverages) : 0),
      distribution: buildDistribution(cohortAverages),
      areaBenchmarks: buildAreaBenchmarks(
        usuarioAreaAverages,
        cohortStats.length > 0 ? cohortStats : allUserStats.filter((item) => item.simuladosConsiderados > 0),
      ),
    },
    usuario: {
      mediaGeral: round(usuarioMedia),
      posicao: position > 0 ? position : 0,
      totalUsuarios: cohortStats.length,
      percentil: round(percentile),
      deltaParaMedia: round(usuarioMedia - mean(cohortAverages)),
      simuladosConsiderados: currentUserStats?.simuladosConsiderados ?? 0,
      areaBenchmarks: buildAreaBenchmarks(
        usuarioAreaAverages,
        cohortStats.length > 0 ? cohortStats : allUserStats.filter((item) => item.simuladosConsiderados > 0),
      ),
    },
    currentUserIncluded: isIncluded,
    warning: !isIncluded && cohortStats.length > 0
      ? 'Seu perfil atual não entra no recorte filtrado; a comparação mostra a base selecionada, mas não considera você dentro dela.'
      : cohortStats.length === 0
        ? 'Nenhum usuário encontrado com esse recorte.'
        : undefined,
  };
}