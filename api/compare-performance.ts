/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

type GrandeArea = 'Clínica Médica' | 'Cirurgia Geral' | 'Pediatria' | 'Ginecologia e Obstetrícia' | 'Medicina Preventiva';

type PerfilAluno = {
  estado?: string;
  faculdade?: string;
  semestre?: string;
  fazCursinhoResidencia?: boolean;
  cursinhoResidencia?: string;
};

type Simulado = {
  percentualAcertos?: number;
  desempenhoAreas?: Record<string, { acertos?: number; total?: number }>;
};

type AnonymousComparisonFilters = {
  estado?: string | null;
  faculdade?: string | null;
  semestre?: string | null;
  fazCursinho?: 'sim' | 'nao' | null;
  cursinho?: string | null;
  usarCorrecaoCursinho?: boolean | null;
};

type ComparisonRecord = {
  user_id: string;
  perfil: PerfilAluno | null | undefined;
  simulados: Simulado[] | null | undefined;
};

type UserStats = {
  user_id: string;
  perfil: PerfilAluno;
  mediaGeral: number;
  simuladosConsiderados: number;
  areaAverages: Record<GrandeArea, number>;
};

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

function collectDistinctValues(records: ComparisonRecord[], selector: (perfil: PerfilAluno) => string | undefined) {
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
    if (!key || key === 'não informado' || key === 'nao informado' || key === 'não informada' || key === 'nao informada') {
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

function buildAreaBenchmarks(userAreaAverages: UserStats['areaAverages'], groupStats: UserStats[]) {
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

function buildDistribution(values: number[]) {
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

function buildAnonymousComparisonResponse(records: ComparisonRecord[], currentUserId: string, filters: AnonymousComparisonFilters) {
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
    appliedFilters: normalizedFilters,
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

type DebugStage = 'method' | 'auth' | 'config' | 'session' | 'query' | 'sanitize' | 'build' | 'response' | 'error';

interface SanitizationStats {
  totalRows: number;
  validRows: number;
  ignoredRows: number;
  rowsWithNullPerfil: number;
  rowsWithInvalidPerfilType: number;
  rowsWithInvalidSimulados: number;
}

interface CompareDebugContext {
  requestId: string;
  stage: DebugStage;
  usingServiceRole: boolean;
  filtersApplied: AnonymousComparisonFilters;
  sanitization: SanitizationStats;
  queryError?: string;
  buildError?: string;
}

function isCompareDebugEnabled() {
  const value = (process.env.COMPARISON_DEBUG_MODE || process.env.DEBUG_COMPARE_PERFORMANCE || '').trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

function newRequestId() {
  return `cmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildEmptySanitizationStats(): SanitizationStats {
  return {
    totalRows: 0,
    validRows: 0,
    ignoredRows: 0,
    rowsWithNullPerfil: 0,
    rowsWithInvalidPerfilType: 0,
    rowsWithInvalidSimulados: 0,
  };
}

function toComparisonRecords(rows: any[] | null | undefined): { records: ComparisonRecord[]; stats: SanitizationStats } {
  const stats = buildEmptySanitizationStats();

  if (!Array.isArray(rows)) {
    return { records: [], stats };
  }

  stats.totalRows = rows.length;
  const records: ComparisonRecord[] = [];

  rows.forEach((item) => {
    if (!item || typeof item !== 'object' || typeof item.user_id !== 'string') {
      stats.ignoredRows += 1;
      return;
    }

    let perfil = item.perfil ?? null;
    if (perfil == null) {
      stats.rowsWithNullPerfil += 1;
    } else if (typeof perfil !== 'object') {
      stats.rowsWithInvalidPerfilType += 1;
      perfil = null;
    }

    let simulados: any[] = [];
    if (Array.isArray(item.simulados)) {
      simulados = item.simulados;
    } else if (item.simulados != null) {
      stats.rowsWithInvalidSimulados += 1;
    }

    records.push({
      user_id: item.user_id,
      perfil,
      simulados,
    });
  });

  stats.validRows = records.length;

  return { records, stats };
}

function buildFallbackComparisonPayload(filters: AnonymousComparisonFilters) {
  const normalizedFilters = {
    estado: filters.estado?.trim() || null,
    faculdade: filters.faculdade?.trim() || null,
    semestre: filters.semestre?.trim() || null,
    fazCursinho: parseFazCursinho(filters.fazCursinho),
    cursinho: filters.cursinho?.trim() || null,
    usarCorrecaoCursinho: filters.usarCorrecaoCursinho !== false,
  };

  const emptyAreas = [
    'Clínica Médica',
    'Cirurgia Geral',
    'Pediatria',
    'Ginecologia e Obstetrícia',
    'Medicina Preventiva',
  ].map((area) => ({
    area,
    mediaUsuario: 0,
    mediaGrupo: 0,
    delta: 0,
  }));

  return {
    availableFilters: {
      estados: [],
      faculdades: [],
      semestres: [],
      cursinhos: [],
      situacoesCursinho: ['sim', 'nao'] as Array<'sim' | 'nao'>,
    },
    appliedFilters: normalizedFilters,
    cohort: {
      totalUsuarios: 0,
      totalSimulados: 0,
      mediaGeral: 0,
      medianaGeral: 0,
      desvioPadrao: 0,
      melhorGeral: 0,
      piorGeral: 0,
      distribution: [
        { faixa: '0-49%', quantidade: 0, percentual: 0 },
        { faixa: '50-59%', quantidade: 0, percentual: 0 },
        { faixa: '60-69%', quantidade: 0, percentual: 0 },
        { faixa: '70-79%', quantidade: 0, percentual: 0 },
        { faixa: '80-89%', quantidade: 0, percentual: 0 },
        { faixa: '90-100%', quantidade: 0, percentual: 0 },
      ],
      areaBenchmarks: emptyAreas,
    },
    usuario: {
      mediaGeral: 0,
      mediaComparavel: 0,
      posicao: 0,
      totalUsuarios: 0,
      percentil: 0,
      deltaParaMedia: 0,
      simuladosConsiderados: 0,
      areaBenchmarks: emptyAreas,
    },
    currentUserIncluded: false,
    correcaoCursinho: {
      habilitada: normalizedFilters.usarCorrecaoCursinho,
      alpha: CURSINHO_CORRECAO_ALPHA,
      amostraMinima: CURSINHO_CORRECAO_AMOSTRA_MINIMA,
      usuariosAjustados: 0,
    },
    warning: 'Comparação temporariamente indisponível para este recorte.',
  };
}

function buildDebugPayload(context: CompareDebugContext) {
  return {
    requestId: context.requestId,
    stage: context.stage,
    usingServiceRole: context.usingServiceRole,
    filtersApplied: context.filtersApplied,
    sanitization: context.sanitization,
    queryError: context.queryError,
    buildError: context.buildError,
    timestamp: new Date().toISOString(),
  };
}

function getErrorMessage(error: any, fallback: string) {
  return typeof error?.message === 'string' ? error.message : fallback;
}

function getSupabaseConfig() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Configuração do Supabase incompleta para comparação anônima.');
  }

  return { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey };
}

export default async function handler(req: any, res: any) {
  const debugEnabled = isCompareDebugEnabled();
  const requestId = (req.headers['x-request-id'] as string | undefined) || newRequestId();
  const debugContext: CompareDebugContext = {
    requestId,
    stage: 'method',
    usingServiceRole: false,
    filtersApplied: (req.body?.filters || {}) as AnonymousComparisonFilters,
    sanitization: buildEmptySanitizationStats(),
  };

  if (req.method !== 'POST') {
    debugContext.stage = 'method';
    const body: any = { error: 'Método não permitido.' };
    if (debugEnabled) {
      body.debug = buildDebugPayload(debugContext);
    }
    res.status(405).json(body);
    return;
  }

  try {
    debugContext.stage = 'auth';
    const authorization = req.headers.authorization || '';
    const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

    if (!accessToken) {
      const body: any = { error: 'Sessão não autenticada.' };
      if (debugEnabled) {
        body.debug = buildDebugPayload(debugContext);
      }
      res.status(401).json(body);
      return;
    }

    debugContext.stage = 'config';
    const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = getSupabaseConfig();
    debugContext.usingServiceRole = Boolean(supabaseServiceRoleKey);

    debugContext.stage = 'session';
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const { data: userData, error: userError } = await authClient.auth.getUser(accessToken);
    if (userError || !userData.user) {
      const body: any = { error: 'Não foi possível validar a sessão do usuário.' };
      if (debugEnabled) {
        body.debug = buildDebugPayload(debugContext);
      }
      res.status(401).json(body);
      return;
    }

    let data: any[] | null = null;
    let error: any = null;
    let warning: string | undefined;

    debugContext.stage = 'query';
    if (supabaseServiceRoleKey) {
      const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
      const queryResult = await adminClient
        .from('user_app_data')
        .select('user_id, perfil, simulados');

      data = queryResult.data;
      error = queryResult.error;
    } else {
      const queryResult = await authClient
        .from('user_app_data')
        .select('user_id, perfil, simulados')
        .eq('user_id', userData.user.id);

      data = queryResult.data;
      error = queryResult.error;
      warning = 'Comparação completa indisponível neste ambiente; exibindo apenas seus próprios dados. Configure SUPABASE_SERVICE_ROLE_KEY no servidor para habilitar o comparativo agregado.';
    }

    if (error) {
      const errorMessage = getErrorMessage(error, 'falha ao carregar os dados de comparação');
      debugContext.queryError = errorMessage;
      warning = warning
        ? `${warning} Também houve uma falha ao consultar a base (${errorMessage}).`
        : `Falha ao consultar a base (${errorMessage}). Exibindo comparação limitada.`;
      data = [];
    }

    const filters = (req.body?.filters || {}) as AnonymousComparisonFilters;
    debugContext.filtersApplied = filters;

    debugContext.stage = 'sanitize';
    const { records, stats } = toComparisonRecords(data);
    debugContext.sanitization = stats;

    let payload: any;

    try {
      debugContext.stage = 'build';
      payload = buildAnonymousComparisonResponse(records, userData.user.id, filters);
    } catch (buildError: any) {
      debugContext.buildError = getErrorMessage(buildError, 'falha interna ao montar o comparativo');
      payload = buildFallbackComparisonPayload(filters);
      const fallbackWarning = `Alguns dados da base foram ignorados por estarem em formato inválido (${debugContext.buildError}).`;
      payload.warning = payload.warning ? `${payload.warning} ${fallbackWarning}` : fallbackWarning;
    }

    if (warning) {
      payload.warning = payload.warning ? `${payload.warning} ${warning}` : warning;
    }

    debugContext.stage = 'response';

    if (debugEnabled) {
      console.info(`[compare-performance][${requestId}] debug`, buildDebugPayload(debugContext));
      (payload as any).debug = buildDebugPayload(debugContext);
      res.setHeader('x-compare-debug-id', requestId);
    }

    res.status(200).json(payload);
  } catch (error: any) {
    debugContext.stage = 'error';
    console.error('Error during anonymous comparison:', error);
    const body: any = {
      error: getErrorMessage(error, 'Não foi possível gerar a comparação anônima no momento.'),
    };

    if (debugEnabled) {
      body.debug = buildDebugPayload({
        ...debugContext,
        buildError: debugContext.buildError || getErrorMessage(error, 'erro inesperado'),
      });
      res.setHeader('x-compare-debug-id', requestId);
      console.error(`[compare-performance][${requestId}] fail`, body.debug);
    }

    res.status(500).json(body);
  }
}
