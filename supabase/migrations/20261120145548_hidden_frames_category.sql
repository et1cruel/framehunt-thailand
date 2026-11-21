insert into public.categories (slug, name_th, name_en, "group", icon)
values ('hidden-frames', 'มุมที่คนมองข้าม', 'Hidden Frames', 'urban', 'Focus')
on conflict (slug) do update set
  name_th = excluded.name_th,
  name_en = excluded.name_en,
  "group" = excluded."group",
  icon = excluded.icon;
