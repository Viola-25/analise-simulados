/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GrandeArea, RespostaAnaliseIA, Simulado } from '../src/types';

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

function buildPrompt(perfil: any, simulados: Simulado[]): string {
  return `Abaixo estão os dados de desempenho de um estudante do último ano de medicina (Internato) se preparando para a Residência Médica.
    
DADOS DO PERFIL DO ALUNO:
- Nome: ${perfil?.nome || 'Estudante'}
- Especialidade de Interesse: ${perfil?.especialidadeAlvo || 'Não informada'}
- Instituição Alvo: ${perfil?.instituicaoAlvo || 'Não especificada'}
- Meta de aproveitamento geral: ${perfil?.metaAcertosPercentual || 80}%

DADOS DOS SIMULADOS REALIZADOS (Últimos ${simulados.length} simulados, do mais antigo para o mais recente):
${simulados.map((s, index) => `
Simulado #${index + 1}:
  - Nome: ${s.nome}
  - Data: ${s.data}
  - Desempenho Geral: ${s.acertosTotais} acertos de ${s.questoesTotais} questões (${s.percentualAcertos.toFixed(1)}%)
  - Tempo de resolução: ${s.tempoResolucaoMinutos} minutos (médio de ${(s.tempoResolucaoMinutos * 60 / s.questoesTotais).toFixed(1)} segundos por questão)
  - Desempenho por Grande Área:
    * Clínica Médica: ${s.desempenhoAreas['Clínica Médica'].acertos} de ${s.desempenhoAreas['Clínica Médica'].total} (${(s.desempenhoAreas['Clínica Médica'].total ? s.desempenhoAreas['Clínica Médica'].acertos / s.desempenhoAreas['Clínica Médica'].total * 100 : 0).toFixed(1)}%)
    * Cirurgia Geral: ${s.desempenhoAreas['Cirurgia Geral'].acertos} de ${s.desempenhoAreas['Cirurgia Geral'].total} (${(s.desempenhoAreas['Cirurgia Geral'].total ? s.desempenhoAreas['Cirurgia Geral'].acertos / s.desempenhoAreas['Cirurgia Geral'].total * 100 : 0).toFixed(1)}%)
    * Pediatria: ${s.desempenhoAreas['Pediatria'].acertos} de ${s.desempenhoAreas['Pediatria'].total} (${(s.desempenhoAreas['Pediatria'].total ? s.desempenhoAreas['Pediatria'].acertos / s.desempenhoAreas['Pediatria'].total * 100 : 0).toFixed(1)}%)
    * Ginecologia e Obstetrícia: ${s.desempenhoAreas['Ginecologia e Obstetrícia'].acertos} de ${s.desempenhoAreas['Ginecologia e Obstetrícia'].total} (${(s.desempenhoAreas['Ginecologia e Obstetrícia'].total ? s.desempenhoAreas['Ginecologia e Obstetrícia'].acertos / s.desempenhoAreas['Ginecologia e Obstetrícia'].total * 100 : 0).toFixed(1)}%)
    * Medicina Preventiva: ${s.desempenhoAreas['Medicina Preventiva'].acertos} de ${s.desempenhoAreas['Medicina Preventiva'].total} (${(s.desempenhoAreas['Medicina Preventiva'].total ? s.desempenhoAreas['Medicina Preventiva'].acertos / s.desempenhoAreas['Medicina Preventiva'].total * 100 : 0).toFixed(1)}%)
  ${s.mediaParticipantes ? `- Média geral dos outros participantes: ${s.mediaParticipantes} questões (${(s.mediaParticipantes / s.questoesTotais * 100).toFixed(1)}%)` : ''}
  ${s.desvioPadrao ? `- Desvio padrão da prova: ${s.desvioPadrao} questões` : ''}
  ${s.percentilEstimado ? `- Seu percentil estimado: ${s.percentilEstimado.toFixed(1)}° percentil (você superou ${s.percentilEstimado.toFixed(1)}% dos participantes)` : ''}
  ${s.cadernoErros ? `- Observações/Erros anotados: "${s.cadernoErros}"` : ''}
`).join('\n')}

Faça uma análise estatística e diagnóstica médica altamente profissional e personalizada direcionada à aprovação na residência médica de ${perfil?.instituicaoAlvo || 'grande concorrência'}.
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
    throw new Error('GROQ_API_KEY não configurada.');
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
    throw new Error('A resposta gerada pela IA está vazia.');
  }

  return JSON.parse(extractJsonPayload(responseText)) as RespostaAnaliseIA;
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
    res.status(500).json({
      error: 'Ocorreu um erro no processamento da análise de IA. Contudo, suas estatísticas locais continuam disponíveis.',
      details: error?.message || String(error),
    });
  }
}