insert into public.categories (slug, name_th, name_en, "group", icon)
values
  ('live-music', 'ดนตรีสด / Live House', 'Live Music / Live House', 'art', 'Music'),
  ('underground-music', 'ดนตรีนอกกระแส', 'Underground Music', 'art', 'AudioLines'),
  ('hip-hop', 'ฮิปฮอป / แรป', 'Hip-Hop / Rap', 'art', 'Mic')
on conflict (slug) do update set
  name_th = excluded.name_th,
  name_en = excluded.name_en,
  "group" = excluded."group",
  icon = excluded.icon;
