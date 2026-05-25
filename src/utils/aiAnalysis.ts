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
