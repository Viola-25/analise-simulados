/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { buildAnonymousComparisonResponse, ComparisonRecord } from './src/utils/anonymousComparison';
import { normalizeAiAnalysis } from './src/utils/aiAnalysis';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

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
  filtersApplied: Record<string, any>;
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

function getErrorMessage(error: any, fallback: string) {
  return typeof error?.message === 'string' ? error.message : fallback;
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

app.use(express.json());

const systemInstruction = `Você é um professor e mentor especialista na preparação para a Residência Médica (equivalente a um coordenador pedagógico de grandes cursinhos como Medgrupo, Medcel, Sanar, Afya, etc.).
Sua missão é dar uma análise diagnóstica extremamente acolhedora porém exigente e cientificamente embasada em evidências de medicina e andragogia para aprovação do interno no final do ano na especialidade alvo dele.
Use termos médicos adequados na identificação dos temas (como terminologias da e.g. SUS-SP, ENARE, USP). Seja prático e direto nas sugestões.`;

function extractJsonPayload(content: string): string {
  const trimmed = content.trim();

  if (trimmed.startsWith('```')) {
    const withoutFence = trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '');

    return withoutFence.trim();
  }

  return trimmed;
}

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function safeAreaStats(simulado: any, area: string) {
  const desempenhoAreas = simulado?.desempenhoAreas;
  const areaData = desempenhoAreas && typeof desempenhoAreas === 'object'
    ? desempenhoAreas[area]
    : undefined;

  const acertos = safeNumber(areaData?.acertos, 0);
  const total = safeNumber(areaData?.total, 0);
  const percentual = total > 0 ? (acertos / total) * 100 : 0;

  return { acertos, total, percentual };
}

function safeTempoPorQuestao(simulado: any) {
  const tempoResolucaoMinutos = safeNumber(simulado?.tempoResolucaoMinutos, 0);
  const questoesTotais = safeNumber(simulado?.questoesTotais, 0);

  if (tempoResolucaoMinutos <= 0 || questoesTotais <= 0) {
    return 0;
  }

  return (tempoResolucaoMinutos * 60) / questoesTotais;
}

function sanitizeSimulados(simulados: unknown[]): any[] {
  if (!Array.isArray(simulados)) {
    return [];
  }

  return simulados.filter((simulado): simulado is Record<string, any> => Boolean(simulado && typeof simulado === 'object'));
}

function buildSimuladoSummary(simulado: any, index: number): string {
  const clinica = safeAreaStats(simulado, 'Clínica Médica');
  const cirurgia = safeAreaStats(simulado, 'Cirurgia Geral');
  const pediatria = safeAreaStats(simulado, 'Pediatria');
  const go = safeAreaStats(simulado, 'Ginecologia e Obstetrícia');
  const preventiva = safeAreaStats(simulado, 'Medicina Preventiva');
  const acertosTotais = safeNumber(simulado?.acertosTotais, 0);
  const questoesTotais = safeNumber(simulado?.questoesTotais, 0);
  const percentualAcertos = safeNumber(simulado?.percentualAcertos, 0);
  const tempoResolucaoMinutos = safeNumber(simulado?.tempoResolucaoMinutos, 0);
  const tempoPorQuestao = safeTempoPorQuestao(simulado);

  return `
Simulado #${index + 1}:
  - Nome: ${simulado?.nome || 'Simulado sem nome'}
  - Data: ${simulado?.data || 'Data não informada'}
  - Desempenho Geral: ${acertosTotais} acertos de ${questoesTotais} questões (${percentualAcertos.toFixed(1)}%)
  - Tempo de resolução: ${tempoResolucaoMinutos} minutos (médio de ${tempoPorQuestao.toFixed(1)} segundos por questão)
  - Desempenho por Grande Área:
    * Clínica Médica: ${clinica.acertos} de ${clinica.total} (${clinica.percentual.toFixed(1)}%)
    * Cirurgia Geral: ${cirurgia.acertos} de ${cirurgia.total} (${cirurgia.percentual.toFixed(1)}%)
    * Pediatria: ${pediatria.acertos} de ${pediatria.total} (${pediatria.percentual.toFixed(1)}%)
    * Ginecologia e Obstetrícia: ${go.acertos} de ${go.total} (${go.percentual.toFixed(1)}%)
    * Medicina Preventiva: ${preventiva.acertos} de ${preventiva.total} (${preventiva.percentual.toFixed(1)}%)
  ${typeof simulado?.mediaParticipantes === 'number' ? `- Média geral dos outros participantes: ${simulado.mediaParticipantes} questões (${questoesTotais > 0 ? ((simulado.mediaParticipantes / questoesTotais) * 100).toFixed(1) : '0.0'}%)` : ''}
  ${typeof simulado?.desvioPadrao === 'number' ? `- Desvio padrão da prova: ${simulado.desvioPadrao} questões` : ''}
  ${typeof simulado?.percentilEstimado === 'number' ? `- Seu percentil estimado: ${simulado.percentilEstimado.toFixed(1)}° percentil (você superou ${simulado.percentilEstimado.toFixed(1)}% dos participantes)` : ''}
  ${simulado?.cadernoErros ? `- Observações/Erros anotados: "${simulado.cadernoErros}"` : ''}
`;
}

