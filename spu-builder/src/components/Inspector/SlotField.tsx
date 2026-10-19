import { useRef } from 'react';
import styles from './Inspector.module.css';

// Controle de imagem do painel: envia o arquivo ao <image-slot id=slotId> que
// está no canvas, via um evento de "drop" sintético — o image-slot.js cuida de
// redimensionar, persistir (sidecar) e renderizar.
export function SlotField({ slotId }: { slotId: string }) {
  const fileInput = useRef<HTMLInputElement>(null);

  const dropOnSlot = (file: File) => {
    const el = document.querySelector(`image-slot[id="${slotId}"]`) as HTMLElement | null;
    if (!el) {
      alert('Selecione o bloco no canvas para o slot aparecer e tente de novo.');
      return;
    }
    const dt = new DataTransfer();
    dt.items.add(file);
    el.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
  };

  const clearSlot = () => {
    const el = document.querySelector(`image-slot[id="${slotId}"]`) as (HTMLElement & { shadowRoot: ShadowRoot }) | null;
    const btn = el?.shadowRoot?.querySelector('[data-act="clear"]') as HTMLElement | null;
    btn?.click();
  };

  return (
    <div className={styles.slotField}>
      <button className={styles.slotBtn} onClick={() => fileInput.current?.click()}>
        Enviar imagem
      </button>
      <button className={styles.slotBtnGhost} onClick={clearSlot} title="Remover imagem">Remover</button>
      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) dropOnSlot(f);
          e.target.value = '';
        }}
      />
      <span className={styles.slotHint}>Ou arraste/clique direto na imagem no canvas.</span>
    </div>
  );
}
