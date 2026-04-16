import { useEffect, useState } from 'react';
import type { ItemsConfig } from './types';
import { DEFAULT_CONFIG } from './defaults';

export const PREVIEW_KEY = 'ggl:preview-config';

// 直接从 GitHub 仓库读取，commit 后几秒内生效，不用等 CI 部署
const RAW_URL =
  'https://raw.githubusercontent.com/HL946067429/HL946067429.github.io/main/ggl/public/items.json';

/** 带超时的 fetch */
function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

/**
 * 加载奖品配置：
 * 1. 先看 localStorage 是否有 preview（后台本地预览用）
 * 2. 从 GitHub raw 直接拉最新配置（3秒超时，秒级生效）
 * 3. raw 失败/超时则退回本地部署的静态文件
 * 4. 都失败则回退到内置默认
 */
export function useItems() {
  const [config, setConfig] = useState<ItemsConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 优先 preview
    try {
      const preview = localStorage.getItem(PREVIEW_KEY);
      if (preview) {
        const parsed = JSON.parse(preview) as ItemsConfig;
        if (parsed?.items?.length) {
          setConfig(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }

    const loadFromLocal = () => {
      const localUrl = `${import.meta.env.BASE_URL}items.json`;
      return fetch(localUrl, { cache: 'no-cache' })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`local ${r.status}`))))
        .then((data: ItemsConfig) => {
          if (!data.items?.length) throw new Error('invalid items.json');
          setConfig(data);
        })
        .catch((e) => {
          console.warn('[ggl] all sources failed, fallback to default', e);
          setError(String(e));
          setConfig(DEFAULT_CONFIG);
        });
    };

    // 从 GitHub raw 拉取（3秒超时，加时间戳破缓存）
    const rawUrl = `${RAW_URL}?t=${Date.now()}`;
    fetchWithTimeout(rawUrl, 3000)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`raw ${r.status}`))))
      .then((data: ItemsConfig) => {
        if (!data.items?.length) throw new Error('invalid items.json');
        setConfig(data);
      })
      .catch(() => {
        // raw 失败或超时，退回本地静态文件
        loadFromLocal();
      });
  }, []);

  return { config, error };
}
