import { useEffect, useRef, useState } from 'react';
import type { Doc } from '../../types/ds';
import type { ImageQuality } from '../../utils/exportFormats';
import { disconnectPublisher, hasPublishSession, initialPublishError, materialCode, originalSource, publishDocument, publisherAPI, publisherLogin, type MaterialVersion } from '../../utils/githubPublisher';
import { publishedProjectLocation } from '../../utils/publishedProject';
import styles from './PublishModal.module.css';

interface Props { doc: Doc; quality: ImageQuality; beforeLogin: () => Promise<void>; onClose: () => void }
export function PublishModal({ doc, quality, beforeLogin, onClose }: Props) {
  const [checking, setChecking] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [login, setLogin] = useState('');
  const [version, setVersion] = useState<MaterialVersion | null>(null);
  const [error, setError] = useState(initialPublishError);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ commit: string; url: string } | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const code = materialCode(doc.meta.title);
  const linkedCode = publishedProjectLocation(window.location.href)?.material;
  const source = originalSource(code);
  const conflict = Boolean(version && source && (version.jsonShas[source.file] !== source.sha || (source.directorySha && source.directorySha !== version.materialSha)));
  const mismatch = Boolean(linkedCode && linkedCode !== code);
  useEffect(() => { closeButton.current?.focus(); }, []);
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      setChecking(true); setVersion(null); setLogin('');
      try {
        const health = await publisherAPI<{ configured: boolean; uploadVersion?: number }>('/health');
        if (cancelled) return;
        setConfigured(health.configured === true && (health.uploadVersion || 0) >= 2);
        if (!health.configured) throw new Error('O serviço de publicação ainda precisa ser configurado na Cloudflare.');
        if ((health.uploadVersion || 0) < 2) throw new Error('O serviço de publicação precisa ser atualizado na Cloudflare para receber arquivos grandes.');
        if (hasPublishSession()) {
          const user = await publisherAPI<{ login: string }>('/session');
          if (cancelled) return;
          setLogin(user.login);
          if (code) {
            const current = await publisherAPI<MaterialVersion>(`/material?code=${encodeURIComponent(code)}`);
            if (!cancelled) setVersion(current);
          }
        }
      } catch (err) { if (!cancelled) setError(err instanceof Error ? err.message : 'Não foi possível conferir a publicação.'); }
      finally { if (!cancelled) setChecking(false); }
    };
    void check();
    return () => { cancelled = true; };
  }, [code, attempt]);
  const connect = async () => {
    setBusy(true); setError('');
    try { await beforeLogin(); publisherLogin(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar o rascunho antes do login.'); setBusy(false); }
  };
  const publish = async () => {
    if (!version || mismatch || conflict) return;
    setBusy(true); setError('');
    try {
      const sent = await publishDocument(doc, quality, version, source, setProgress);
      setResult(sent);
      try { localStorage.setItem(`spu_published_revision_${code}`, JSON.stringify({ file: `projeto${code}.spu.json`, sha: sent.jsonSha, directorySha: sent.materialSha })); } catch { /* A atualização já foi concluída no GitHub. */ }
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível publicar.'); }
    finally { setBusy(false); }
  };
  return <div className={styles.backdrop} onKeyDown={event => {
    event.stopPropagation();
    if (event.key === 'Escape' && !busy) onClose();
    if (event.key === 'Tab') {
      const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]'));
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }}>
    <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="publish-title" aria-busy={busy || checking}>
      <header><h2 id="publish-title">Publicar / atualizar no GitHub</h2><button ref={closeButton} onClick={onClose} disabled={busy} aria-label="Fechar publicação">×</button></header>
      {result ? <div role="status">
        <h3>Versão enviada ao GitHub</h3>
        <p>A publicação do site foi iniciada. A nova versão ficará disponível após o processamento do GitHub Pages.</p>
        <p><a href={result.url} target="_blank" rel="noreferrer">Abrir material</a></p>
        <p><a href={result.commit} target="_blank" rel="noreferrer">Ver atualização no GitHub</a></p>
      </div> : <>
        <p>Envie o conteúdo atual, suas imagens e o JSON editável para o PGIP.</p>
        <dl><dt>Repositório</dt><dd>cgges-aprendizagem/pgip</dd><dt>Material</dt><dd>{code ? code.toUpperCase() : 'Código ausente no título'}</dd><dt>Pasta</dt><dd>{code ? `${code}/` : '—'}</dd><dt>Imagens</dt><dd>{quality === 'compact' ? 'Compactas' : 'Alta qualidade'}</dd>{login && <><dt>Conta GitHub</dt><dd>{login}</dd></>}</dl>
        {!code && <p role="alert">Inclua o código no título do documento, por exemplo: M121 - Bens imóveis públicos.</p>}
        {mismatch && <p role="alert">O código do título difere do material aberto. Corrija o título antes de publicar.</p>}
        {conflict && <p role="alert">O JSON no GitHub mudou desde que você abriu o material. Confira a versão publicada antes de substituir alterações de outra pessoa.</p>}
        {checking && <p role="status">Conferindo conexão e versão atual…</p>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        {login && version && !conflict && <p>{version.exists ? 'Ao confirmar, a versão atual deste material será atualizada.' : 'Ao confirmar, será criada uma pasta para este novo material.'}</p>}
        <div className={styles.actions}>
          {!login ? <button onClick={() => void connect()} disabled={busy || checking || !configured || !code || mismatch}>Entrar com GitHub</button>
            : <button onClick={() => void publish()} disabled={busy || checking || !version || conflict || mismatch || !code}>{busy ? (progress || 'Preparando arquivos…') : version?.exists ? `Atualizar ${code.toUpperCase()} no GitHub` : `Publicar ${code.toUpperCase()} no GitHub`}</button>}
          {login && <button onClick={() => { disconnectPublisher(); setLogin(''); setVersion(null); setError(''); }} disabled={busy}>Sair da conta</button>}
          {!busy && !checking && <button onClick={() => { setError(''); setAttempt(value => value + 1); }}>Conferir novamente</button>}
        </div>
      </>}
    </section>
  </div>;
}
