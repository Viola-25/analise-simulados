/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Loader2, Mail, Lock, User, Activity, GraduationCap, Target, ShieldCheck, ArrowLeft, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { PerfilAluno } from '../types';
import { BR_STATES } from '../utils/brStates';

interface SignupGateProps {
  busy: boolean;
  error: string | null;
  configError?: string | null;
  notice: string | null;
  onBackToLogin: () => void;
  onSignUp: (payload: { email: string; password: string; perfil: PerfilAluno }) => Promise<void>;
}

export default function SignupGate({ busy, error, configError, notice, onBackToLogin, onSignUp }: SignupGateProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nome, setNome] = useState('');
  const [estado, setEstado] = useState('');
  const [faculdade, setFaculdade] = useState('');
  const [semestre, setSemestre] = useState('');
  const [especialidadeAlvo, setEspecialidadeAlvo] = useState('');
  const [instituicaoAlvo, setInstituicaoAlvo] = useState('');
  const [metaAcertosPercentual, setMetaAcertosPercentual] = useState(80);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localBusy, setLocalBusy] = useState(false);

  const submitting = busy || localBusy;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim() || !password.trim() || !nome.trim() || !estado.trim() || !faculdade.trim() || !semestre.trim() || !especialidadeAlvo.trim() || !instituicaoAlvo.trim()) {
      setLocalError('Preencha e-mail, senha, estado, faculdade, semestre e os dados iniciais do perfil para continuar.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('A senha e a confirmação precisam ser iguais.');
      return;
    }

    setLocalBusy(true);
    try {
      await onSignUp({
        email: email.trim(),
        password,
        perfil: {
          nome: nome.trim(),
          estado: estado.trim(),
          faculdade: faculdade.trim(),
          semestre: semestre.trim(),
          especialidadeAlvo: especialidadeAlvo.trim(),
          instituicaoAlvo: instituicaoAlvo.trim(),
          metaAcertosPercentual: Number(metaAcertosPercentual) || 80,
        },
      });
    } finally {
      setLocalBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center px-4 py-8 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.14),_transparent_30%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-5xl grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-6"
      >
        <div className="glass-panel-heavy rounded-3xl border border-white/10 p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShieldCheck size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">Criar conta</h1>
              <p className="text-xs text-slate-400 uppercase tracking-[0.25em] font-semibold">Primeiro acesso com perfil inicial</p>
            </div>
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-slate-100 leading-tight max-w-xl">
            Preencha seus dados iniciais agora para que o primeiro login já abra com seu perfil pronto.
          </h2>

          <div className="mt-6 space-y-3 text-sm text-slate-300 leading-relaxed">
            <div className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0" />
              <p>Depois de criar a conta, o Supabase pode enviar um e-mail de confirmação. Verifique a caixa de entrada e o spam.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mt-2 shrink-0" />
              <p>Seu nome, estado, faculdade, semestre, especialidade, instituição e meta serão usados para montar o perfil inicial automaticamente.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-amber-400 mt-2 shrink-0" />
              <p>Se a confirmação por e-mail estiver ligada, você volta depois para entrar na conta.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onBackToLogin}
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Voltar para login
          </button>
        </div>

        <div className="glass-card rounded-3xl border border-white/10 p-8 shadow-2xl">
          <h3 className="text-lg font-bold text-slate-100 uppercase tracking-wider mb-2">Dados da conta</h3>
          <p className="text-xs text-slate-400 mb-6">
            O cadastro usa o e-mail do Supabase e cria um onboarding inicial para o primeiro login.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Mail size={14} /> E-mail
              </span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:border-emerald-500 transition-all placeholder:text-slate-500" />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Lock size={14} /> Senha
                </span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Crie uma senha" className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:border-emerald-500 transition-all placeholder:text-slate-500" />
              </label>

              <label className="block space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Lock size={14} /> Confirmar senha
                </span>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a senha" className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:border-emerald-500 transition-all placeholder:text-slate-500" />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <User size={14} /> Nome completo
                </span>
                <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:border-emerald-500 transition-all placeholder:text-slate-500" />
              </label>

              <label className="block space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  Estado
                </span>
                <select value={estado} onChange={(e) => setEstado(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:border-emerald-500 transition-all text-sm" required>
                  <option value="" className="bg-[#0f172a]">Selecione</option>
                  {BR_STATES.map((item) => (
                    <option key={item} value={item} className="bg-[#0f172a]">
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2 md:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  Faculdade
                </span>
                <input type="text" value={faculdade} onChange={(e) => setFaculdade(e.target.value)} placeholder="Ex: Universidade Federal de ..." className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:border-emerald-500 transition-all placeholder:text-slate-500" required />
              </label>

              <label className="block space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  Semestre
                </span>
                <input type="number" min="1" max="12" value={semestre} onChange={(e) => setSemestre(e.target.value)} placeholder="Ex: 8" className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:border-emerald-500 transition-all placeholder:text-slate-500" required />
              </label>

              <label className="block space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Activity size={14} /> Especialidade alvo
                </span>
                <input type="text" value={especialidadeAlvo} onChange={(e) => setEspecialidadeAlvo(e.target.value)} placeholder="Ex: Clínica Médica" className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:border-emerald-500 transition-all placeholder:text-slate-500" />
              </label>

              <label className="block space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <GraduationCap size={14} /> Instituição alvo
                </span>
                <input type="text" value={instituicaoAlvo} onChange={(e) => setInstituicaoAlvo(e.target.value)} placeholder="Ex: USP / ENARE" className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:border-emerald-500 transition-all placeholder:text-slate-500" />
              </label>

              <label className="block space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Target size={14} /> Meta de acertos
                </span>
                <input type="number" min="10" max="100" value={metaAcertosPercentual} onChange={(e) => setMetaAcertosPercentual(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:border-emerald-500 transition-all placeholder:text-slate-500" />
              </label>
            </div>

            {configError && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 px-4 py-3 text-xs text-amber-200 leading-relaxed">
                {configError}
              </div>
            )}

            {(localError || error) && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 px-4 py-3 text-xs text-rose-300 leading-relaxed">
                {localError || error}
              </div>
            )}

            {notice && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 px-4 py-3 text-xs text-emerald-200 leading-relaxed">
                {notice}
              </div>
            )}

            <button type="submit" disabled={submitting} className="w-full px-4 py-3 rounded-xl border border-emerald-500/20 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              Criar conta e avançar
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}