import { GrandeArea, RespostaAnaliseIA } from '../types';

const PRIORIDADES_VALIDAS: RespostaAnaliseIA['analiseAreas'][number]['grauPrioridade'][] = [
  'Crítico',
  'Atenção',
  'Adequado',
  'Excelente',
];

const GRANDES_AREAS_VALIDAS: GrandeArea[] = [
  'Clínica Médica',
  'Cirurgia Geral',
  'Pediatria',
  'Ginecologia e Obstetrícia',
  'Medicina Preventiva',
];

export function normalizeAiAnalysis(input: unknown): RespostaAnaliseIA | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const source = input as Partial<RespostaAnaliseIA> & {
    analiseAreas?: unknown;
    planoDeAcao?: unknown;
  };

  const analiseAreas = Array.isArray(source.analiseAreas)
    ? source.analiseAreas.flatMap((area) => {
        if (!area || typeof area !== 'object') {
          return [];
        }

        const item = area as Partial<RespostaAnaliseIA['analiseAreas'][number]> & {
          temasRecomendados?: unknown;
        };

        if (!GRANDES_AREAS_VALIDAS.includes(item.area as GrandeArea)) {
          return [];
        }

        const temasRecomendados = Array.isArray(item.temasRecomendados)
          ? item.temasRecomendados.filter((tema): tema is string => typeof tema === 'string' && tema.trim().length > 0)
          : [];

        return [{
          area: item.area as GrandeArea,
          diagnostico: typeof item.diagnostico === 'string' ? item.diagnostico : '',
          grauPrioridade: PRIORIDADES_VALIDAS.includes(item.grauPrioridade as RespostaAnaliseIA['analiseAreas'][number]['grauPrioridade'])
            ? item.grauPrioridade as RespostaAnaliseIA['analiseAreas'][number]['grauPrioridade']
            : 'Atenção',
          temasRecomendados,
        }];
      })
    : [];

  const planoDeAcao = Array.isArray(source.planoDeAcao)
    ? source.planoDeAcao.filter((passo): passo is string => typeof passo === 'string' && passo.trim().length > 0)
    : [];

  const diagnosticoGeral = typeof source.diagnosticoGeral === 'string' ? source.diagnosticoGeral.trim() : '';

  if (diagnosticoGeral.length === 0 && analiseAreas.length === 0 && planoDeAcao.length === 0) {
    return null;
  }

  return {
    diagnosticoGeral,
    analiseAreas,
    planoDeAcao,
  };
}
