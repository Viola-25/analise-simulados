/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { PerfilAluno } from '../types';
import SearchableFaculdadeSelect from './SearchableFaculdadeSelect';
import { User, Activity, GraduationCap, Target, Save, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { BR_STATES } from '../utils/brStates';

interface PerfilFormProps {
  perfil: PerfilAluno;
  onSave: (perfil: PerfilAluno) => void;
}

export default function PerfilForm({ perfil, onSave }: PerfilFormProps) {
  const [nome, setNome] = useState(perfil.nome);
  const [estado, setEstado] = useState(perfil.estado);
  const [faculdade, setFaculdade] = useState(perfil.faculdade);
  const [semestre, setSemestre] = useState(perfil.semestre);
  const [especialidadeAlvo, setEspecialidadeAlvo] = useState(perfil.especialidadeAlvo);
  const [instituicaoAlvo, setInstituicaoAlvo] = useState(perfil.instituicaoAlvo);
  const [metaAcertosPercentual, setMetaAcertosPercentual] = useState(perfil.metaAcertosPercentual);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setNome(perfil.nome);
    setEstado(perfil.estado);
    setFaculdade(perfil.faculdade);
    setSemestre(perfil.semestre);
    setEspecialidadeAlvo(perfil.especialidadeAlvo);
    setInstituicaoAlvo(perfil.instituicaoAlvo);
    setMetaAcertosPercentual(perfil.metaAcertosPercentual);
  }, [perfil]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      nome: nome.trim() || 'Estudante de Medicina',
      estado: estado.trim() || 'Não informado',
      faculdade: faculdade.trim() || 'Não informada',
      semestre: semestre.trim() || 'Não informado',
      especialidadeAlvo: especialidadeAlvo.trim() || 'Residência Médica',
      instituicaoAlvo: instituicaoAlvo.trim() || 'Instituição Alvo',
      metaAcertosPercentual: Number(metaAcertosPercentual) || 80,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="glass-card p-6 md:p-8 max-w-2xl mx-auto border border-white/10 shadow-2xl"
      id="perfil-form-container"
    >
      <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/25" id="perfil-icon-box">
          <GraduationCap size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-100 uppercase tracking-wider" id="perfil-title">Configurações do Perfil</h2>
          <p className="text-xs text-slate-400" id="perfil-subtitle">Adapte a plataforma com base nos seus objetivos para a residência médica</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" id="perfil-form-element">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5" htmlFor="nome-input">
              <User size={14} className="text-slate-400" />
              Nome Completo
            </label>
            <input
              id="nome-input"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Seu nome"
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 focus:border-blue-500 focus:bg-white/8 outline-none text-white bg-white/3 transition-all text-sm placeholder-slate-500 font-sans"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5" htmlFor="estado-input">
              <Activity size={14} className="text-slate-400" />
              Estado
            </label>
            <select
              id="estado-input"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 focus:border-blue-500 focus:bg-white/8 outline-none text-white bg-white/3 transition-all text-sm"
              required
            >
              <option value="" className="bg-[#0f172a]">Selecione</option>
              {BR_STATES.map((item) => (
                <option key={item} value={item} className="bg-[#0f172a]">
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5" htmlFor="faculdade-input">
              <GraduationCap size={14} className="text-slate-400" />
              Faculdade
            </label>
            <div>
              <SearchableFaculdadeSelect
                id="faculdade-input"
                value={faculdade}
                onSelect={(v) => setFaculdade(v)}
                placeholder="Ex: Universidade Federal de..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5" htmlFor="semestre-input">
              <Target size={14} className="text-slate-400" />
              Semestre
            </label>
            <input
              id="semestre-input"
              type="number"
              min="1"
              max="12"
              value={semestre}
              onChange={(e) => setSemestre(e.target.value)}
              placeholder="Ex: 8"
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 focus:border-blue-500 focus:bg-white/8 outline-none text-white bg-white/3 transition-all text-sm placeholder-slate-500 font-sans"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5" htmlFor="especialidade-input">
              <Activity size={14} className="text-slate-400" />
              Especialidade de Interesse
            </label>
            <input
              id="especialidade-input"
              type="text"
              value={especialidadeAlvo}
              onChange={(e) => setEspecialidadeAlvo(e.target.value)}
              placeholder="Ex: Cirurgia Plástica, Pediatria"
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 focus:border-blue-500 focus:bg-white/8 outline-none text-white bg-white/3 transition-all text-sm placeholder-slate-500 font-sans"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5" htmlFor="instituicao-input">
              <GraduationCap size={14} className="text-slate-400" />
              Instituição-alvo
            </label>
            <input
              id="instituicao-input"
              type="text"
              value={instituicaoAlvo}
              onChange={(e) => setInstituicaoAlvo(e.target.value)}
              placeholder="Ex: USP-SP, ENARE, SUS-SP"
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 focus:border-blue-500 focus:bg-white/8 outline-none text-white bg-white/3 transition-all text-sm placeholder-slate-500 font-sans"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5" htmlFor="meta-input">
              <Target size={14} className="text-slate-400" />
              Meta de Acertos (%)
            </label>
            <div className="relative">
              <input
                id="meta-input"
                type="number"
                min="10"
                max="100"
                value={metaAcertosPercentual}
                onChange={(e) => setMetaAcertosPercentual(Math.min(100, Math.max(10, Number(e.target.value))))}
                className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-white/10 focus:border-blue-500 focus:bg-white/8 outline-none text-white bg-white/3 transition-all text-sm placeholder-slate-500 font-sans"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-sm">%</span>
            </div>
          </div>
        </div>

        <div className="bg-emerald-950/25 rounded-2xl p-4 border border-emerald-500/20 flex items-start gap-3">
          <Target className="text-emerald-400 shrink-0 mt-0.5 animate-pulse" size={18} />
          <div className="text-xs text-emerald-200 leading-relaxed font-sans">
            <span className="font-bold text-emerald-300">Por que definir uma meta?</span> De acordo com dados históricos, as vagas para especialidades de acesso direto muito concorridas nas principais capitais exigem simulados consistentes de <span className="font-bold">80% ou mais de acerto</span>. Em especialidades menos concorridas, a nota de corte flutua entre <span className="font-bold">70% e 75%</span>. Estipular um target o ajuda a visualizar a distância real até a sua aprovação.
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 pt-6">
          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-sans">
            <span>Última modificação sincronizada com sua conta</span>
          </div>
          
          <button
            id="salvar-perfil-btn"
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl transition-all shadow-md flex items-center gap-2 border border-blue-500/10"
          >
            {saved ? (
              <>
                <CheckCircle size={16} className="animate-bounce" />
                Salvo com sucesso!
              </>
            ) : (
              <>
                <Save size={16} />
                Salvar Alterações
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
