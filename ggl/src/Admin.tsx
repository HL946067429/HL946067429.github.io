import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Lock, Save, Eye, EyeOff, Upload, Plus, Trash2, ArrowUp, ArrowDown, RotateCcw,
  ExternalLink, Loader2, CheckCircle2, AlertCircle, KeyRound, Gift, Sparkles, MessageSquare,
} from 'lucide-react';
import type { ItemsConfig, RawItem, ItemType, ToastsConfig } from './types';
import { TIER_ORDER } from './types';
import { encrypt, decrypt } from './crypto';
import { ICON_MAP, ICON_NAMES, COLOR_OPTIONS } from './icons';
import { DEFAULT_CONFIG } from './defaults';
import { PREVIEW_KEY } from './useItems';

// —— 访问密码（前端校验，挡闲逛者。不是真正安全层）
const ADMIN_PASSWORD = '20240520';
const AUTH_KEY = 'ggl:admin-auth';
const PAT_KEY = 'ggl:github-pat';

// —— GitHub 仓库信息
const REPO_OWNER = 'HL946067429';
const REPO_NAME = 'HL946067429.github.io';
const DATA_PATH = 'ggl/public/items.json';
const CONFIG_PATH = 'ggl/public/admin-config.json';
const BRANCH = 'main';

type PublishStatus =
  | { kind: 'idle' }
  | { kind: 'loading'; msg: string }
  | { kind: 'success'; msg: string }
  | { kind: 'error'; msg: string };

/** 从 GitHub API 返回的 admin-config.json 内容中提取 PAT（支持加密/明文） */
async function extractPatFromContent(base64Content: string): Promise<string | null> {
  try {
    const binary = atob(base64Content.replace(/\n/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    // 新格式：加密
    if (parsed.pat_enc) {
      return await decrypt(parsed.pat_enc, ADMIN_PASSWORD);
    }
    // 旧格式：明文兼容
    if (parsed.pat) return parsed.pat;
  } catch { /* ignore */ }
  return null;
}

/** 从本地 JSON fetch 提取 PAT */
async function extractPatFromLocal(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) return null;
    const parsed = await r.json();
    if (parsed.pat_enc) return await decrypt(parsed.pat_enc, ADMIN_PASSWORD);
    if (parsed.pat) return parsed.pat;
  } catch { /* ignore */ }
  return null;
}

