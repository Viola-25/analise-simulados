/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { Simulado, PerfilAluno, UserAppDataRecord } from './types';
import { calcularMetricasGlobais, MetricasGlobais } from './utils/stats';
import Dashboard from './components/Dashboard';
import SimuladosList from './components/SimuladosList';
import SimuladoForm from './components/SimuladoForm';
import PerfilForm from './components/PerfilForm';
import CadernoErros from './components/CadernoErros';
import AiInsights from './components/AiInsights';
import PrintReport from './components/PrintReport';
import AuthGate from './components/AuthGate';
import SignupGate from './components/SignupGate';
import SignupSuccessGate from './components/SignupSuccessGate';
import { createClient as createSupabaseClient, isSupabaseConfigured } from './utils/supabase/client';
import { 
  GraduationCap, 
  LayoutDashboard, 
  ClipboardList, 
  BookOpen, 
  Brain, 
  Download, 
  Upload, 
  Printer, 
  Target, 
  Activity, 
  Settings, 
  CheckCircle,
  FileDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const supabase = createSupabaseClient();
const SUPABASE_TABLE = 'user_app_data';
const ONBOARDING_STORAGE_KEY = 'med_simulados_onboarding_draft';
const LOCAL_STORAGE_KEYS = {
  perfil: 'med_simulados_perfil',
  simulados: 'med_simulados_data',
};

type AuthRoute = 'login' | 'signup' | 'signup-success';

function getAuthRouteFromPathname(): AuthRoute {
  if (typeof window === 'undefined') {
    return 'login';
  }

  const pathname = window.location.pathname.toLowerCase();
  if (pathname.includes('signup-success')) {
    return 'signup-success';
  }

  return pathname.includes('signup') ? 'signup' : 'login';
}

function navigateAuthRoute(route: AuthRoute, replace = false) {
  if (typeof window === 'undefined') {
    return;
  }

  const nextPath = route === 'signup' ? '/signup' : route === 'signup-success' ? '/signup-success' : '/login';
  if (replace) {
    window.history.replaceState({}, '', nextPath);
  } else {
    window.history.pushState({}, '', nextPath);
  }
}

function getStorageKeys(userId?: string) {
  if (!userId) {
    return LOCAL_STORAGE_KEYS;
  }

  return {
    perfil: `${LOCAL_STORAGE_KEYS.perfil}_${userId}`,
    simulados: `${LOCAL_STORAGE_KEYS.simulados}_${userId}`,
  };
}

function normalizePerfil(value: unknown): PerfilAluno | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<PerfilAluno>;
  return {
    nome: candidate.nome || PERFIL_PADRAO.nome,
    especialidadeAlvo: candidate.especialidadeAlvo || PERFIL_PADRAO.especialidadeAlvo,
    instituicaoAlvo: candidate.instituicaoAlvo || PERFIL_PADRAO.instituicaoAlvo,
    metaAcertosPercentual: typeof candidate.metaAcertosPercentual === 'number' ? candidate.metaAcertosPercentual : PERFIL_PADRAO.metaAcertosPercentual,
  };
}

function normalizeSimulados(value: unknown): Simulado[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value.filter((item): item is Simulado => Boolean(item && typeof item === 'object' && 'id' in item && 'nome' in item));
}

function readCachedData(userId?: string) {
  if (typeof window === 'undefined') {
    return { perfil: PERFIL_PADRAO, simulados: SIMULADOS_PADRAO };
  }

  const keys = getStorageKeys(userId);
  const fallbackPerfilRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.perfil);
  const fallbackSimuladosRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.simulados);
  const perfilRaw = localStorage.getItem(keys.perfil) ?? fallbackPerfilRaw;
  const simuladosRaw = localStorage.getItem(keys.simulados) ?? fallbackSimuladosRaw;

  let perfil = PERFIL_PADRAO;
  let simulados = SIMULADOS_PADRAO;

  try {
    if (perfilRaw) {
      const parsedPerfil = normalizePerfil(JSON.parse(perfilRaw));
      if (parsedPerfil) {
        perfil = parsedPerfil;
      }
    }
  } catch {
    perfil = PERFIL_PADRAO;
  }

  try {
    if (simuladosRaw) {
      const parsedSimulados = normalizeSimulados(JSON.parse(simuladosRaw));
      if (parsedSimulados) {
        simulados = parsedSimulados;
      }
    }
  } catch {
    simulados = SIMULADOS_PADRAO;
  }

  return { perfil, simulados };
}

