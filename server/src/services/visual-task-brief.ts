interface VisualTaskBriefOptions {
  hasReferenceImage?: boolean
  isRefinement?: boolean
}

function hasAnyKeyword(text: string, keywords: string[]): boolean {
  return keywords.some(keyword => text.includes(keyword))
}

function detectVisualAssetType(text: string): 'logo' | 'campaign' | 'visual' | null {
  const lower = text.toLowerCase()
  if (hasAnyKeyword(lower, ['logo', 'logotipo', 'isotipo', 'imagotipo', 'identidad', 'marca', 'branding', 'monograma'])) {
    return 'logo'
  }
  if (hasAnyKeyword(lower, ['flyer', 'flayer', 'banner', 'post', 'story', 'stories', 'afiche', 'volante', 'pendon', 'pendón', 'anuncio', 'ads', 'publicidad', 'campana', 'campaña', 'portada'])) {
    return 'campaign'
  }
  if (hasAnyKeyword(lower, ['pieza grafica', 'pieza gráfica', 'recurso visual', 'moodboard', 'concept board', 'visual'])) {
    return 'visual'
  }
  return null
}

export function buildVisualTaskBrief(task: string, options: VisualTaskBriefOptions = {}): string {
  const assetType = detectVisualAssetType(task)
  if (!assetType) return ''

  const referenceRule = options.hasReferenceImage
    ? `\n- Hay una imagen de referencia adjunta. Debes usarla como guia principal. No la ignores ni la reemplaces por una idea aleatoria.
- Si la referencia es un vector, logo, icono, recorte o silueta, conserva su forma distintiva y simplificala con criterio de marca.`
    : ''

  if (assetType === 'logo') {
    return `\n\n[BRIEF VISUAL ESPECIALIZADO: LOGO]
Estas trabajando un logo o sistema de identidad. Prioriza precision de marca por encima de espectacularidad.
- Usa generate_image con styleType DESIGN.
- El resultado debe ser un simbolo de marca limpio, memorable y escalable.
- El HTML final debe ser un board compacto de seleccion de logos. NO construyas una landing page, dashboard, sitio web ni una pagina editorial larga.
- Si hay imagen de referencia, usa generate_image con referenceImageUrl para que Ideogram reciba la imagen real.
- Pide en el prompt: flat vector logo, isolated symbol, centered composition, pure white background, no gradients, no shadows, no mockup, no photorealism, no background scene, no extra objects, sharp clean edges.
- SIEMPRE pasa background='TRANSPARENT' en generate_image para logos. El resultado debe ser el simbolo solo, sin canvas decorativo ni fondo de color.
- No metas texto dentro de la imagen del logo salvo que el usuario pida explicitamente un wordmark.
- Genera variantes con distintos niveles de abstraccion: literal, geometrico, monoline y bold symbol.
- Evita composiciones complejas, efectos de poster, escenas 3D o estilos ilustrativos recargados.${referenceRule}
${options.isRefinement ? '- En refinamiento, parte de la opcion elegida y cambia solo lo pedido, sin reinventar el concepto base.' : '- En primera entrega, muestra varias direcciones claras y faciles de comparar.'}
[FIN BRIEF VISUAL]`
  }

  if (assetType === 'campaign') {
    return `\n\n[BRIEF VISUAL ESPECIALIZADO: PUBLICIDAD]
Estas trabajando una pieza publicitaria completa. Prioriza claridad comercial y jerarquia visual.
- Usa generate_image con styleType DESIGN.
- La pieza debe verse terminada como anuncio real, no como una foto bonita suelta.
- El HTML final debe presentar las opciones en un board de revision visual. NO lo conviertas en un sitio web, landing page o dashboard.
- Si la pieza debe conservar un asset o composicion del usuario, usa generate_image con referenceImageUrl o edit_image.
- Incluye en el prompt el texto visible principal cuando aplique: nombre, oferta, precio, CTA, slogan.
- Pide composicion publicitaria completa: hero asset, headline, supporting text, CTA area, hierarchy, negative space, platform-ready layout.
- Evita fondos ruidosos, elementos aleatorios y decoracion que compita con el mensaje.
- Si el usuario adjunto un producto, vector, logo o referencia, mantenlo reconocible y usalo como protagonista de la pieza en vez de inventar otro objeto distinto.${referenceRule}
${options.isRefinement ? '- En refinamiento, conserva la pieza elegida y ajusta mensaje, color, contraste, layout o asset principal segun el feedback.' : '- En primera entrega, devuelve opciones con estilos claramente distintos pero siempre publicitarios y utilizables.'}
[FIN BRIEF VISUAL]`
  }

  return `\n\n[BRIEF VISUAL ESPECIALIZADO]
- Usa generate_image con styleType DESIGN para esta tarea visual.
- Entrega composiciones limpias, coherentes y faciles de iterar.
- El HTML final debe ser un board visual de seleccion o revision, no una pagina web funcional.
- Si hay imagen de referencia, respeta su lenguaje visual, forma y paleta principal.${referenceRule}
${options.isRefinement ? '- En refinamiento, no rehagas desde cero: mejora la opcion elegida.' : '- En primera entrega, muestra alternativas comparables.'}
[FIN BRIEF VISUAL]`
}
