function inferProjectMode(task) {
    const lower = task.toLowerCase();
    if (/(landing|sitio web|pagina web|marketing|saas)/.test(lower))
        return 'landing';
    if (/(ecommerce|tienda|catalogo|checkout|carrito|zapatos|ropa|moda|sneakers)/.test(lower))
        return 'ecommerce';
    if (/(crm|pipeline|clientes|leads|ventas)/.test(lower))
        return 'crm';
    if (/(dashboard|metricas|analytics|reportes|kpi|panel)/.test(lower))
        return 'dashboard';
    if (/(sistema|inventario|reservas|gestion|hospital|barberia|escuela|admin)/.test(lower))
        return 'system';
    return 'generic';
}
const V2_FOUNDATION = [
    'src/components/ui/Button.jsx',
    'src/components/ui/Card.jsx',
    'src/components/ui/SectionTitle.jsx',
    'src/components/ui/Badge.jsx',
    'src/components/ui/Input.jsx',
];
const V3_PREMIUM = [
    'src/components/patterns/HeroEditorial.jsx',
    'src/components/patterns/DashboardShell.jsx',
    'src/components/patterns/CommerceShell.jsx',
    'src/components/patterns/FeatureGridBento.jsx',
    'src/components/patterns/KpiStrip.jsx',
];
function getModeComposition(mode) {
    switch (mode) {
        case 'landing':
            return [
                'Usa HeroEditorial + FeatureGridBento + social proof + showcase + CTA premium.',
                'El hero debe dominar visualmente la primera pantalla y tener una pieza visual potente.',
                'Usa gsap solo para reveal/stagger/hero parallax y manten el resto ligero.',
            ];
        case 'ecommerce':
            return [
                'Usa CommerceShell, ProductCard premium, filtros claros, cart drawer y checkout summary.',
                'Storefront primero. Panel admin separado solo si el prompt menciona stock o inventario.',
                'Usa motion para hover de cards, drawer del carrito y transiciones de filtros.',
            ];
        case 'dashboard':
            return [
                'Usa DashboardShell, KpiStrip, ChartPanel y DataTable.',
                'Prioriza legibilidad y jerarquia. Charts solo si cuentan algo real.',
                'Usa motion para tabs, drawers, modals y cambios de panel.',
            ];
        case 'crm':
            return [
                'Usa DashboardShell + pipeline/board + customer table + activity timeline.',
                'Debe sentirse como producto de trabajo diario, no como demo decorativa.',
                'Usa motion para columnas, paneles laterales y acciones contextuales.',
            ];
        case 'system':
            return [
                'Usa DashboardShell y modulos con cards, tabla, formulario o calendario segun el caso.',
                'Nunca dejes el sistema en login sin contenido posterior.',
                'La home despues del login debe abrir en dashboard funcional con 3 modulos minimo.',
            ];
        default:
            return [
                'Crea un mini design system antes de expandir modulos.',
                'Prefiere una UI clara y cohesionada sobre variedad excesiva.',
            ];
    }
}
export function buildDevDesignPackContext(task) {
    const mode = inferProjectMode(task);
    const compositionRules = getModeComposition(mode);
    return `

--- PLURY DESIGN PACK V2 ---
Objetivo:
Construir una base visual consistente dentro del proyecto generado.

Debes crear como minimo estos archivos base si el proyecto tiene mas de una vista o mas de una seccion:
${V2_FOUNDATION.map((item, index) => `${index + 1}. ${item}`).join('\n')}

Reglas V2:
1. Button debe tener variantes claras: primary, secondary, ghost, outline.
2. Card debe resolver padding, radius, border, background y shadow coherentes.
3. SectionTitle debe unificar eyebrow, titulo y descripcion.
4. Badge e Input deben sentirse parte del mismo sistema.
5. Usa tokens consistentes para radius, shadows, spacing y color semantico.
6. Usa clsx/cva/tailwind-merge solo si realmente simplifican variantes.
--- FIN PLURY DESIGN PACK V2 ---

--- PLURY DESIGN PACK V3 ---
Objetivo:
Subir la calidad percibida con patterns premium por tipo de proyecto.

Patterns premium sugeridos:
${V3_PREMIUM.map((item, index) => `${index + 1}. ${item}`).join('\n')}

Modo inferido para este proyecto: ${mode}

Composicion recomendada:
${compositionRules.map((item, index) => `${index + 1}. ${item}`).join('\n')}

Reglas V3:
1. La primera pantalla debe tener una pieza dominante y una jerarquia visual clara.
2. Usa bento grids, paneles asimetricos o shells de producto cuando aplique.
3. Evita la UI plana y genérica. Debe sentirse diseñada, no ensamblada al azar.
4. Usa motion para producto y gsap para marketing solo cuando mejore la narrativa.
5. Si el proyecto mezcla storefront y admin, diferencía claramente ambos mundos visuales.
6. Si el proyecto es de datos, la densidad visual debe ser limpia y legible, no decorativa.
--- FIN PLURY DESIGN PACK V3 ---`;
}
//# sourceMappingURL=dev-design-packs.js.map