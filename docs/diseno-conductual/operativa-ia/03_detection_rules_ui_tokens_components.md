# Detection rules — Tokens, patrones UI y componentes

## Objetivo

Estas reglas ayudan a una IA o agente con visión/código a convertir una pantalla web en un inventario técnico útil para diseño y desarrollo.

## 1. Detección de tokens

### Color
Detecta:
- Color primario.
- Color secundario.
- Colores de fondo.
- Colores de texto.
- Colores de estado: success, warning, error, info.
- Contraste aproximado entre texto y fondo.
- Uso de color para CTA, badges, enlaces, iconos y estados.

Output:
```json
{
  "color_tokens": [
    {
      "name_inferred": "color-primary",
      "value": "#000000",
      "usage": ["primary_cta", "links"],
      "consistency": "high|medium|low",
      "accessibility_risk": "none|contrast|semantic_only|unknown"
    }
  ]
}
```

### Tipografía
Detecta:
- Familias tipográficas.
- Escala de headings.
- Body text.
- Pesos.
- Line-height.
- Jerarquía.
- Inconsistencias.

Output:
```json
{
  "typography_tokens": [
    {
      "role": "h1",
      "font_family": "inferred_or_unknown",
      "size_px": null,
      "weight": null,
      "line_height": null,
      "usage_quality": "clear|weak|inconsistent"
    }
  ]
}
```

### Espaciado y layout
Detecta:
- Sistema de espaciado aparente.
- Gaps entre secciones.
- Padding de cards.
- Max-width de contenedores.
- Grid o flex pattern.
- Breakpoints inferidos si hay varias capturas.

Output:
```json
{
  "spacing_layout": {
    "section_spacing_pattern": "consistent|inconsistent|unknown",
    "container_strategy": "centered|max-width|full-bleed|mixed",
    "grid_pattern": "1-col|2-col|3-col|asymmetric|unknown",
    "density": "low|medium|high"
  }
}
```

## 2. Detección de patrones UI

Clasifica cada bloque visible según patrón:

```json
{
  "ui_patterns": [
    {
      "pattern": "hero",
      "confidence": 0.92,
      "evidence": ["large headline", "primary CTA", "supporting visual"],
      "behavioral_role": "what",
      "quality": 4,
      "issues": ["CTA copy describes action not value"]
    }
  ]
}
```

Patrones a detectar:
- Hero.
- Header.
- Navigation.
- CTA group.
- Benefit cards.
- Feature grid.
- Testimonial.
- Logo cloud.
- Metrics/stat bar.
- Pricing table.
- FAQ.
- Form.
- Comparison table.
- How-it-works stepper.
- Trust badges.
- Footer.
- Sticky CTA.
- Modal / popup.
- Chat widget.
- Cookie banner.

## 3. Detección de componentes

Para cada componente:

```json
{
  "components": [
    {
      "component_name": "Button",
      "variant": "primary",
      "instances": 4,
      "props_inferred": {
        "size": "large",
        "icon": false,
        "full_width_mobile": "unknown"
      },
      "states_required": ["default", "hover", "focus", "loading", "disabled"],
      "accessibility_requirements": ["visible focus", "contrast AA", "descriptive label"],
      "design_system_recommendation": "promote_to_core_component"
    }
  ]
}
```

## 4. Design system logic

### Promote to core component when:
- Appears repeatedly.
- Supports multiple use cases.
- Has clear variants.
- Affects conversion or accessibility.
- Needs consistent states.

### Keep local when:
- It is campaign-specific.
- It contains one-off illustration or content.
- It should not become a reusable pattern.

### Must define variants for:
- Button: primary, secondary, tertiary, destructive if needed.
- Card: benefit, testimonial, pricing, feature, case study.
- Badge: trust, urgency, category, availability.
- Section: hero, social proof, FAQ, CTA band.
- Form field: default, focused, error, success, disabled.
- Alert: info, success, warning, error.

## 5. Accessibility checks

Always evaluate:
- CTA contrast.
- Text contrast.
- Focus states.
- Button labels.
- Heading order.
- Form labels.
- Error messages.
- Touch target size.
- Motion sensitivity.
- Keyboard navigation.
- Image alt intent.
- Color not used as sole indicator.

## 6. Implementation briefing format

```markdown
## Component implementation notes

### Component: [Name]
- Purpose:
- Behavioral role:
- Variants:
- Props:
- States:
- Accessibility:
- Content rules:
- Responsive behavior:
- Dependencies:
- Anti-patterns:
```
