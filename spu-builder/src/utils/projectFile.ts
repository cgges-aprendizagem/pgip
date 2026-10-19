export function parseProjectFile(text: string, fileName: string): { raw: unknown; imageSlots?: string } {
  const looksLikeHtml = /\.html?$/i.test(fileName) || /^\s*</.test(text);
  if (!looksLikeHtml) {
    const { imageSlots, ...raw } = JSON.parse(text);
    if (imageSlots !== undefined && (!imageSlots || typeof imageSlots !== 'object' || Array.isArray(imageSlots))) {
      throw new Error('Imagens do projeto inválidas.');
    }
    return { raw, imageSlots: imageSlots === undefined ? undefined : JSON.stringify(imageSlots) };
  }

  const html = new DOMParser().parseFromString(text, 'text/html');
  const embedded = html.getElementById('spu-doc')?.textContent;
  if (!embedded) {
    throw new Error('HTML sem dados editáveis do SPU Builder.');
  }
  return {
    raw: JSON.parse(embedded),
    imageSlots: html.getElementById('spu-image-slots')?.textContent || undefined,
  };
}
