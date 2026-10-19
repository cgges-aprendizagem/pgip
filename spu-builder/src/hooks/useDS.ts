import { useState, useEffect } from 'react';
import type { NS } from '../types/ds';
import { installDSCompat } from '../utils/dsCompat';
import { installLucideCatalog } from '../utils/lucideCatalog';

let cached: NS | null = null;

export function useDS(): NS | null {
  const [ns, setNs] = useState<NS | null>(cached);

  useEffect(() => {
    if (cached) return;
    let id: ReturnType<typeof setTimeout>;
    async function poll() {
      const ns = window.SPUENAPAprendizagemDesignSystem_f0eeed;
      if (ns && ns.BlockDocument) {
        installDSCompat(ns);
        await installLucideCatalog(ns);
        cached = ns;
        setNs(ns);
      } else {
        id = setTimeout(poll, 60);
      }
    }
    poll();
    return () => clearTimeout(id);
  }, []);

  return ns;
}
