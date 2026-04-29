INSERT INTO public.system_settings (key, value, description)
VALUES (
  'provider_routing',
  '{"flights":"default","stays":"default","visas":"default","insurance":"default","tours":"default","pickups":"default"}'::jsonb,
  'Per-vertical provider selection. Use "default" for built-in providers (Duffel, LiteAPI, crawled inventory) or "travsify" to route through the Travsify API. Travsify requires TRAVSIFY_API_KEY secret.'
)
ON CONFLICT (key) DO NOTHING;