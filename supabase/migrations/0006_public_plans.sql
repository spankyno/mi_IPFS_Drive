-- =====================================================================
-- mi_IPFS_Drive — Migración 0006
-- Permite lectura pública (rol anon, sin sesión) de la tabla `plans`.
--
-- Por qué: la página pública "/acerca-de" muestra los precios y límites
-- de cada plan usando la tabla `plans` como única fuente de verdad (en
-- vez de duplicar esos números a mano en el código, que se desincroniza
-- fácilmente si cambias un límite más adelante). `plans` no contiene
-- ningún dato personal ni sensible — solo nombres de plan, precio y
-- límites numéricos — así que abrir su lectura a visitantes anónimos es
-- seguro.
-- =====================================================================

create policy "Los planes son legibles también sin sesión (para /acerca-de)"
  on public.plans for select
  to anon
  using (true);