export default function Admin() {
  const [authed, setAuthed] = useState<boolean>(() => {
    // 本地已登录 或 本地已有 PAT 直接通过
    return localStorage.getItem(AUTH_KEY) === '1' || !!localStorage.getItem(PAT_KEY);
  });
  const [checking, setChecking] = useState<boolean>(!authed);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState(false);
  const loggedOutRef = useRef(false);

  // 未登录时尝试从远端 admin-config.json 拉 PAT，有则直接登录
  useEffect(() => {
    if (authed) { setChecking(false); return; }
    if (loggedOutRef.current) { setChecking(false); return; } // 主动退出后不再自动拉
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${CONFIG_PATH}?ref=${BRANCH}`,
          { headers: { Accept: 'application/vnd.github+json' } }
        );
        if (r.ok && !cancelled) {
          const data = await r.json();
          const pat = await extractPatFromContent(data.content);
          if (pat) {
            localStorage.setItem(PAT_KEY, pat);
            localStorage.setItem(AUTH_KEY, '1');
            if (!cancelled) setAuthed(true);
          }
        }
      } catch { /* ignore */ }
      if (!cancelled) setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [authed]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#c41e3a]" />
        正在检查登录状态…
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[#f4ede3] to-[#fff3c4]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (pwInput === ADMIN_PASSWORD) {
              localStorage.setItem(AUTH_KEY, '1');
              setAuthed(true);
            } else {
              setPwError(true);
            }
          }}
          className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 border-2 border-[#d4af37]/40"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#c41e3a] rounded-xl flex items-center justify-center">
              <Lock className="w-6 h-6 text-[#d4af37]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">刮刮乐 · 后台</h1>
              <p className="text-xs text-gray-500">管理奖品内容</p>
            </div>
          </div>
          <label className="text-xs font-bold text-gray-700">访问密码</label>
          <input
            type="password"
            autoFocus
            value={pwInput}
            onChange={(e) => { setPwInput(e.target.value); setPwError(false); }}
            className={`mt-2 w-full px-4 py-3 rounded-xl border-2 outline-none transition-colors font-mono ${
              pwError ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-[#d4af37]'
            }`}
            placeholder="请输入密码"
          />
          {pwError && <p className="mt-2 text-xs text-red-500">密码不正确</p>}
          <button
            type="submit"
            className="mt-5 w-full py-3 rounded-xl bg-gradient-to-r from-[#c41e3a] to-[#a0162a] text-[#d4af37] font-black tracking-wider shadow-lg hover:shadow-xl active:scale-95 transition"
          >
            进入
          </button>
          <p className="mt-4 text-[10px] text-gray-400 text-center">仅前端校验，非真正安全层</p>
        </form>
      </div>
    );
  }

  return <AdminDashboard onLogout={() => {
    loggedOutRef.current = true;
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(PAT_KEY);
    setAuthed(false);
    setChecking(false);
  }} />;
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [config, setConfig] = useState<ItemsConfig | null>(null);
  const [remoteSha, setRemoteSha] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pat, setPat] = useState<string>(() => localStorage.getItem(PAT_KEY) || '');
  const [configSha, setConfigSha] = useState<string | null>(null);
  const [showPat, setShowPat] = useState(false);
  const [status, setStatus] = useState<PublishStatus>({ kind: 'idle' });
  const [previewing, setPreviewing] = useState<boolean>(() => !!localStorage.getItem(PREVIEW_KEY));

  // 首次从远端 admin-config.json 读取 PAT（支持加密格式）
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${CONFIG_PATH}?ref=${BRANCH}`,
          { headers: { Accept: 'application/vnd.github+json' } }
        );
        if (r.ok) {
          const data = await r.json();
          setConfigSha(data.sha);
          const found = await extractPatFromContent(data.content);
          if (found) {
            setPat(found);
            localStorage.setItem(PAT_KEY, found);
          }
        }
      } catch {
        // 退回本地 JSON
        const found = await extractPatFromLocal(`${import.meta.env.BASE_URL}admin-config.json`);
        if (found) {
          setPat(found);
          localStorage.setItem(PAT_KEY, found);
        } else { /* ignore */ }
      }
    })();
  }, []);

  // 首次加载远端 items.json + sha
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_PATH}?ref=${BRANCH}`,
          { headers: { Accept: 'application/vnd.github+json' } }
        );
        if (r.ok) {
          const data = await r.json();
          const binary = atob(data.content.replace(/\n/g, ''));
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const parsed = JSON.parse(new TextDecoder().decode(bytes)) as ItemsConfig;
          setConfig(parsed);
          setRemoteSha(data.sha);
        } else {
          throw new Error('GitHub contents fetch failed');
        }
      } catch {
        // 退回本地 json
        try {
          const r = await fetch(`${import.meta.env.BASE_URL}items.json`, { cache: 'no-cache' });
          if (r.ok) {
            setConfig(await r.json());
          } else {
            setConfig(DEFAULT_CONFIG);
          }
        } catch {
          setConfig(DEFAULT_CONFIG);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalCells = useMemo(() => config ? config.rows * config.cols : 0, [config]);
  const mismatch = config ? config.items.length !== totalCells : false;

  const updateItem = (idx: number, patch: Partial<RawItem>) => {
    setConfig(c => c ? { ...c, items: c.items.map((it, i) => i === idx ? { ...it, ...patch } : it) } : c);
  };
  const moveItem = (idx: number, dir: -1 | 1) => {
    setConfig(c => {
      if (!c) return c;
      const t = idx + dir;
      if (t < 0 || t >= c.items.length) return c;
      const items = [...c.items];
      [items[idx], items[t]] = [items[t], items[idx]];
      return { ...c, items };
    });
  };
  const removeItem = (idx: number) => {
    setConfig(c => c ? { ...c, items: c.items.filter((_, i) => i !== idx) } : c);
  };
  const addItem = () => {
    setConfig(c => {
      if (!c) return c;
      const nextId = Math.max(0, ...c.items.map(x => x.id)) + 1;
      return {
        ...c,
        items: [...c.items, {
          id: nextId, title: '新奖品', tier: '幸运奖', icon: 'Gift', iconColor: 'text-pink-500', value: '¥0', type: 'funny' as ItemType,
        }],
      };
    });
  };
  const resetToDefault = () => {
    if (!confirm('确定重置为默认 20 个奖品吗？当前改动会丢失')) return;
    setConfig({ ...DEFAULT_CONFIG, items: DEFAULT_CONFIG.items.map(x => ({ ...x })) });
  };

  // 本机预览（仅你这台浏览器看到）
  const applyPreview = () => {
    if (!config) return;
    localStorage.setItem(PREVIEW_KEY, JSON.stringify(config));
    setPreviewing(true);
  };
  const clearPreview = () => {
    localStorage.removeItem(PREVIEW_KEY);
    setPreviewing(false);
  };

  // 一键发布：直接写回 GitHub 仓库
  const publish = async () => {
    if (!config) return;
    if (!pat) { alert('请先填入 GitHub Personal Access Token'); return; }
    if (mismatch) {
      if (!confirm(`当前奖品数 ${config.items.length} ≠ 格子数 ${totalCells}，确定仍然发布？`)) return;
    }
    setStatus({ kind: 'loading', msg: '正在提交到 GitHub…' });
    try {
      const content = toBase64(JSON.stringify(config, null, 2) + '\n');
      const result = await putWithRetry(DATA_PATH, pat, content, 'chore(ggl): update items via admin panel', remoteSha);
      if (!result.ok) throw new Error(result.error || '发布失败');
      setRemoteSha(result.sha);
      localStorage.setItem(PAT_KEY, pat);
      setStatus({ kind: 'success', msg: '发布成功！Actions 1-2 分钟后线上生效' });
    } catch (e: any) {
      setStatus({ kind: 'error', msg: e.message || '未知错误' });
    }
  };

  // 辅助：获取文件最新 sha（带 auth → 不带 auth → 缓存兜底）
  const fetchSha = async (path: string, token: string, cached: string | null): Promise<string | null> => {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${BRANCH}`;
    for (const auth of [true, false]) {
      try {
        const h: Record<string, string> = { Accept: 'application/vnd.github+json' };
        if (auth && token) h.Authorization = `Bearer ${token}`;
        const r = await fetch(url, { headers: h });
        if (r.ok) {
          const d = await r.json();
          return d.sha as string;
        }
      } catch { /* try next */ }
    }
    return cached;
  };

  // 辅助：执行 PUT，如果 409 则重新拉 sha 重试一次
  const putWithRetry = async (
    path: string, token: string, content: string, message: string, cachedSha: string | null,
  ): Promise<{ ok: boolean; sha: string | null; error?: string }> => {
    let sha = await fetchSha(path, token, cachedSha);
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
        {
          method: 'PUT',
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message, content, sha: sha ?? undefined, branch: BRANCH }),
        }
      );
      if (r.ok) {
        const d = await r.json();
        return { ok: true, sha: d.content?.sha || null };
      }
      if (r.status === 409 && attempt === 0) {
        // sha 冲突，重新拉一次
        sha = await fetchSha(path, token, null);
        continue;
      }
      const err = await r.json().catch(() => ({}));
      return { ok: false, sha: null, error: err.message || `HTTP ${r.status}` };
    }
    return { ok: false, sha: null, error: '409 Conflict after retry' };
  };

  // base64 编码辅助（支持中文）
  const toBase64 = (str: string) => {
    const utf8 = new TextEncoder().encode(str);
    let binary = '';
    utf8.forEach(b => { binary += String.fromCharCode(b); });
    return btoa(binary);
  };

  // 保存 PAT：写 localStorage + 加密后写回 GitHub admin-config.json
  const savePat = async () => {
    localStorage.setItem(PAT_KEY, pat);
    if (!pat) return;
    try {
      const pat_enc = await encrypt(pat, ADMIN_PASSWORD);
      const content = toBase64(JSON.stringify({ pat_enc }, null, 2) + '\n');
      const result = await putWithRetry(CONFIG_PATH, pat, content, 'chore(ggl): update admin config', configSha);
      if (result.ok) setConfigSha(result.sha);
    } catch { /* localStorage 已保存，远端失败不阻塞 */ }
  };
  const clearPat = () => {
    localStorage.removeItem(PAT_KEY);
    setPat('');
  };

  if (loading || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> 加载中…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4ede3] p-4 sm:p-6 pb-20">
      {/* Header */}
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-6 bg-white rounded-2xl p-4 shadow-md border border-[#d4af37]/30">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-[#c41e3a] to-[#a0162a] rounded-xl flex items-center justify-center shadow-md">
              <Gift className="w-5 h-5 text-[#d4af37]" />
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-900 leading-tight">刮刮乐 · 后台</h1>
              <p className="text-[11px] text-gray-500 font-mono">{REPO_OWNER}/{REPO_NAME} · {DATA_PATH}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={import.meta.env.BASE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-[#003366] hover:bg-gray-50 rounded-lg transition"
            >
              <ExternalLink className="w-3.5 h-3.5" /> 前台
            </a>
            <button
              onClick={onLogout}
              className="px-3 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-lg transition"
            >
              退出
            </button>
          </div>
        </header>

        {/* PAT + 发布卡片 */}
        <section className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <KeyRound className="w-4 h-4 text-[#c41e3a]" />
            <h2 className="text-sm font-black">GitHub Token</h2>
            <span className="text-[10px] text-gray-400">仅存本机 localStorage，不上传</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type={showPat ? 'text' : 'password'}
                value={pat}
                onChange={(e) => setPat(e.target.value)}
                placeholder="ghp_xxx 或 github_pat_xxx"
                className="w-full px-4 py-2.5 pr-10 rounded-xl border-2 border-gray-200 focus:border-[#d4af37] outline-none font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPat(s => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600"
              >
                {showPat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={savePat}
              className="px-3 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold transition"
            >
              保存
            </button>
            {pat && (
              <button
                onClick={clearPat}
                className="px-3 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-xs font-bold text-red-600 transition"
              >
                清除
              </button>
            )}
          </div>
          <p className="mt-2 text-[11px] text-gray-500 leading-relaxed">
            需要 <strong>Fine-grained token</strong>，仓库权限勾 <code className="bg-gray-100 px-1 rounded">Contents: Read & write</code>。
            <a
              href="https://github.com/settings/personal-access-tokens/new"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 text-[#c41e3a] hover:underline"
            >
              去生成 →
            </a>
          </p>
        </section>

        {/* Grid 配置 */}
        <section className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 mb-5">
          <h2 className="text-sm font-black mb-3">网格尺寸</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs">
              行数 Rows
              <input
                type="number"
                min={1} max={10}
                value={config.rows}
                onChange={(e) => setConfig({ ...config, rows: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })}
                className="w-16 px-2 py-1 rounded-lg border-2 border-gray-200 focus:border-[#d4af37] outline-none text-center font-mono"
              />
            </label>
            <label className="flex items-center gap-2 text-xs">
              列数 Cols
              <input
                type="number"
                min={1} max={10}
                value={config.cols}
                onChange={(e) => setConfig({ ...config, cols: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })}
                className="w-16 px-2 py-1 rounded-lg border-2 border-gray-200 focus:border-[#d4af37] outline-none text-center font-mono"
              />
            </label>
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${mismatch ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
              {mismatch ? `⚠ 当前 ${config.items.length} / 需要 ${totalCells}` : `✓ ${config.items.length} / ${totalCells}`}
            </span>
          </div>
        </section>

        {/* 转盘抽奖次数 */}
        <section className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 mb-5">
          <h2 className="text-sm font-black mb-3">转盘抽奖次数</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs">
              可用次数
              <input
                type="number"
                min={1} max={99}
                value={config.wheelSpins ?? 3}
                onChange={(e) => setConfig({ ...config, wheelSpins: Math.max(1, Math.min(99, Number(e.target.value) || 1)) })}
                className="w-16 px-2 py-1 rounded-lg border-2 border-gray-200 focus:border-[#d4af37] outline-none text-center font-mono"
              />
            </label>
            <span className="text-[11px] text-gray-500">发布后玩家刷新页面生效。最后一次保底中实物奖品。</span>
          </div>
        </section>

        {/* Items 列表 */}
        <section className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black">奖品列表</h2>
            <div className="flex items-center gap-2">
              <button onClick={addItem} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#c41e3a] text-white text-xs font-bold hover:bg-[#a0162a] transition">
                <Plus className="w-3.5 h-3.5" /> 新增
              </button>
              <button onClick={resetToDefault} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition">
                <RotateCcw className="w-3.5 h-3.5" /> 重置默认
              </button>
            </div>
          </div>
          <p className="text-[11px] text-gray-500 mb-3 leading-relaxed bg-amber-50 border border-amber-200/60 rounded-lg px-3 py-2">
            💡 <strong>奖级</strong>是抽奖时显示给玩家的标签（如"特等奖"），<strong>奖品名</strong>是实际奖品（如"三套定制键帽"），会在规则对照表里展示。常用奖级：{TIER_ORDER.join(' / ')}
          </p>

          <div className="space-y-2">
            {config.items.map((item, idx) => {
              const IconComp = ICON_MAP[item.icon] ?? Gift;
              return (
                <div key={item.id} className="grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto] gap-2 items-center bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                  <span className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-[10px] font-black text-gray-500 font-mono">{idx + 1}</span>
                  <div className={`w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm ${item.iconColor}`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateItem(idx, { title: e.target.value })}
                      placeholder="奖品名（如：三套定制键帽）"
                      className="col-span-2 px-2 py-1.5 rounded-lg border border-gray-200 focus:border-[#d4af37] outline-none text-xs font-medium"
                    />
                    <input
                      type="text"
                      list={`tier-suggestions-${idx}`}
                      value={item.tier || ''}
                      onChange={(e) => updateItem(idx, { tier: e.target.value })}
                      placeholder="奖级"
                      className="col-span-1 px-2 py-1.5 rounded-lg border border-gray-200 focus:border-[#d4af37] outline-none text-xs font-bold"
                    />
                    <datalist id={`tier-suggestions-${idx}`}>
                      {TIER_ORDER.map(t => <option key={t} value={t} />)}
                    </datalist>
                    <select
                      value={item.type}
                      onChange={(e) => updateItem(idx, { type: e.target.value as ItemType })}
                      className="px-2 py-1.5 rounded-lg border border-gray-200 focus:border-[#d4af37] outline-none text-xs font-medium"
                    >
                      <option value="real">实物</option>
                      <option value="funny">趣味</option>
                      <option value="filler">谢谢参与</option>
                    </select>
                    <select
                      value={item.icon}
                      onChange={(e) => updateItem(idx, { icon: e.target.value })}
                      className="col-span-1 sm:col-span-2 px-2 py-1.5 rounded-lg border border-gray-200 focus:border-[#d4af37] outline-none text-xs"
                    >
                      {ICON_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <select
                      value={item.iconColor}
                      onChange={(e) => updateItem(idx, { iconColor: e.target.value })}
                      className="col-span-1 sm:col-span-2 px-2 py-1.5 rounded-lg border border-gray-200 focus:border-[#d4af37] outline-none text-xs"
                    >
                      {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="p-1.5 text-gray-400 hover:text-[#003366] disabled:opacity-30">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => moveItem(idx, 1)} disabled={idx === config.items.length - 1} className="p-1.5 text-gray-400 hover:text-[#003366] disabled:opacity-30">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => removeItem(idx)} className="p-1.5 text-gray-400 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-1" />
                </div>
              );
            })}
          </div>
        </section>

        {/* 弹幕文案 */}
        <section className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-[#c41e3a]" />
            <h2 className="text-sm font-black">搞怪弹幕</h2>
            <span className="text-[10px] text-gray-400">刮奖/转盘揭示奖品时随机弹出</span>
          </div>
          {(['real', 'funny', 'filler'] as const).map(type => {
            const label = type === 'real' ? '实物奖品' : type === 'funny' ? '趣味券' : '谢谢参与';
            const color = type === 'real' ? 'text-[#c41e3a]' : type === 'funny' ? 'text-pink-600' : 'text-gray-500';
            const toasts = config.toasts ?? DEFAULT_CONFIG.toasts!;
            const list = toasts[type] ?? [];
            const updateToast = (idx: number, val: string) => {
              const next = [...list];
              next[idx] = val;
              setConfig({ ...config, toasts: { ...toasts, [type]: next } });
            };
            const removeToast = (idx: number) => {
              setConfig({ ...config, toasts: { ...toasts, [type]: list.filter((_, i) => i !== idx) } });
            };
            const addToast = () => {
              setConfig({ ...config, toasts: { ...toasts, [type]: [...list, '新弹幕文案'] } });
            };
            return (
              <div key={type} className="mb-4 last:mb-0">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-black ${color}`}>{label}</span>
                  <button onClick={addToast} className="text-[10px] font-bold text-[#c41e3a] hover:underline">+ 添加</button>
                </div>
                <div className="space-y-1.5">
                  {list.map((text, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 font-mono w-5 shrink-0 text-right">{idx + 1}</span>
                      <input
                        type="text"
                        value={text}
                        onChange={(e) => updateToast(idx, e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 focus:border-[#d4af37] outline-none text-xs"
                      />
                      <button onClick={() => removeToast(idx)} className="p-1 text-gray-300 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {list.length === 0 && (
                    <p className="text-[10px] text-gray-400 italic px-1">暂无弹幕，点击添加</p>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </div>

      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-5xl mx-auto p-3 flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            {status.kind === 'idle' && previewing && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">
                <Sparkles className="w-3.5 h-3.5" />本机预览中
              </span>
            )}
            {status.kind === 'loading' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />{status.msg}
              </span>
            )}
            {status.kind === 'success' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />{status.msg}
              </span>
            )}
            {status.kind === 'error' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 px-3 py-1.5 rounded-full">
                <AlertCircle className="w-3.5 h-3.5" />{status.msg}
              </span>
            )}
          </div>
          {previewing ? (
            <button onClick={clearPreview} className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold transition">
              取消本机预览
            </button>
          ) : (
            <button onClick={applyPreview} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold transition">
              <Eye className="w-3.5 h-3.5" />本机预览
            </button>
          )}
          <button
            onClick={publish}
            disabled={status.kind === 'loading' || !pat}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#c41e3a] to-[#a0162a] text-[#d4af37] text-sm font-black shadow-lg hover:shadow-xl active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />发布到线上
          </button>
        </div>
      </div>
    </div>
  );
}