// REST API endpoint for AI performance analysis
app.post('/api/analyze-performance', async (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({
      error: 'O serviço de Inteligência Artificial não está disponível no momento (chave da Groq ausente).',
    });
  }

  try {
    const { perfil, simulados } = req.body || {};

    if (!simulados || !Array.isArray(simulados) || simulados.length === 0) {
      return res.status(400).json({ error: 'Nenhum simulado fornecido para análise.' });
    }

    const safeSimulados = sanitizeSimulados(simulados);

    // Prepare a concise descriptive content for the prompt
    const promptString = `Abaixo estão os dados de desempenho de um estudante do último ano de medicina (Internato) se preparando para a Residência Médica.
    
DADOS DO PERFIL DO ALUNO:
- Nome: ${perfil?.nome || 'Estudante'}
- Estado: ${perfil?.estado || 'Não informado'}
- Faculdade: ${perfil?.faculdade || 'Não informada'}
- Semestre: ${perfil?.semestre || 'Não informado'}
- Especialidade de Interesse: ${perfil?.especialidadeAlvo || 'Não informada'}
- Instituição Alvo: ${perfil?.instituicaoAlvo || 'Não especificada'}
- Meta de aproveitamento geral: ${perfil?.metaAcertosPercentual || 80}%

DADOS DOS SIMULADOS REALIZADOS (Últimos ${safeSimulados.length} simulados, do mais antigo para o mais recente):
${safeSimulados.map((s, index) => buildSimuladoSummary(s, index)).join('\n')}

Faça uma análise estatística e diagnóstica médica altamente profissional e personalizada direcionada à aprovação na residência médica de ${perfil?.instituicaoAlvo || 'grande concorrência'}.
Responda somente em JSON válido, sem texto fora do JSON.
Você deve fornecer:
1. Um diagnóstico geral de evolução de estudos, considerando se há avanço ou estagnação e sugerindo um diagnóstico temporal e de gerenciamento de tempo de prova.
2. Análise individualizada para CADA uma das 5 grandes áreas:
   - Identifique diagnósticos específicos de pontos fracos de disciplina com base nos erros e aproveitamentos do histórico.
   - Forneça um "grauPrioridade" para cada uma das áreas (Crítico se estiver abaixo de 60% de média ou abaixo da média histórica geral da prova; Atenção entre 60% e 74%; Adequado entre 75% e 84%; Excelente caso acima de 85%).
   - Indique de 3 a 5 temas de estudo prioritários de medicina mais cobrados nas principais provas para cada área que o aluno deve focar para decolar a nota (com base nas fraquezas dele). Escreva temas claros de medicina, por exemplo 'Hemorragia Digestiva Alta', 'Distúrbios Ácido-Básicos', 'Anemias', 'Infecção Urinária na infância', 'Planejamento Familiar e Anticoncepção', 'Estudos de Coorte e Ensaios Clínicos', etc.
3. Um plano de ação claro com 4-5 passos práticos específicos de metodologia de estudo ativo (ex: flashcards, engenharia reversa por questões, revisões espaçadas baseadas no caderno de erros) focado em alavancar os pontos fracos.

Retorne rigorosamente no formato de dados estruturado padrão fornecido.`;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: systemInstruction,
          },
          {
            role: 'user',
            content: promptString,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(`Groq respondeu com erro ${response.status}: ${errorText}`);
      error.name = 'GroqUpstreamError';
      throw error;
    }

    const responseData = await response.json() as {
      choices?: Array<{
        message?: {
          content?: string | null;
        };
      }>;
    };

    const responseText = responseData.choices?.[0]?.message?.content;
    if (!responseText) {
      const error = new Error('A resposta gerada pela IA está vazia.');
      error.name = 'EmptyGroqResponseError';
      throw error;
    }

    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(extractJsonPayload(responseText));
    } catch (error: any) {
      const parseError = new Error(`A resposta da IA não veio em JSON válido: ${error?.message || String(error)}`);
      parseError.name = 'InvalidGroqJsonError';
      throw parseError;
    }

    const dataParsed = normalizeAiAnalysis(parsedPayload);
    if (!dataParsed) {
      const error = new Error('A resposta da IA veio vazia ou em um formato inválido.');
      error.name = 'InvalidGroqPayloadError';
      throw error;
    }

    return res.json(dataParsed);
  } catch (error: any) {
    console.error('Error during AI analysis:', error);
    const message = error?.message || String(error);
    const statusCode = error?.name === 'MissingGroqApiKeyError'
      ? 503
      : error?.name === 'InvalidGroqJsonError' || error?.name === 'InvalidGroqPayloadError' || error?.name === 'EmptyGroqResponseError' || error?.name === 'GroqUpstreamError'
        ? 502
        : 500;

    res.status(statusCode).json({
      error: statusCode === 503
        ? 'A análise de IA não está disponível porque a chave da Groq não foi configurada neste ambiente.'
        : statusCode === 502
          ? 'A IA respondeu em um formato inesperado. Tente novamente em instantes.'
          : 'Ocorreu um erro no processamento da análise de IA. Contudo, suas estatísticas locais continuam disponíveis.',
      details: message,
    });
  }
});

