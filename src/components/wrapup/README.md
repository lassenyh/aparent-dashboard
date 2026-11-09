# WrapUp — felles design

Komponentene her er felles for alle WrapUp-tjenester (Desk nå, Sign når den flyttes inn):

- `product-mark.tsx`: merket, ordmerket og låsen (`wrapup | desk`). Firkanten og tjenesteordet følger `--mark-accent` eller tjenestens farge.
- `service-switcher.tsx` og `service-handoff.module.css`: tjenestevelgeren i logoen og fullskjerm-overgangen mellom tjenester.
- `app-launcher.tsx` og `app-launcher.module.css`: startsiden (`/`).
- `wrapup-loader.tsx` og `wrapup-loader.module.css`: lasteanimasjonen.

Tjenestene, fargene og adressene ligger i `src/lib/product.ts` (`SERVICE_META`). Temaet (papir, blekk, aksent) ligger i `src/app/theme-wrapup.css`.
