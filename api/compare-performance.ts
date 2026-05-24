/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';
import { buildAnonymousComparisonResponse, ComparisonRecord } from '../src/utils/anonymousComparison';
import { AnonymousComparisonFilters } from '../src/types';

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

    let payload;

    try {
      debugContext.stage = 'build';
      payload = buildAnonymousComparisonResponse(records, userData.user.id, filters);
    } catch (buildError: any) {
      debugContext.buildError = getErrorMessage(buildError, 'falha interna ao montar o comparativo');
      payload = buildAnonymousComparisonResponse([], userData.user.id, filters);
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
