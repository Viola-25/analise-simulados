/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Simulado, PerfilAluno } from './types';
import { calcularMetricasGlobais, MetricasGlobais } from './utils/stats';
import Dashboard from './components/Dashboard';
import SimuladosList from './components/SimuladosList';
import SimuladoForm from './components/SimuladoForm';
import PerfilForm from './components/PerfilForm';
import CadernoErros from './components/CadernoErros';
import AiInsights from './components/AiInsights';
import PrintReport from './components/PrintReport';
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'simulados' | 'erros' | 'ai' | 'perfil'>('dashboard');
  const [perfil, setPerfil] = useState<PerfilAluno>(PERFIL_PADRAO);
  const [simulados, setSimulados] = useState<Simulado[]>(SIMULADOS_PADRAO);
  const [showForm, setShowForm] = useState(false);
  const [simuladoEditando, setSimuladoEditando] = useState<Simulado | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Carregar dados do localStorage ao montar
  useEffect(() => {
    const savedPerfil = localStorage.getItem('med_simulados_perfil');
    const savedSimulados = localStorage.getItem('med_simulados_data');
    
    if (savedPerfil) {
      try {
        setPerfil(JSON.parse(savedPerfil));
      } catch (e) {
        console.error('Falha ao restaurar perfil', e);
      }
    }
    if (savedSimulados) {
      try {
        setSimulados(JSON.parse(savedSimulados));
      } catch (e) {
        console.error('Falha ao restaurar simulados', e);
      }
    }
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 2. Persistir no localStorage
  const savePerfilToCache = (newPerfil: PerfilAluno) => {
    setPerfil(newPerfil);
    localStorage.setItem('med_simulados_perfil', JSON.stringify(newPerfil));
    triggerToast('Configurações de perfil atualizadas!');
  };

  const saveSimuladosToCache = (newSimulados: Simulado[]) => {
    setSimulados(newSimulados);
    localStorage.setItem('med_simulados_data', JSON.stringify(newSimulados));
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
          setPerfil(parsed.perfil);
          setSimulados(parsed.simulados);
          
          localStorage.setItem('med_simulados_perfil', JSON.stringify(parsed.perfil));
          localStorage.setItem('med_simulados_data', JSON.stringify(parsed.simulados));
          
          triggerToast('Importação concluída com sucesso!');
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

  const metricas: MetricasGlobais = calcularMetricasGlobais(simulados);

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
              Foco com IA (Gemini)
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
          <span>DADOS CRIPTOGRAFADOS E SALVOS LOCALMENTE</span>
        </div>
      </footer>
    </div>
  );
}
