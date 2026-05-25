/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GrandeArea, RespostaAnaliseIA, Simulado } from '../src/types';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GRANDES_AREAS: GrandeArea[] = [
  'Clínica Médica',
  'Cirurgia Geral',
  'Pediatria',
  'Ginecologia e Obstetrícia',
  'Medicina Preventiva',
];

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

function normalizeAiAnalysis(input: unknown): RespostaAnaliseIA | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const source = input as Partial<RespostaAnaliseIA> & {
    analiseAreas?: unknown;
    planoDeAcao?: unknown;
  };

  function normalizeText(value: unknown) {
    return typeof value === 'string'
      ? value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
      : '';
  }

  function resolveGrandeArea(value: unknown): GrandeArea | null {
    const normalized = normalizeText(value);

    if (normalized === 'clinica medica' || normalized === 'clinica' || normalized === 'medicina clinica') {
      return 'Clínica Médica';
    }

    if (normalized === 'cirurgia geral' || normalized === 'cirurgia') {
      return 'Cirurgia Geral';
    }

    if (normalized === 'pediatria' || normalized === 'pediatria geral') {
      return 'Pediatria';
    }

    if (normalized === 'ginecologia e obstetricia' || normalized === 'ginecologia obstetricia' || normalized === 'go') {
      return 'Ginecologia e Obstetrícia';
    }

    if (normalized === 'medicina preventiva' || normalized === 'preventiva' || normalized === 'saude coletiva') {
      return 'Medicina Preventiva';
    }

    return null;
  }

  function resolvePriority(value: unknown): RespostaAnaliseIA['analiseAreas'][number]['grauPrioridade'] {
    const normalized = normalizeText(value);

    if (normalized === 'critico') {
      return 'Crítico';
    }

    if (normalized === 'atencao') {
      return 'Atenção';
    }

    if (normalized === 'adequado') {
      return 'Adequado';
    }

    if (normalized === 'excelente') {
      return 'Excelente';
    }

    return 'Atenção';
  }

  const analiseAreas = Array.isArray(source.analiseAreas)
    ? source.analiseAreas.flatMap((area) => {
        if (!area || typeof area !== 'object') {
          return [];
        }

        const item = area as Partial<RespostaAnaliseIA['analiseAreas'][number]> & {
          temasRecomendados?: unknown;
        };

        const resolvedArea = resolveGrandeArea(item.area);
        if (!resolvedArea) {
          return [];
        }

        const temasRecomendados = Array.isArray(item.temasRecomendados)
          ? item.temasRecomendados.filter((tema): tema is string => typeof tema === 'string' && tema.trim().length > 0)
          : [];

        return [{
          area: resolvedArea,
          diagnostico: typeof item.diagnostico === 'string' ? item.diagnostico : '',
          grauPrioridade: resolvePriority(item.grauPrioridade),
          temasRecomendados,
        }];
      })
    : [];

  const planoDeAcao = Array.isArray(source.planoDeAcao)
    ? source.planoDeAcao.filter((passo): passo is string => typeof passo === 'string' && passo.trim().length > 0)
    : [];

  const diagnosticoGeral = typeof source.diagnosticoGeral === 'string' ? source.diagnosticoGeral.trim() : '';

  return {
    diagnosticoGeral,
    analiseAreas,
    planoDeAcao,
  };
}

function getAreaThemes(area: GrandeArea): string[] {
  switch (area) {
    case 'Clínica Médica':
      return ['Hipertensão Arterial Sistêmica', 'Diabetes Mellitus', 'Pneumonia Comunitária', 'Insuficiência Cardíaca', 'Distúrbios Ácido-Básicos'];
    case 'Cirurgia Geral':
      return ['Abdome Agudo', 'Hérnias da Parede Abdominal', 'Trauma Abdominal', 'Pós-Operatório', 'Hemorragia Digestiva Alta'];
    case 'Pediatria':
      return ['Crescimento e Desenvolvimento', 'Infecções de Vias Aéreas', 'Asma na Infância', 'Imunização', 'Infecção Urinária na Infância'];
    case 'Ginecologia e Obstetrícia':
      return ['Pré-natal de baixo risco', 'Distócia de Ombro', 'Sangramento Uterino Anormal', 'Planejamento Familiar', 'Trabalho de Parto'];
    case 'Medicina Preventiva':
      return ['Epidemiologia e Incidência', 'Sensibilidade e Especificidade', 'Estudos de Coorte', 'Ensaios Clínicos', 'Rastreamento'];
  }
}

