/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Loader2, Mail, Lock, LogIn, UserPlus, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthGateProps {
  busy: boolean;
  error: string | null;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
}

export default function AuthGate({ busy, error, onSignIn, onSignUp }: AuthGateProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localBusy, setLocalBusy] = useState<'signin' | 'signup' | null>(null);

  const runAction = async (action: 'signin' | 'signup') => {
    if (!email.trim() || !password.trim()) {
      return;
    }

    setLocalBusy(action);
    try {
      if (action === 'signin') {
        await onSignIn(email.trim(), password);
      } else {
        await onSignUp(email.trim(), password);
      }
    } finally {
      setLocalBusy(null);
    }
  };

  const submitting = busy || localBusy !== null;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center px-4 py-8 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.14),_transparent_30%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-4xl grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6"
      >
        <div className="glass-panel-heavy rounded-3xl border border-white/10 p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShieldCheck size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">MedAnalysis Pro</h1>
              <p className="text-xs text-slate-400 uppercase tracking-[0.25em] font-semibold">Acesso com Supabase</p>
            </div>
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-slate-100 leading-tight max-w-xl">
            Entre com sua conta para salvar perfil, simulados e evolução em qualquer dispositivo.
          </h2>

          <p className="mt-4 text-sm text-slate-300 leading-relaxed max-w-xl">
            O login usa Supabase Auth gratuito. Depois do acesso, seus dados ficam sincronizados por usuário e você deixa de depender do JSON exportado manualmente.
          </p>

          <div className="mt-8 space-y-3 text-sm text-slate-300">
            <div className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0" />
              <p>Crie a conta com e-mail e senha.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mt-2 shrink-0" />
              <p>Salve perfil e simulados automaticamente na sua base.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-amber-400 mt-2 shrink-0" />
              <p>Troque de computador sem perder o histórico.</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-3xl border border-white/10 p-8 shadow-2xl">
          <h3 className="text-lg font-bold text-slate-100 uppercase tracking-wider mb-2">Entrar ou criar conta</h3>
          <p className="text-xs text-slate-400 mb-6">
            Use o mesmo e-mail nos próximos acessos. Se a confirmação por e-mail estiver ativa no Supabase, você receberá uma mensagem de verificação.
          </p>

          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Mail size={14} /> E-mail
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-500"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Lock size={14} /> Senha
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-500"
              />
            </label>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-950/20 px-4 py-3 text-xs text-rose-300 leading-relaxed">
              {error}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => void runAction('signin')}
              disabled={submitting}
              className="px-4 py-3 rounded-xl border border-blue-500/20 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting && localBusy === 'signin' ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              Entrar
            </button>
            <button
              type="button"
              onClick={() => void runAction('signup')}
              disabled={submitting}
              className="px-4 py-3 rounded-xl border border-emerald-500/20 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting && localBusy === 'signup' ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              Criar conta
            </button>
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
            Se você já usava a plataforma sem conta, o app pode migrar seus dados locais para o primeiro login automático.
          </p>
        </div>
      </motion.div>
    </div>
  );
}