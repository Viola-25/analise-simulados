/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GrandeArea = 'Clínica Médica' | 'Cirurgia Geral' | 'Pediatria' | 'Ginecologia e Obstetrícia' | 'Medicina Preventiva';

export const GRANDES_AREAS: GrandeArea[] = [
  'Clínica Médica',
  'Cirurgia Geral',
  'Pediatria',
  'Ginecologia e Obstetrícia',
  'Medicina Preventiva'
];

export interface DesempenhoArea {
  acertos: number;
  total: number;
}

export interface Simulado {
  id: string;
  nome: string;
  data: string; // YYYY-MM-DD
  tempoResolucaoMinutos: number; // tempo total em minutos
  desempenhoAreas: Record<GrandeArea, DesempenhoArea>;
  
  // Dados opcionais de concorrência/ranking
  mediaParticipantes?: number; // média de acertos dos participantes
  desvioPadrao?: number; // desvio padrão de acertos
  posicaoRanking?: number;
  totalParticipantes?: number;
  
  // Caderno de erros / observações
  cadernoErros?: string;
  
  // Dados calculados para exibição
  acertosTotais: number;
  questoesTotais: number;
  percentualAcertos: number;
  zScore?: number;
  percentilEstimado?: number;
}

export interface PerfilAluno {
  nome: string;
  especialidadeAlvo: string;
  instituicaoAlvo: string;
  metaAcertosPercentual: number; // e.g. 80 para 80%
}

export interface RespostaAnaliseIA {
  diagnosticoGeral: string;
  analiseAreas: {
    area: GrandeArea;
    diagnostico: string;
    grauPrioridade: 'Crítico' | 'Atenção' | 'Adequado' | 'Excelente';
    temasRecomendados: string[];
  }[];
  planoDeAcao: string[];
}
