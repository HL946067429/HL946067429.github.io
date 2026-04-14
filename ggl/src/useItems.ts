import { useEffect, useState } from 'react';
import type { ItemsConfig } from './types';
import { DEFAULT_CONFIG } from './defaults';

export const PREVIEW_KEY = 'ggl:preview-config';

/**
 * 加载奖品配置：
 * 1. 先看 localStorage 是否有 preview（后台本地预览用）
 * 2. 否则从 /ggl/items.json 拉取线上配置
 * 3. fetch 失败则回退到内置默认
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

    // 再从 JSON 取
    const url = `${import.meta.env.BASE_URL}items.json`;
    fetch(url, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: ItemsConfig) => {
        if (!data.items?.length) throw new Error('invalid items.json');
        setConfig(data);
      })
      .catch((e) => {
        console.warn('[ggl] failed to load items.json, fallback to default', e);
        setError(String(e));
        setConfig(DEFAULT_CONFIG);
      });
  }, []);

  return { config, error };
}
