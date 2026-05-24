/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnonymousComparisonAreaBenchmark, AnonymousComparisonDistributionBucket, AnonymousComparisonFilters, AnonymousComparisonResponse, GrandeArea, PerfilAluno, Simulado } from '../types';

export interface ComparisonRecord {
  user_id: string;
  perfil: PerfilAluno | null | undefined;
  simulados: Simulado[] | null | undefined;
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

const CURSINHO_CORRECAO_ALPHA = 0.65;
const CURSINHO_CORRECAO_AMOSTRA_MINIMA = 5;
const CURSINHO_CORRECAO_CAP = 8;

function normalizeText(value?: string | null) {
  return (value ?? '').trim().toLowerCase();
}

function normalizePerfil(perfil?: PerfilAluno | null) {
  return (perfil && typeof perfil === 'object' ? perfil : {}) as PerfilAluno;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parseFazCursinho(value: unknown): 'sim' | 'nao' | null {
  if (value === 'sim' || value === true) {
    return 'sim';
  }

  if (value === 'nao' || value === false) {
    return 'nao';
  }

  return null;
}

function hasValidCursinho(perfil: PerfilAluno) {
  const nome = (perfil.cursinhoResidencia || '').trim();
  const key = normalizeText(nome);
  return Boolean(nome) && key !== 'não faço cursinho' && key !== 'nao faço cursinho' && key !== 'não informado' && key !== 'nao informado';
}

function getPerfilCursinho(perfil: PerfilAluno) {
  if (!perfil.fazCursinhoResidencia || !hasValidCursinho(perfil)) {
    return null;
  }

  return (perfil.cursinhoResidencia || '').trim();
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
    const rawValue = selector(normalizePerfil(record.perfil));
    if (typeof rawValue !== 'string') {
      return;
    }

    const trimmedValue = rawValue.trim();
    if (!trimmedValue) {
      return;
    }

    const key = normalizeText(trimmedValue);
    if (!key || key === 'não informado' || key === 'nao informado') {
      return;
    }

    if (!seen.has(key)) {
      seen.set(key, trimmedValue);
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

  const perfil = normalizePerfil(record.perfil);
  const simulados = Array.isArray(record.simulados) ? record.simulados : [];

  const scores = simulados
    .map((simulado) => Number(simulado?.percentualAcertos))
    .filter((value) => Number.isFinite(value));

  simulados.forEach((simulado) => {
    const desempenhoAreas = simulado?.desempenhoAreas;

    if (!desempenhoAreas || typeof desempenhoAreas !== 'object') {
      return;
    }

    Object.entries(desempenhoAreas).forEach(([area, desempenho]) => {
      if (!(area in areaTotals) || !desempenho || typeof desempenho !== 'object') {
        return;
      }

      const areaStats = areaTotals[area as GrandeArea];
      areaStats.acertos += Number((desempenho as { acertos?: number }).acertos || 0);
      areaStats.total += Number((desempenho as { total?: number }).total || 0);
    });
  });

  return {
    user_id: record.user_id,
    perfil,
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
    fazCursinho: parseFazCursinho(filters.fazCursinho),
    cursinho: filters.cursinho?.trim() || null,
    usarCorrecaoCursinho: filters.usarCorrecaoCursinho !== false,
  };

  const availableFilters = {
    estados: collectDistinctValues(records, (perfil) => perfil.estado),
    faculdades: collectDistinctValues(records, (perfil) => perfil.faculdade),
    semestres: collectDistinctValues(records, (perfil) => perfil.semestre),
    cursinhos: collectDistinctValues(records, (perfil) => getPerfilCursinho(perfil) || ''),
    situacoesCursinho: ['sim', 'nao'] as Array<'sim' | 'nao'>,
  };

  const allUserStats = records.map(getUserStats);
  const allUsersWithStats = allUserStats.filter((item) => item.simuladosConsiderados > 0);

  const globalAverage = mean(allUsersWithStats.map((item) => item.mediaGeral));
  const cursinhoBuckets = new Map<string, { count: number; sum: number }>();

  allUsersWithStats.forEach((item) => {
    const cursinho = getPerfilCursinho(item.perfil);
    if (!cursinho) {
      return;
    }

    const key = normalizeText(cursinho);
    const current = cursinhoBuckets.get(key) || { count: 0, sum: 0 };
    current.count += 1;
    current.sum += item.mediaGeral;
    cursinhoBuckets.set(key, current);
  });

  let usuariosAjustados = 0;
  const comparableScoreByUser = new Map<string, number>();

  allUsersWithStats.forEach((item) => {
    let adjusted = item.mediaGeral;
    if (normalizedFilters.usarCorrecaoCursinho) {
      const cursinho = getPerfilCursinho(item.perfil);
      if (cursinho) {
        const key = normalizeText(cursinho);
        const bucket = cursinhoBuckets.get(key);
        if (bucket && bucket.count >= CURSINHO_CORRECAO_AMOSTRA_MINIMA) {
          const cursinhoMean = bucket.sum / bucket.count;
          const correction = clamp((globalAverage - cursinhoMean) * CURSINHO_CORRECAO_ALPHA, -CURSINHO_CORRECAO_CAP, CURSINHO_CORRECAO_CAP);
          adjusted = item.mediaGeral + correction;
          if (Math.abs(correction) >= 0.1) {
            usuariosAjustados += 1;
          }
        }
      }
    }

    comparableScoreByUser.set(item.user_id, adjusted);
  });

  function getComparableScore(item: UserStats) {
    return comparableScoreByUser.get(item.user_id) ?? item.mediaGeral;
  }

  const currentUserStats = allUserStats.find((item) => item.user_id === currentUserId);

  const cohortRecords = records.filter((record) => {
    const perfil = normalizePerfil(record.perfil);
    const estado = normalizeText(perfil.estado);
    const faculdade = normalizeText(perfil.faculdade);
    const semestre = normalizeText(perfil.semestre);
    const fazCursinho = parseFazCursinho(perfil.fazCursinhoResidencia);
    const cursinho = normalizeText(getPerfilCursinho(perfil));

    const estadoMatches = !normalizedFilters.estado || estado === normalizeText(normalizedFilters.estado);
    const faculdadeMatches = !normalizedFilters.faculdade || faculdade === normalizeText(normalizedFilters.faculdade);
    const semestreMatches = !normalizedFilters.semestre || semestre === normalizeText(normalizedFilters.semestre);
    const fazCursinhoMatches = !normalizedFilters.fazCursinho || fazCursinho === normalizedFilters.fazCursinho;
    const cursinhoMatches = !normalizedFilters.cursinho || cursinho === normalizeText(normalizedFilters.cursinho);

    return estadoMatches && faculdadeMatches && semestreMatches && fazCursinhoMatches && cursinhoMatches;
  });

  const cohortStats = cohortRecords.map(getUserStats).filter((item) => item.simuladosConsiderados > 0);
  const cohortAverages = cohortStats.map((item) => getComparableScore(item));

  const usuarioMedia = currentUserStats?.mediaGeral ?? 0;
  const usuarioMediaComparavel = currentUserStats ? getComparableScore(currentUserStats) : 0;
  const usuarioAreaAverages = currentUserStats?.areaAverages ?? {
    'Clínica Médica': 0,
    'Cirurgia Geral': 0,
    'Pediatria': 0,
    'Ginecologia e Obstetrícia': 0,
    'Medicina Preventiva': 0,
  };

  const isIncluded = cohortRecords.some((record) => record.user_id === currentUserId);
  const percentile = percentileRank(cohortAverages, usuarioMediaComparavel);
  const position = cohortAverages.length > 0
    ? cohortAverages.filter((value) => value > usuarioMediaComparavel).length + 1
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
      mediaComparavel: round(usuarioMediaComparavel),
      posicao: position > 0 ? position : 0,
      totalUsuarios: cohortStats.length,
      percentil: round(percentile),
      deltaParaMedia: round(usuarioMediaComparavel - mean(cohortAverages)),
      simuladosConsiderados: currentUserStats?.simuladosConsiderados ?? 0,
      areaBenchmarks: buildAreaBenchmarks(
        usuarioAreaAverages,
        cohortStats.length > 0 ? cohortStats : allUserStats.filter((item) => item.simuladosConsiderados > 0),
      ),
    },
    currentUserIncluded: isIncluded,
    correcaoCursinho: {
      habilitada: normalizedFilters.usarCorrecaoCursinho,
      alpha: CURSINHO_CORRECAO_ALPHA,
      amostraMinima: CURSINHO_CORRECAO_AMOSTRA_MINIMA,
      usuariosAjustados,
    },
    warning: !isIncluded && cohortStats.length > 0
      ? 'Seu perfil atual não entra no recorte filtrado; a comparação mostra a base selecionada, mas não considera você dentro dela.'
      : cohortStats.length === 0
        ? 'Nenhum usuário encontrado com esse recorte.'
        : undefined,
  };
}