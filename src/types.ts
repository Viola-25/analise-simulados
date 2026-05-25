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

  // Origem do simulado
  ehSimuladoCursinho?: boolean;
  origemSimuladoCursinho?: 'proprio' | 'outro' | null;
  cursinhoOrigemNome?: string;
  
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
  estado: string;
  faculdade: string;
  semestre: string;
  fazCursinhoResidencia: boolean;
  cursinhoResidencia: string;
  especialidadeAlvo: string;
  instituicaoAlvo: string;
  metaAcertosPercentual: number; // e.g. 80 para 80%
}

export interface AnonymousComparisonFilters {
  estado?: string | null;
  faculdade?: string | null;
  semestre?: string | null;
  fazCursinho?: 'sim' | 'nao' | null;
  cursinho?: string | null;
  usarCorrecaoCursinho?: boolean | null;
}

export interface AnonymousComparisonAreaBenchmark {
  area: GrandeArea;
  mediaUsuario: number;
  mediaGrupo: number;
  delta: number;
}

export interface AnonymousComparisonDistributionBucket {
  faixa: string;
  quantidade: number;
  percentual: number;
}

export interface AnonymousComparisonResponse {
  availableFilters: {
    estados: string[];
    faculdades: string[];
    semestres: string[];
    cursinhos: string[];
    situacoesCursinho: Array<'sim' | 'nao'>;
  };
  appliedFilters: Required<AnonymousComparisonFilters>;
  cohort: {
    totalUsuarios: number;
    totalSimulados: number;
    mediaGeral: number;
    medianaGeral: number;
    desvioPadrao: number;
    melhorGeral: number;
    piorGeral: number;
    distribution: AnonymousComparisonDistributionBucket[];
    areaBenchmarks: AnonymousComparisonAreaBenchmark[];
  };
  usuario: {
    mediaGeral: number;
    mediaComparavel?: number;
    posicao: number;
    totalUsuarios: number;
    percentil: number;
    deltaParaMedia: number;
    simuladosConsiderados: number;
    areaBenchmarks: AnonymousComparisonAreaBenchmark[];
  };
  currentUserIncluded: boolean;
  warning?: string;
  correcaoCursinho?: {
    habilitada: boolean;
    alpha: number;
    amostraMinima: number;
    usuariosAjustados: number;
  };
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
  origemAnalise?: 'groq' | 'fallback_local';
  statusAnalise?: 'groq_ok' | 'groq_reparada' | 'fallback_local';
  tentativasIA?: number;
  envioParaIA?: boolean;
}

export interface UserAppDataRecord {
  user_id: string;
  perfil: PerfilAluno;
  simulados: Simulado[];
  updated_at?: string;
}