function writeCachedData(userId: string | undefined, perfil: PerfilAluno, simulados: Simulado[]) {
  if (typeof window === 'undefined') {
    return;
  }

  const keys = getStorageKeys(userId);
  localStorage.setItem(keys.perfil, JSON.stringify(perfil));
  localStorage.setItem(keys.simulados, JSON.stringify(simulados));
}

function readOnboardingDraft(): PerfilAluno | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = sessionStorage.getItem(ONBOARDING_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return normalizePerfil(JSON.parse(raw));
  } catch {
    return null;
  }
}

function saveOnboardingDraft(perfil: PerfilAluno) {
  if (typeof window === 'undefined') {
    return;
  }

  sessionStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(perfil));
}

function clearOnboardingDraft() {
  if (typeof window === 'undefined') {
    return;
  }

  sessionStorage.removeItem(ONBOARDING_STORAGE_KEY);
}

function saveSignupEmail(email: string) {
  if (typeof window === 'undefined') {
    return;
  }

  sessionStorage.setItem('med_simulados_signup_email', email);
}

function readSignupEmail() {
  if (typeof window === 'undefined') {
    return null;
  }

  return sessionStorage.getItem('med_simulados_signup_email');
}

function clearSignupEmail() {
  if (typeof window === 'undefined') {
    return;
  }

  sessionStorage.removeItem('med_simulados_signup_email');
}

// Dados iniciais padrões para o estudante de medicina ja iniciar com conteúdo visual
const PERFIL_PADRAO: PerfilAluno = {
  nome: 'Dra. Juliana Souza',
  especialidadeAlvo: 'Cirurgia Geral',
  instituicaoAlvo: 'ENARE / USP-SP',
  metaAcertosPercentual: 80,
};

const SIMULADOS_PADRAO: Simulado[] = [
  {
    id: 'sim-padrao-1',
    nome: 'Gabarito Ciclo 1 - Simulado ENARE R1',
    data: '2026-03-10',
    tempoResolucaoMinutos: 240,
    desempenhoAreas: {
      'Clínica Médica': { acertos: 14, total: 20 },
      'Cirurgia Geral': { acertos: 11, total: 20 },
      'Pediatria': { acertos: 15, total: 20 },
      'Ginecologia e Obstetrícia': { acertos: 16, total: 20 },
      'Medicina Preventiva': { acertos: 12, total: 20 },
    },
    mediaParticipantes: 61.2,
    desvioPadrao: 9.4,
    posicaoRanking: 345,
    totalParticipantes: 2400,
    cadernoErros: 'Errei duas de G.O. sobre distocia de ombro e manobras de desprendimento. Em preventiva, caí no cálculo da densidade de incidência e viés de seleção. Estudar critérios de Ranson e pontuações para Pancreatite Aguda em cirurgia.',
    acertosTotais: 68,
    questoesTotais: 100,
    percentualAcertos: 68.0,
    zScore: 0.723,
    percentilEstimado: 76.5,
  },
  {
    id: 'sim-padrao-2',
    nome: 'Gabarito Ciclo 2 - Simulado USP-SP R1',
    data: '2026-04-15',
    tempoResolucaoMinutos: 230,
    desempenhoAreas: {
      'Clínica Médica': { acertos: 16, total: 20 },
      'Cirurgia Geral': { acertos: 13, total: 20 },
      'Pediatria': { acertos: 15, total: 20 },
      'Ginecologia e Obstetrícia': { acertos: 17, total: 20 },
      'Medicina Preventiva': { acertos: 14, total: 20 },
    },
    mediaParticipantes: 66.8,
    desvioPadrao: 10.1,
    posicaoRanking: 184,
    totalParticipantes: 1800,
    cadernoErros: 'HAS refratária com espironolactona (bloqueio do receptor mineralocorticoide). Errei marco de desenvolvimento motor infantil aos 6 meses. Focar em abdome agudo obstrutivo versus inflamatório em clínica cirúrgica.',
    acertosTotais: 75,
    questoesTotais: 100,
    percentualAcertos: 75.0,
    zScore: 0.811,
    percentilEstimado: 79.1,
  },
  {
    id: 'sim-padrao-3',
    nome: 'Gabarito Ciclo 3 - Simulado SUS-SP R1',
    data: '2026-05-20',
    tempoResolucaoMinutos: 210,
    desempenhoAreas: {
      'Clínica Médica': { acertos: 17, total: 20 },
      'Cirurgia Geral': { acertos: 15, total: 20 },
      'Pediatria': { acertos: 18, total: 20 },
      'Ginecologia e Obstetrícia': { acertos: 18, total: 20 },
      'Medicina Preventiva': { acertos: 16, total: 20 },
    },
    mediaParticipantes: 69.4,
    desvioPadrao: 8.8,
    posicaoRanking: 45,
    totalParticipantes: 3100,
    cadernoErros: 'Preventiva errada sobre vigilância epidemiológica e reações adversas a sêxtupla viral. Errei classificação de Nyhus para hérnias ingunais. Estudar hérnia femoral que tem maior risco de encarceramento agudo.',
    acertosTotais: 84,
    questoesTotais: 100,
    percentualAcertos: 84.0,
    zScore: 1.659,
    percentilEstimado: 95.1,
  }
];

