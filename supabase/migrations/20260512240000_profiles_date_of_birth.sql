-- Optional birth date for "My Life in Weeks" and similar features.
alter table public.profiles
  add column if not exists date_of_birth date;

comment on column public.profiles.date_of_birth is 'User birth date (calendar date); used for life-in-weeks visualization.';
