INSERT INTO public.providers (slug, name, vertical, kind, base_url, enabled, mode)
VALUES
  ('booking-flights', 'Booking.com (Flights)', 'flights', 'api', 'https://booking-com15.p.rapidapi.com', true, 'live'),
  ('booking-hotels',  'Booking.com (Hotels)',  'stays',   'api', 'https://booking-com15.p.rapidapi.com', true, 'live'),
  ('booking-tours',   'Booking.com (Tours)',   'tours',   'api', 'https://booking-com15.p.rapidapi.com', true, 'live'),
  ('booking-cars',    'Booking.com (Cars)',    'pickups', 'api', 'https://booking-com15.p.rapidapi.com', true, 'live')
ON CONFLICT (slug) DO NOTHING;