function buildFallbackAnalysis(perfil: any, simulados: Simulado[]): RespostaAnaliseIA {
  const safeSimulados = sanitizeSimulados(simulados as unknown[]);

  const totalAcertos = safeSimulados.reduce((sum, simulado) => sum + safeNumber(simulado.acertosTotais, 0), 0);
  const totalQuestoes = safeSimulados.reduce((sum, simulado) => sum + safeNumber(simulado.questoesTotais, 0), 0);
  const overallPercentual = totalQuestoes > 0 ? (totalAcertos / totalQuestoes) * 100 : 0;

  const areaTotals: Record<GrandeArea, { acertos: number; total: number }> = {
    'Clínica Médica': { acertos: 0, total: 0 },
    'Cirurgia Geral': { acertos: 0, total: 0 },
    'Pediatria': { acertos: 0, total: 0 },
    'Ginecologia e Obstetrícia': { acertos: 0, total: 0 },
    'Medicina Preventiva': { acertos: 0, total: 0 },
  };

  safeSimulados.forEach((simulado) => {
    GRANDES_AREAS.forEach((area) => {
      const areaStats = safeAreaStats(simulado, area);
      areaTotals[area].acertos += areaStats.acertos;
      areaTotals[area].total += areaStats.total;
    });
  });

  const analiseAreas = GRANDES_AREAS.map((area) => {
    const areaStats = areaTotals[area];
    const percentual = areaStats.total > 0 ? (areaStats.acertos / areaStats.total) * 100 : 0;
    const grauPrioridade: RespostaAnaliseIA['analiseAreas'][number]['grauPrioridade'] = percentual < 60
      ? 'Crítico'
      : percentual < 75
        ? 'Atenção'
        : percentual < 85
          ? 'Adequado'
          : 'Excelente';

    return {
      area,
      diagnostico: `Desempenho agregado em ${area} de ${percentual.toFixed(1)}%. Priorize revisão dirigida dos temas mais cobrados e reforce questões comentadas para reduzir perdas por detalhe.`,
      grauPrioridade,
      temasRecomendados: getAreaThemes(area),
    };
  });

  const firstPercentual = safeSimulados[0] && safeSimulados[0].questoesTotais ? (safeNumber(safeSimulados[0].acertosTotais, 0) / safeNumber(safeSimulados[0].questoesTotais, 1)) * 100 : 0;
  const lastPercentual = safeSimulados.length > 0 && safeSimulados[safeSimulados.length - 1].questoesTotais
    ? (safeNumber(safeSimulados[safeSimulados.length - 1].acertosTotais, 0) / safeNumber(safeSimulados[safeSimulados.length - 1].questoesTotais, 1)) * 100
    : 0;
  const trendDelta = lastPercentual - firstPercentual;
  const trendText = safeSimulados.length >= 2
    ? trendDelta >= 0
      ? `houve melhora de ${trendDelta.toFixed(1)} pontos percentuais entre o primeiro e o último simulado registrado`
      : `houve queda de ${Math.abs(trendDelta).toFixed(1)} pontos percentuais entre o primeiro e o último simulado registrado`
    : 'há poucos simulados para medir tendência temporal com precisão';

  return {
    diagnosticoGeral: `Diagnóstico provisório gerado localmente com base no histórico salvo: ${overallPercentual.toFixed(1)}% de aproveitamento geral. ${trendText}. Use este bloco como contingência até a IA voltar a responder com conteúdo estruturado.`,
    analiseAreas,
    planoDeAcao: [
      'Revisar o caderno de erros primeiro, transformando cada erro em uma pergunta e resposta curta.',
      'Fazer 20 a 30 questões por dia nas áreas com pior percentual e revisar os comentários.',
      'Revisar os temas críticos em ciclos de 7 e 14 dias para consolidar retenção.',
      'Comparar desempenho entre o primeiro e o último simulado para acompanhar tendência real.',
    ],
    origemAnalise: 'fallback_local',
    envioParaIA: false,
    statusAnalise: 'fallback_local',
    tentativasIA: 0,
  };
}