export default function App() {
  const [authRoute, setAuthRoute] = useState<AuthRoute>(() => getAuthRouteFromPathname());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'simulados' | 'erros' | 'ai' | 'perfil'>('dashboard');
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<PerfilAluno>(PERFIL_PADRAO);
  const [simulados, setSimulados] = useState<Simulado[]>(SIMULADOS_PADRAO);
  const [showForm, setShowForm] = useState(false);
  const [simuladoEditando, setSimuladoEditando] = useState<Simulado | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [signupEmail, setSignupEmail] = useState<string | null>(() => readSignupEmail());
  const [resendBusy, setResendBusy] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    const handlePopState = () => {
      setAuthRoute(getAuthRouteFromPathname());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (session) {
      clearOnboardingDraft();
      clearSignupEmail();
    }
  }, [session]);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) {
        return;
      }

      setSession(data.session);
      setAuthLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setPerfil(PERFIL_PADRAO);
      setSimulados(SIMULADOS_PADRAO);
      setDataLoading(false);
      return;
    }

    let cancelled = false;

    const loadUserData = async () => {
      setDataLoading(true);
      setAuthError(null);

      try {
        const { data, error } = await supabase
          .from(SUPABASE_TABLE)
          .select('perfil, simulados')
          .eq('user_id', session.user.id)
          .maybeSingle<UserAppDataRecord>();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        const cached = readCachedData(session.user.id);
        const onboardingDraft = readOnboardingDraft();

        if (data) {
          const loadedPerfil = normalizePerfil(data.perfil) ?? cached.perfil;
          const loadedSimulados = normalizeSimulados(data.simulados) ?? cached.simulados;

          if (!cancelled) {
            setPerfil(loadedPerfil);
            setSimulados(loadedSimulados);
          }
          writeCachedData(session.user.id, loadedPerfil, loadedSimulados);
          return;
        }

        if (!cancelled) {
          setPerfil(onboardingDraft ?? cached.perfil);
          setSimulados(cached.simulados);
        }

        const { error: upsertError } = await supabase.from(SUPABASE_TABLE).upsert({
          user_id: session.user.id,
          perfil: onboardingDraft ?? cached.perfil,
          simulados: cached.simulados,
          updated_at: new Date().toISOString(),
        });

        if (upsertError) {
          throw upsertError;
        }
      } catch (error: any) {
        console.error('Falha ao carregar dados do Supabase', error);
        if (!cancelled) {
          setAuthError('Não foi possível carregar os dados do seu perfil no Supabase.');
          const cached = readCachedData(session.user.id);
          const onboardingDraftFallback = readOnboardingDraft();
          setPerfil(onboardingDraftFallback ?? cached.perfil);
          setSimulados(cached.simulados);
        }
      } finally {
        if (!cancelled) {
          setDataLoading(false);
        }
      }
    };

    void loadUserData();

    return () => {
      cancelled = true;
    };
  }, [session]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const persistUserData = async (nextPerfil: PerfilAluno, nextSimulados: Simulado[]) => {
    writeCachedData(session?.user.id, nextPerfil, nextSimulados);

    if (!session) {
      return;
    }

    const { error } = await supabase.from(SUPABASE_TABLE).upsert({
      user_id: session.user.id,
      perfil: nextPerfil,
      simulados: nextSimulados,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }
  };

  const savePerfilToCache = (newPerfil: PerfilAluno) => {
    setPerfil(newPerfil);
    triggerToast('Configurações de perfil atualizadas!');
    void persistUserData(newPerfil, simulados)
      .catch((error) => {
        console.error('Falha ao salvar perfil', error);
        setAuthError('Perfil salvo localmente, mas houve falha na sincronização com o Supabase.');
        triggerToast('Perfil salvo localmente. Falha na sincronização com Supabase.');
      });
  };

  const saveSimuladosToCache = (newSimulados: Simulado[]) => {
    setSimulados(newSimulados);
    void persistUserData(perfil, newSimulados)
      .catch((error) => {
        console.error('Falha ao salvar simulados', error);
        setAuthError('Simulados salvos localmente, mas houve falha na sincronização com o Supabase.');
        triggerToast('Simulados salvos localmente. Falha na sincronização com Supabase.');
      });
  };

  // 3. Cadastrar ou Editar Simulado
  const handleSaveSimulado = (simulado: Simulado) => {
    let updatedSimulados: Simulado[];
    
    if (simuladoEditando) {
      // Editar
      updatedSimulados = simulados.map(s => s.id === simulado.id ? simulado : s);
      triggerToast('Gabarito do simulado atualizado com sucesso!');
    } else {
      // Novo
      updatedSimulados = [simulado, ...simulados];
      triggerToast('Desempenho do simulado gravado com sucesso!');
    }

    saveSimuladosToCache(updatedSimulados);
    setShowForm(false);
    setSimuladoEditando(null);
  };

  // 4. Deletar Simulado
  const handleDeleteSimulado = (id: string) => {
    const updated = simulados.filter(s => s.id !== id);
    saveSimuladosToCache(updated);
    triggerToast('Simulado removido do histórico.');
  };

  // 5. Iniciar Edição
  const handleEditSimuladoClick = (simulado: Simulado) => {
    setSimuladoEditando(simulado);
    setShowForm(true);
  };

  // 6. Backup: Exportar como arquivo JSON
  const handleExportData = () => {
    const packageData = {
      perfil,
      simulados,
      exportVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
    };

    const str = JSON.stringify(packageData, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_simulados_${perfil.nome.toLowerCase().replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerToast('Perfil e simulados exportados com sucesso!');
  };

  // 7. Backup: Importar de arquivo JSON
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.perfil && parsed.simulados) {
          const importedPerfil = normalizePerfil(parsed.perfil) ?? PERFIL_PADRAO;
          const importedSimulados = normalizeSimulados(parsed.simulados) ?? SIMULADOS_PADRAO;

          setPerfil(importedPerfil);
          setSimulados(importedSimulados);

          void persistUserData(importedPerfil, importedSimulados)
            .then(() => triggerToast('Importação concluída e sincronizada com sucesso!'))
            .catch((error) => {
              console.error('Falha ao sincronizar importação', error);
              setAuthError('Importação salva localmente, mas falhou a sincronização com o Supabase.');
              triggerToast('Importação concluída localmente, mas sem sincronização com Supabase.');
            });
        } else {
          alert('Arquivo inválido. Formato incompatível de prontuário.');
        }
      } catch (err) {
        alert('Falha ao decodificar JSON de backup.');
      }
    };
    reader.readAsText(file);
    // Resetar input
    e.target.value = '';
  };

  // 8. Chamar comando de impressão para salvar PDF
  const handlePrintPdf = () => {
    window.print();
  };

  const handleSignIn = async (email: string, password: string) => {
    setAuthError(null);
    setAuthNotice(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
      return;
    }
  };

  const handleSignUp = async (payload: { email: string; password: string; perfil: PerfilAluno }) => {
    setAuthError(null);
    setAuthNotice(null);
    setResendNotice(null);
    setResendError(null);
    saveOnboardingDraft(payload.perfil);
    saveSignupEmail(payload.email);
    const { error } = await supabase.auth.signUp({ email: payload.email, password: payload.password });
    if (error) {
      setAuthError(error.message);
      return;
    }
    setAuthNotice('Conta criada. Se o Supabase estiver com confirmação de e-mail ativa, verifique sua caixa de entrada para concluir o acesso.');
    navigateAuthRoute('signup-success');
    setAuthRoute('signup-success');
  };

  const handleResendConfirmation = async () => {
    if (!signupEmail) {
      setResendError('Não há e-mail salvo para reenviar a confirmação.');
      return;
    }

    setResendBusy(true);
    setResendError(null);
    setResendNotice(null);

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: signupEmail,
    });

    if (error) {
      setResendError(error.message);
    } else {
      setResendNotice('E-mail de confirmação reenviado. Verifique inbox, promoções e spam.');
    }

    setResendBusy(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setPerfil(PERFIL_PADRAO);
    setSimulados(SIMULADOS_PADRAO);
    setShowForm(false);
    setSimuladoEditando(null);
    triggerToast('Sessão encerrada com sucesso.');
  };

  const metricas: MetricasGlobais = calcularMetricasGlobais(simulados);

  if (authLoading || (session && dataLoading)) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center px-4">
        <div className="glass-panel-heavy max-w-md w-full p-8 rounded-3xl border border-white/10 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto">
            <Brain size={28} className="animate-pulse" />
          </div>
          <h1 className="text-xl font-bold text-white">Sincronizando sua sessão</h1>
          <p className="text-sm text-slate-400">Carregando autenticação e dados do Supabase...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    if (authRoute === 'signup') {
      return (
        <SignupGate
          busy={false}
          error={authError}
          notice={authNotice}
          configError={isSupabaseConfigured ? null : 'As variáveis do Supabase não foram embutidas no build. Na Vercel, use VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY em Production e faça novo deploy.'}
          onBackToLogin={() => {
            setAuthError(null);
            setAuthNotice(null);
            navigateAuthRoute('login');
            setAuthRoute('login');
          }}
          onSignUp={handleSignUp}
        />
      );
    }

    if (authRoute === 'signup-success') {
      return (
        <SignupSuccessGate
          email={signupEmail}
          notice={authNotice}
          resendBusy={resendBusy}
          resendNotice={resendNotice}
          resendError={resendError}
          onBackToLogin={() => {
            setAuthError(null);
            setAuthNotice(null);
            navigateAuthRoute('login');
            setAuthRoute('login');
          }}
          onResendConfirmation={() => void handleResendConfirmation()}
        />
      );
    }

    return (
      <AuthGate
        busy={false}
        error={authError}
        configError={isSupabaseConfigured ? null : 'As variáveis do Supabase não foram embutidas no build. Na Vercel, use VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY em Production e faça novo deploy.'}
        notice={authNotice}
        onSignIn={handleSignIn}
        onGoToSignUp={() => {
          setAuthError(null);
          setAuthNotice(null);
          navigateAuthRoute('signup');
          setAuthRoute('signup');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col relative overflow-x-hidden print:bg-white print:text-black" id="med-simulados-app">
      {/* Background Mesh Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-blue-600/15 rounded-full blur-[130px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/15 rounded-full blur-[150px] pointer-events-none z-0"></div>
      <div className="absolute top-[30%] right-[10%] w-[35%] h-[35%] bg-purple-600/10 rounded-full blur-[110px] pointer-events-none z-0"></div>

      {/* CARD DE IMPRESSÃO ESTILIZADO (Invisível no render do site, visível no printer) */}
      <PrintReport simulados={simulados} perfil={perfil} />

      {/* HEADER PRINCIPAL CLINICO */}
      <header className="bg-white/5 backdrop-blur-md border-b border-white/10 shrink-0 print:hidden shadow-lg z-10" id="main-header">
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20" id="logo-icon-container">
              <GraduationCap size={24} className="text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5" id="app-title-main">
                MedAnalysis <span className="text-blue-400 italic">Pro</span>
              </h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold" id="app-subtitle-main">Academic Performance Tracker</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-white/5 border border-white/10 p-3 rounded-2xl backdrop-blur-md" id="header-student-profile-info">
            <div className="text-xs">
              <span className="text-slate-400 font-medium block">Candidato</span>
              <span className="font-bold text-white pr-2 border-r border-white/10">{perfil.nome}</span>
            </div>
            <div className="text-xs">
              <span className="text-slate-400 font-medium block">Dream Institution</span>
              <span className="font-bold text-emerald-400 pr-2 border-r border-white/10">{perfil.instituicaoAlvo}</span>
            </div>
            <div className="text-xs">
              <span className="text-slate-400 font-medium block">Relação Alvo / Aproveit.</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1 font-mono">
                {perfil.metaAcertosPercentual}% vs <span className="text-blue-400 font-extrabold">{metricas.porcentagemAcertosGeral.toFixed(1)}%</span>
              </span>
            </div>
            <div className="text-xs">
              <span className="text-slate-400 font-medium block">Sessão</span>
              <span className="font-bold text-blue-300 block max-w-44 truncate">{session.user.email}</span>
            </div>
            <button
              onClick={() => void handleSignOut()}
              className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold transition-all"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* SUBHEAD DE MENU E AÇÕES DE BACKUP / IMPRESSÃO */}
      <div className="bg-white/3 border-b border-white/8 py-3 shrink-0 print:hidden z-10" id="app-subhead">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Menu de Abas */}
          <nav className="flex flex-wrap items-center gap-1.5" id="navigation-tabs">
            <button
              onClick={() => { setActiveTab('dashboard'); setShowForm(false); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 border border-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              id="tab-dashboard"
            >
              <LayoutDashboard size={14} />
              Balanço Geral
            </button>
            <button
              onClick={() => { setActiveTab('simulados'); setShowForm(false); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'simulados' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 border border-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              id="tab-simulados"
            >
              <ClipboardList size={14} />
              Meus Simulados
            </button>
            <button
              onClick={() => { setActiveTab('erros'); setShowForm(false); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'erros' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 border border-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              id="tab-erros"
            >
              <BookOpen size={14} />
              Caderno de Erros
            </button>
            <button
              onClick={() => { setActiveTab('ai'); setShowForm(false); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'ai' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 border border-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              id="tab-ai"
            >
              <Brain size={14} />
              Foco com IA (Groq)
            </button>
            <button
              onClick={() => { setActiveTab('perfil'); setShowForm(false); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'perfil' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 border border-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              id="tab-perfil"
            >
              <Settings size={14} />
              Configurar Alvo
            </button>
          </nav>

          {/* Ações de Importação, Exportação e Impressão de PDF */}
          <div className="flex flex-wrap items-center gap-2" id="backup-actions-container">
            <button
              onClick={handlePrintPdf}
              className="px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold"
              title="Gerar PDF para Impressão do Prontuário"
              id="btn-print-pdf-top"
            >
              <Printer size={15} />
              <span>Imprimir PDF</span>
            </button>

            <button
              onClick={handleExportData}
              className="px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold"
              title="Baixar Prontuário JSON de Backup"
              id="btn-export-backup"
            >
              <FileDown size={15} />
              <span>Exportar</span>
            </button>

            <label
              className="px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              title="Importar Prontuário JSON de Backup"
              htmlFor="upload-backup-input"
            >
              <Upload size={15} />
              <span>Importar</span>
              <input
                id="upload-backup-input"
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* ÁREA DE TOAST DE INFORMAÇÃO */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#0f172a]/95 border border-white/15 text-slate-100 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md text-xs font-bold uppercase tracking-wider flex items-center gap-2"
          >
            <CheckCircle size={15} className="text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ÁREA PRINCIPAL DO CONTEÚDO */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 print:hidden z-10" id="main-content-flow">
        {showForm ? (
          <SimuladoForm
            simuladoEditando={simuladoEditando}
            onSave={handleSaveSimulado}
            onCancel={() => { setShowForm(false); setSimuladoEditando(null); }}
          />
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Breve boas vindas */}
                <div className="bg-gradient-to-r from-blue-950/40 to-emerald-950/40 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/10 flex justify-between items-center flex-col md:flex-row gap-4">
                  <div className="space-y-1.5 text-center md:text-left">
                    <h2 className="text-lg font-black uppercase tracking-wider text-slate-100 flex items-center gap-2 justify-center md:justify-start">
                      Ficha de Desempenho
                    </h2>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                      Dra. {perfil.nome}, bem-vinda de volta ao painel de balanceamento clínico. Você está cadastrada no escopo ativo de concorrência para a especialidade de <span className="font-extrabold text-white underline">{perfil.especialidadeAlvo}</span> na instituição <span className="font-extrabold text-white underline">{perfil.instituicaoAlvo}</span>, cuja meta estipulada é atingir <span className="font-extrabold text-blue-400 font-mono text-sm">{perfil.metaAcertosPercentual}%</span>.
                    </p>
                  </div>
                  <button
                    onClick={() => { setShowForm(true); setSimuladoEditando(null); }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/15 shrink-0"
                    id="btn-registar-simulado-dashboard"
                  >
                    Registrar Simulado
                  </button>
                </div>

                <Dashboard simulados={simulados} perfil={perfil} />
              </motion.div>
            )}

            {activeTab === 'simulados' && (
              <motion.div
                key="simulados"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Card instrucional da lista de simulados */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-xl flex items-center justify-between flex-col md:flex-row gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Histórico Geral de Baterias de Exame</h3>
                    <p className="text-xs text-slate-400 mt-1">Busque, filtre e expanda simulados para ver o Z-score de concorrência e percentil estimado</p>
                  </div>
                  <button
                    onClick={() => { setShowForm(true); setSimuladoEditando(null); }}
                    className="px-5 py-2 hover:bg-blue-550 text-white font-bold bg-blue-600 text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shrink-0 border border-blue-500/10"
                  >
                    Novo Simulado
                  </button>
                </div>

                <SimuladosList
                  simulados={simulados}
                  onDelete={handleDeleteSimulado}
                  onEdit={handleEditSimuladoClick}
                  onAddNew={() => { setShowForm(true); setSimuladoEditando(null); }}
                />
              </motion.div>
            )}

            {activeTab === 'erros' && (
              <motion.div
                key="erros"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <CadernoErros simulados={simulados} />
              </motion.div>
            )}

            {activeTab === 'ai' && (
              <motion.div
                key="ai"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <AiInsights simulados={simulados} perfil={perfil} />
              </motion.div>
            )}

            {activeTab === 'perfil' && (
              <motion.div
                key="perfil"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <PerfilForm perfil={perfil} onSave={savePerfilToCache} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* FOOTER CLINICO */}
      <footer className="bg-white/2 border-t border-white/8 py-5 print:hidden text-center text-[10px] text-slate-500 shrink-0 uppercase tracking-widest font-semibold z-10" id="app-footer">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <span>MD-SIMULADOS • Prontuário e Ficha de Triagem R1</span>
          <span>{session ? 'DADOS SINCRONIZADOS COM SUPABASE' : 'DADOS CRIPTOGRAFADOS E SALVOS LOCALMENTE'}</span>
        </div>
      </footer>
    </div>
  );
}
