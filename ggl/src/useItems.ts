import { useEffect, useState, useRef } from 'react';
import type { ItemsConfig } from './types';
import { DEFAULT_CONFIG } from './defaults';

export const PREVIEW_KEY = 'ggl:preview-config';

// 直接从 GitHub 仓库读取，commit 后几秒内生效，不用等 CI 部署
const RAW_URL =
  'https://raw.githubusercontent.com/HL946067429/HL946067429.github.io/main/ggl/public/items.json';

const POLL_INTERVAL = 5_000; // 每 5 秒检查一次配置更新

/** 带超时的 fetch */
function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

/** 尝试从 URL 加载配置 */
async function fetchConfig(url: string, timeoutMs: number): Promise<ItemsConfig | null> {
  try {
    const r = await fetchWithTimeout(url, timeoutMs);
    if (!r.ok) return null;
    const data = await r.json();
    if (!data?.items?.length) return null;
    return data as ItemsConfig;
  } catch {
    return null;
  }
}

/**
 * 加载奖品配置（带自动轮询）：
 * 1. 先看 localStorage 是否有 preview（后台本地预览用）
 * 2. 从 GitHub raw 直接拉最新配置（3秒超时）
 * 3. raw 失败则退回本地部署的静态文件
 * 4. 都失败则回退到内置默认
 * 5. 之后每 15 秒轮询 raw，有变化就更新（不影响游戏状态）
 */
export function useItems() {
  const [config, setConfig] = useState<ItemsConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const configRef = useRef<string | null>(null); // 用 JSON 字符串比对是否有变化

  useEffect(() => {
    // 优先 preview
    try {
      const preview = localStorage.getItem(PREVIEW_KEY);
      if (preview) {
        const parsed = JSON.parse(preview) as ItemsConfig;
        if (parsed?.items?.length) {
          setConfig(parsed);
          configRef.current = preview;
          return; // preview 模式不轮询
        }
      }
    } catch {
      // ignore
    }

    let cancelled = false;

    const loadConfig = async () => {
      // 先尝试 raw
      let data = await fetchConfig(`${RAW_URL}?t=${Date.now()}`, 3000);
      // 失败退回本地
      if (!data) data = await fetchConfig(`${import.meta.env.BASE_URL}items.json`, 5000);
      // 都失败用默认
      if (!data) {
        setError('all sources failed');
        data = DEFAULT_CONFIG;
      }
      return data;
    };

    // 首次加载
    loadConfig().then(data => {
      if (cancelled) return;
      const json = JSON.stringify(data);
      configRef.current = json;
      setConfig(data);
    });

    // 轮询更新（仅更新配置，不重置游戏状态）
    const timer = setInterval(async () => {
      if (cancelled) return;
      const data = await fetchConfig(`${RAW_URL}?t=${Date.now()}`, 3000);
      if (!data || cancelled) return;
      const json = JSON.stringify(data);
      if (json !== configRef.current) {
        configRef.current = json;
        setConfig(data);
      }
    }, POLL_INTERVAL);

    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  return { config, error };
}