function isMeaningfulAnalysis(value: RespostaAnaliseIA | null) {
  return Boolean(value && value.diagnosticoGeral.trim().length > 0 && value.analiseAreas.length > 0 && value.planoDeAcao.length > 0);
}

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function safeAreaStats(simulado: Partial<Simulado> | undefined, area: GrandeArea) {
  const desempenhoAreas = simulado?.desempenhoAreas;
  const areaData = desempenhoAreas && typeof desempenhoAreas === 'object'
    ? (desempenhoAreas as Record<string, { acertos?: unknown; total?: unknown }>)[area]
    : undefined;

  const acertos = safeNumber(areaData?.acertos, 0);
  const total = safeNumber(areaData?.total, 0);
  const percentual = total > 0 ? (acertos / total) * 100 : 0;

  return { acertos, total, percentual };
}

function safePercentualAcertos(simulado: Partial<Simulado> | undefined) {
  return safeNumber(simulado?.percentualAcertos, 0);
}

function safeTempoPorQuestao(simulado: Partial<Simulado> | undefined) {
  const tempoResolucaoMinutos = safeNumber(simulado?.tempoResolucaoMinutos, 0);
  const questoesTotais = safeNumber(simulado?.questoesTotais, 0);

  if (tempoResolucaoMinutos <= 0 || questoesTotais <= 0) {
    return 0;
  }

  return (tempoResolucaoMinutos * 60) / questoesTotais;
}

function sanitizeSimulados(simulados: unknown[]): Partial<Simulado>[] {
  if (!Array.isArray(simulados)) {
    return [];
  }

  return simulados.filter((simulado): simulado is Partial<Simulado> => Boolean(simulado && typeof simulado === 'object'));
}

function buildSimuladoSummary(simulado: Partial<Simulado>, index: number): string {
  const clinica = safeAreaStats(simulado, 'Clínica Médica');
  const cirurgia = safeAreaStats(simulado, 'Cirurgia Geral');
  const pediatria = safeAreaStats(simulado, 'Pediatria');
  const go = safeAreaStats(simulado, 'Ginecologia e Obstetrícia');
  const preventiva = safeAreaStats(simulado, 'Medicina Preventiva');
  const acertosTotais = safeNumber(simulado.acertosTotais, 0);
  const questoesTotais = safeNumber(simulado.questoesTotais, 0);
  const percentualAcertos = safePercentualAcertos(simulado);
  const tempoResolucaoMinutos = safeNumber(simulado.tempoResolucaoMinutos, 0);
  const tempoPorQuestao = safeTempoPorQuestao(simulado);

  return `
Simulado #${index + 1}:
  - Nome: ${simulado.nome || 'Simulado sem nome'}
  - Data: ${simulado.data || 'Data não informada'}
  - Desempenho Geral: ${acertosTotais} acertos de ${questoesTotais} questões (${percentualAcertos.toFixed(1)}%)
  - Tempo de resolução: ${tempoResolucaoMinutos} minutos (médio de ${tempoPorQuestao.toFixed(1)} segundos por questão)
  - Desempenho por Grande Área:
    * Clínica Médica: ${clinica.acertos} de ${clinica.total} (${clinica.percentual.toFixed(1)}%)
    * Cirurgia Geral: ${cirurgia.acertos} de ${cirurgia.total} (${cirurgia.percentual.toFixed(1)}%)
    * Pediatria: ${pediatria.acertos} de ${pediatria.total} (${pediatria.percentual.toFixed(1)}%)
    * Ginecologia e Obstetrícia: ${go.acertos} de ${go.total} (${go.percentual.toFixed(1)}%)
    * Medicina Preventiva: ${preventiva.acertos} de ${preventiva.total} (${preventiva.percentual.toFixed(1)}%)
  ${safeNumber(simulado.mediaParticipantes, NaN) ? `- Média geral dos outros participantes: ${simulado.mediaParticipantes} questões (${safeNumber(simulado.questoesTotais, 0) > 0 ? ((safeNumber(simulado.mediaParticipantes, 0) / safeNumber(simulado.questoesTotais, 1)) * 100).toFixed(1) : '0.0'}%)` : ''}
  ${safeNumber(simulado.desvioPadrao, NaN) ? `- Desvio padrão da prova: ${simulado.desvioPadrao} questões` : ''}
  ${safeNumber(simulado.percentilEstimado, NaN) ? `- Seu percentil estimado: ${safeNumber(simulado.percentilEstimado, 0).toFixed(1)}° percentil (você superou ${safeNumber(simulado.percentilEstimado, 0).toFixed(1)}% dos participantes)` : ''}
  ${simulado.cadernoErros ? `- Observações/Erros anotados: "${simulado.cadernoErros}"` : ''}
`;
}

