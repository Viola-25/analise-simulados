/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GrandeArea, RespostaAnaliseIA, Simulado } from '../src/types';
import { normalizeAiAnalysis } from '../src/utils/aiAnalysis';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

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
  return `Abaixo estão os dados de desempenho de um estudante do último ano de medicina (Internato) se preparando para a Residência Médica.
    
DADOS DO PERFIL DO ALUNO:
- Nome: ${perfil?.nome || 'Estudante'}
- Estado: ${perfil?.estado || 'Não informado'}
- Faculdade: ${perfil?.faculdade || 'Não informada'}
- Semestre: ${perfil?.semestre || 'Não informado'}
- Especialidade de Interesse: ${perfil?.especialidadeAlvo || 'Não informada'}
- Instituição Alvo: ${perfil?.instituicaoAlvo || 'Não especificada'}
- Meta de aproveitamento geral: ${perfil?.metaAcertosPercentual || 80}%

DADOS DOS SIMULADOS REALIZADOS (Últimos ${simulados.length} simulados, do mais antigo para o mais recente):
${simulados.map((s, index) => buildSimuladoSummary(s, index)).join('\n')}

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

async function runAnalysis(perfil: any, simulados: Simulado[]): Promise<RespostaAnaliseIA> {
  if (!process.env.GROQ_API_KEY) {
    const error = new Error('GROQ_API_KEY não configurada.');
    error.name = 'MissingGroqApiKeyError';
    throw error;
  }

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
        { role: 'system', content: systemInstruction },
        { role: 'user', content: buildPrompt(perfil, simulados) },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq respondeu com erro ${response.status}: ${errorText}`);
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

  const parsed = normalizeAiAnalysis(parsedPayload);
  if (!parsed) {
    const error = new Error('A resposta da IA veio vazia ou em um formato inválido.');
    error.name = 'InvalidGroqPayloadError';
    throw error;
  }

  return parsed;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
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
    const statusCode = error?.name === 'MissingGroqApiKeyError'
      ? 503
      : error?.name === 'InvalidGroqJsonError' || error?.name === 'InvalidGroqPayloadError' || error?.name === 'EmptyGroqResponseError'
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
}