app.post('/api/delete-account', async (req, res) => {
  try {
    const authorization = req.headers.authorization || '';
    const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

    if (!accessToken) {
      return res.status(401).json({ error: 'Sessão não autenticada.' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return res.status(500).json({
        error: 'A exclusão de conta ainda não está ativada neste ambiente. Configure SUPABASE_SERVICE_ROLE_KEY no servidor para habilitar essa ação. A sincronização normal dos dados continua funcionando.',
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const { data: userData, error: userError } = await authClient.auth.getUser(accessToken);
    if (userError || !userData.user) {
      return res.status(401).json({ error: 'Não foi possível validar a sessão do usuário.' });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { error: deleteDataError } = await adminClient
      .from('user_app_data')
      .delete()
      .eq('user_id', userData.user.id);

    if (deleteDataError) {
      throw deleteDataError;
    }

    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userData.user.id);
    if (deleteUserError) {
      throw deleteUserError;
    }

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('Error during account deletion:', error);
    return res.status(500).json({ error: error?.message || 'Não foi possível excluir a conta no momento.' });
  }
});

app.post('/api/compare-performance', async (req, res) => {
  const debugEnabled = isCompareDebugEnabled();
  const requestId = (req.headers['x-request-id'] as string | undefined) || newRequestId();
  const debugContext: CompareDebugContext = {
    requestId,
    stage: 'method',
    usingServiceRole: false,
    filtersApplied: (req.body?.filters || {}),
    sanitization: buildEmptySanitizationStats(),
  };

  try {
    debugContext.stage = 'auth';
    const authorization = req.headers.authorization || '';
    const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

    if (!accessToken) {
      const body: any = { error: 'Sessão não autenticada.' };
      if (debugEnabled) {
        body.debug = buildDebugPayload(debugContext);
      }
      return res.status(401).json(body);
    }

    debugContext.stage = 'config';
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    debugContext.usingServiceRole = Boolean(supabaseServiceRoleKey);

    if (!supabaseUrl || !supabaseAnonKey) {
      const body: any = { error: 'Configuração do Supabase incompleta para comparação anônima.' };
      if (debugEnabled) {
        body.debug = buildDebugPayload(debugContext);
      }
      return res.status(500).json(body);
    }

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
      return res.status(401).json(body);
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

    const filters = (req.body?.filters || {});
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

    return res.status(200).json(payload);
  } catch (error: any) {
    debugContext.stage = 'error';
    console.error('Error during anonymous comparison:', error);
    const body: any = { error: getErrorMessage(error, 'Não foi possível gerar a comparação anônima no momento.') };
    if (debugEnabled) {
      body.debug = buildDebugPayload({
        ...debugContext,
        buildError: debugContext.buildError || getErrorMessage(error, 'erro inesperado'),
      });
      res.setHeader('x-compare-debug-id', requestId);
      console.error(`[compare-performance][${requestId}] fail`, body.debug);
    }
    return res.status(500).json(body);
  }
});

// Setup Vite & Static Assets serving
async function bootstrap() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Starting server in Development Mode...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Starting server in Production Mode...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Application environment running on host 0.0.0.0 pointing to port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to bootstrap the Express/Vite server:', err);
});