function buildPrompt(perfil: any, simulados: Simulado[]): string {
  const safeSimulados = sanitizeSimulados(simulados as unknown[]);

  return `Abaixo estão os dados de desempenho de um estudante do último ano de medicina (Internato) se preparando para a Residência Médica.
    
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
}

function buildRepairPrompt(rawResponse: string): string {
  return `A resposta anterior veio incompleta ou fora do formato esperado.
Converta o conteúdo abaixo para JSON válido e estritamente compatível com o schema esperado, sem adicionar texto fora do JSON.
Se algum campo não puder ser inferido com segurança, preencha com strings vazias, arrays vazios ou valores neutros, mas mantenha a estrutura completa.

CONTEÚDO BRUTO:
${rawResponse}

RETORNE SOMENTE O JSON FINAL.`;
}

async function requestGroqCompletion(userPrompt: string, temperature = 0.2) {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  return response;
}

async function runAnalysis(perfil: any, simulados: Simulado[]): Promise<RespostaAnaliseIA> {
  if (!process.env.GROQ_API_KEY) {
    return buildFallbackAnalysis(perfil, simulados);
  }

  console.info(`[analyze-performance] Enviando ${simulados.length} simulados para a Groq using model ${GROQ_MODEL}`);
  let groqAttempts = 0;

  const response = await requestGroqCompletion(buildPrompt(perfil, simulados), 0.2);
  groqAttempts += 1;

  if (!response.ok) {
    const errorText = await response.text();
    console.warn(`[analyze-performance] Groq respondeu com erro ${response.status}: ${errorText}`);
    return buildFallbackAnalysis(perfil, simulados);
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
    console.warn('[analyze-performance] Resposta da Groq vazia. Tentando reparo antes do fallback local.');
    const repairResponse = await requestGroqCompletion(buildRepairPrompt('RESPOSTA VAZIA'), 0);
    const repairData = await repairResponse.json() as {
      choices?: Array<{
        message?: { content?: string | null };
      }>;
    };

    const repairText = repairData.choices?.[0]?.message?.content;
    if (!repairText) {
      return buildFallbackAnalysis(perfil, simulados);
    }

    let repairPayload: unknown;
    try {
      repairPayload = JSON.parse(extractJsonPayload(repairText));
    } catch (error: any) {
      console.warn(`[analyze-performance] Reparo ainda inválido: ${error?.message || String(error)}. Usando fallback local.`);
      return buildFallbackAnalysis(perfil, simulados);
    }

    const repaired = normalizeAiAnalysis(repairPayload);
    if (!isMeaningfulAnalysis(repaired)) {
      return buildFallbackAnalysis(perfil, simulados);
    }

    return {
      ...repaired,
      origemAnalise: 'groq',
      envioParaIA: true,
      statusAnalise: 'groq_reparada',
      tentativasIA: groqAttempts,
    };
  }

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(extractJsonPayload(responseText));
  } catch (error: any) {
    console.warn(`[analyze-performance] JSON inválido da Groq: ${error?.message || String(error)}. Tentando reparo.`);

    const repairResponse = await requestGroqCompletion(buildRepairPrompt(responseText), 0);
    const repairData = await repairResponse.json() as {
      choices?: Array<{
        message?: { content?: string | null };
      }>;
    };

    const repairText = repairData.choices?.[0]?.message?.content;
    if (!repairText) {
      return buildFallbackAnalysis(perfil, simulados);
    }

    let repairPayload: unknown;
    try {
      repairPayload = JSON.parse(extractJsonPayload(repairText));
    } catch (repairError: any) {
      console.warn(`[analyze-performance] Reparo inválido: ${repairError?.message || String(repairError)}. Usando fallback local.`);
      return buildFallbackAnalysis(perfil, simulados);
    }

    const repaired = normalizeAiAnalysis(repairPayload);
    if (!isMeaningfulAnalysis(repaired)) {
      return buildFallbackAnalysis(perfil, simulados);
    }

    return {
      ...repaired,
      origemAnalise: 'groq',
      envioParaIA: true,
      statusAnalise: 'groq_reparada',
      tentativasIA: groqAttempts,
    };
  }

  const parsed = normalizeAiAnalysis(parsedPayload);
  if (!isMeaningfulAnalysis(parsed)) {
    console.warn('[analyze-performance] Payload da IA sem conteúdo útil. Tentando reparo antes do fallback local.');

    const repairResponse = await requestGroqCompletion(buildRepairPrompt(responseText), 0);
    const repairData = await repairResponse.json() as {
      choices?: Array<{
        message?: { content?: string | null };
      }>;
    };

    const repairText = repairData.choices?.[0]?.message?.content;
    if (!repairText) {
      return buildFallbackAnalysis(perfil, simulados);
    }

    let repairPayload: unknown;
    try {
      repairPayload = JSON.parse(extractJsonPayload(repairText));
    } catch (repairError: any) {
      console.warn(`[analyze-performance] Reparo inválido: ${repairError?.message || String(repairError)}. Usando fallback local.`);
      return buildFallbackAnalysis(perfil, simulados);
    }

    const repaired = normalizeAiAnalysis(repairPayload);
    if (!isMeaningfulAnalysis(repaired)) {
      return buildFallbackAnalysis(perfil, simulados);
    }

    return {
      ...repaired,
      origemAnalise: 'groq',
      envioParaIA: true,
      statusAnalise: 'groq_reparada',
      tentativasIA: groqAttempts,
    };
  }

  return {
    ...parsed,
    origemAnalise: 'groq',
    statusAnalise: 'groq_ok',
    envioParaIA: true,
    tentativasIA: groqAttempts,
  };
}

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    res.status(405).setHeader('Allow', 'POST').json({ error: 'Método não permitido. Use POST.' });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).setHeader('Allow', 'POST').json({ error: 'Método não permitido.' });
    return;
  }

  try {
    const { perfil, simulados } = req.body || {};

    if (!simulados || !Array.isArray(simulados) || simulados.length === 0) {
      res.status(400).json({ error: 'Nenhum simulado fornecido para análise.' });
      return;
    }

    const dataParsed = await runAnalysis(perfil, simulados);
    res.status(200).json(dataParsed);
  } catch (error: any) {
    console.error('Error during AI analysis:', error);
    const message = error?.message || String(error);
    res.status(500).json({
      error: 'Ocorreu um erro no processamento da análise de IA. Contudo, suas estatísticas locais continuam disponíveis.',
      details: message,
    });
  }
}