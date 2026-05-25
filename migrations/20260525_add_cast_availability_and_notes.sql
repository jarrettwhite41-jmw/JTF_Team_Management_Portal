-- Cast availability and director-facing notes foundation
-- Shared contract for Cast and Directors portals.

alter table if exists public.show_information
  add column if not exists cast_signup_enabled boolean not null default true,
  add column if not exists cast_signup_deadline_at timestamptz null;

create table if not exists public.show_availability (
  availability_id uuid primary key default gen_random_uuid(),
  show_id integer not null references public.show_information(show_id) on delete cascade,
  personnel_id integer not null references public.personnel(personnel_id) on delete cascade,
  availability_status text null check (availability_status in ('available', 'not_available', 'alternate')),
  availability_note text null,
  source_portal text not null default 'cast' check (source_portal in ('cast', 'team', 'director')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid null references auth.users(id) on delete set null,
  updated_by_user_id uuid null references auth.users(id) on delete set null,
  unique (show_id, personnel_id)
);

create index if not exists idx_show_availability_show_status
  on public.show_availability (show_id, availability_status);

create index if not exists idx_show_availability_personnel_show
  on public.show_availability (personnel_id, show_id);

create index if not exists idx_show_availability_updated_at
  on public.show_availability (updated_at desc);

create table if not exists public.show_availability_history (
  history_id uuid primary key default gen_random_uuid(),
  availability_id uuid not null references public.show_availability(availability_id) on delete cascade,
  show_id integer not null,
  personnel_id integer not null,
  old_status text null,
  new_status text null,
  old_note text null,
  new_note text null,
  changed_at timestamptz not null default now(),
  changed_by_user_id uuid null references auth.users(id) on delete set null,
  changed_from_portal text not null default 'cast'
);

create index if not exists idx_show_availability_history_show
  on public.show_availability_history (show_id, changed_at desc);

create table if not exists public.show_notes (
  note_id uuid primary key default gen_random_uuid(),
  show_id integer not null references public.show_information(show_id) on delete cascade,
  note_scope text not null default 'overall' check (note_scope in ('overall')),
  visibility_scope text not null default 'cast' check (visibility_scope in ('cast', 'internal')),
  note_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid null references auth.users(id) on delete set null,
  updated_by_user_id uuid null references auth.users(id) on delete set null
);

create index if not exists idx_show_notes_show
  on public.show_notes (show_id, created_at desc);

create table if not exists public.show_game_notes (
  game_note_id uuid primary key default gen_random_uuid(),
  show_id integer not null references public.show_information(show_id) on delete cascade,
  game_order integer null,
  game_label text not null,
  visibility_scope text not null default 'cast' check (visibility_scope in ('cast', 'internal')),
  note_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid null references auth.users(id) on delete set null,
  updated_by_user_id uuid null references auth.users(id) on delete set null
);

create index if not exists idx_show_game_notes_show
  on public.show_game_notes (show_id, created_at desc);

create table if not exists public.show_personnel_notes (
  personnel_note_id uuid primary key default gen_random_uuid(),
  show_id integer not null references public.show_information(show_id) on delete cascade,
  personnel_id integer not null references public.personnel(personnel_id) on delete cascade,
  note_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid null references auth.users(id) on delete set null,
  updated_by_user_id uuid null references auth.users(id) on delete set null,
  unique (show_id, personnel_id)
);

create index if not exists idx_show_personnel_notes_show
  on public.show_personnel_notes (show_id, created_at desc);

create or replace function public.set_show_availability_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if new.updated_by_user_id is null then
    new.updated_by_user_id = auth.uid();
  end if;
  return new;
end;
$$;

create or replace function public.log_show_availability_history()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.show_availability_history (
      availability_id,
      show_id,
      personnel_id,
      old_status,
      new_status,
      old_note,
      new_note,
      changed_by_user_id,
      changed_from_portal
    ) values (
      new.availability_id,
      new.show_id,
      new.personnel_id,
      null,
      new.availability_status,
      null,
      new.availability_note,
      auth.uid(),
      coalesce(new.source_portal, 'cast')
    );
    return new;
  end if;

  insert into public.show_availability_history (
    availability_id,
    show_id,
    personnel_id,
    old_status,
    new_status,
    old_note,
    new_note,
    changed_by_user_id,
    changed_from_portal
  ) values (
    new.availability_id,
    new.show_id,
    new.personnel_id,
    old.availability_status,
    new.availability_status,
    old.availability_note,
    new.availability_note,
    auth.uid(),
    coalesce(new.source_portal, old.source_portal, 'cast')
  );

  return new;
end;
$$;

drop trigger if exists trg_show_availability_updated_at on public.show_availability;
create trigger trg_show_availability_updated_at
before update on public.show_availability
for each row
execute function public.set_show_availability_updated_at();

drop trigger if exists trg_show_availability_history on public.show_availability;
create trigger trg_show_availability_history
after insert or update on public.show_availability
for each row
execute function public.log_show_availability_history();

alter table public.show_availability enable row level security;
alter table public.show_availability_history enable row level security;
alter table public.show_notes enable row level security;
alter table public.show_game_notes enable row level security;
alter table public.show_personnel_notes enable row level security;

-- Cast users can read/write their own availability before deadline when signups are enabled.
create policy "cast read own availability"
on public.show_availability
for select
to authenticated
using (
  exists (
    select 1
    from public.portal_user_access pua
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'cast'
      and pua.is_active = true
      and pua.personnel_id = show_availability.personnel_id
  )
);

create policy "cast insert own availability"
on public.show_availability
for insert
to authenticated
with check (
  exists (
    select 1
    from public.portal_user_access pua
    join public.show_information si on si.show_id = show_availability.show_id
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'cast'
      and pua.is_active = true
      and pua.personnel_id = show_availability.personnel_id
      and si.cast_signup_enabled = true
      and (si.cast_signup_deadline_at is null or now() <= si.cast_signup_deadline_at)
      and si.show_date >= current_date
  )
);

create policy "cast update own availability before deadline"
on public.show_availability
for update
to authenticated
using (
  exists (
    select 1
    from public.portal_user_access pua
    join public.show_information si on si.show_id = show_availability.show_id
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'cast'
      and pua.is_active = true
      and pua.personnel_id = show_availability.personnel_id
      and si.cast_signup_enabled = true
      and (si.cast_signup_deadline_at is null or now() <= si.cast_signup_deadline_at)
      and si.show_date >= current_date
  )
)
with check (
  exists (
    select 1
    from public.portal_user_access pua
    join public.show_information si on si.show_id = show_availability.show_id
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'cast'
      and pua.is_active = true
      and pua.personnel_id = show_availability.personnel_id
      and si.cast_signup_enabled = true
      and (si.cast_signup_deadline_at is null or now() <= si.cast_signup_deadline_at)
      and si.show_date >= current_date
  )
);

-- Directors can read availability for shows they own.
create policy "director read availability for owned shows"
on public.show_availability
for select
to authenticated
using (
  exists (
    select 1
    from public.portal_user_access pua
    join public.directors d on d.personnel_id = pua.personnel_id
    join public.show_information si on si.director_id = d.director_id
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'director'
      and pua.is_active = true
      and si.show_id = show_availability.show_id
  )
);

-- Team admins/managers can fully manage availability records.
create policy "team admin manage availability"
on public.show_availability
for all
to authenticated
using (
  exists (
    select 1
    from public.portal_user_access pua
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'team'
      and pua.is_active = true
      and pua.portal_role in ('admin', 'manager')
  )
)
with check (
  exists (
    select 1
    from public.portal_user_access pua
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'team'
      and pua.is_active = true
      and pua.portal_role in ('admin', 'manager')
  )
);

create policy "users read own availability history"
on public.show_availability_history
for select
to authenticated
using (
  exists (
    select 1
    from public.portal_user_access pua
    where pua.auth_user_id = auth.uid()
      and pua.is_active = true
      and pua.personnel_id = show_availability_history.personnel_id
      and pua.portal_name in ('cast', 'team')
  )
)
;

create policy "directors read history for owned shows"
on public.show_availability_history
for select
to authenticated
using (
  exists (
    select 1
    from public.portal_user_access pua
    join public.directors d on d.personnel_id = pua.personnel_id
    join public.show_information si on si.director_id = d.director_id
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'director'
      and pua.is_active = true
      and si.show_id = show_availability_history.show_id
  )
);

create policy "team admin read all availability history"
on public.show_availability_history
for select
to authenticated
using (
  exists (
    select 1
    from public.portal_user_access pua
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'team'
      and pua.is_active = true
      and pua.portal_role in ('admin', 'manager')
  )
);

-- Notes visibility
create policy "cast read cast-visible show notes"
on public.show_notes
for select
to authenticated
using (
  visibility_scope = 'cast'
  and exists (
    select 1
    from public.portal_user_access pua
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'cast'
      and pua.is_active = true
  )
);

create policy "cast read cast-visible game notes"
on public.show_game_notes
for select
to authenticated
using (
  visibility_scope = 'cast'
  and exists (
    select 1
    from public.portal_user_access pua
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'cast'
      and pua.is_active = true
  )
);

create policy "cast read own personnel notes"
on public.show_personnel_notes
for select
to authenticated
using (
  exists (
    select 1
    from public.portal_user_access pua
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'cast'
      and pua.is_active = true
      and pua.personnel_id = show_personnel_notes.personnel_id
  )
);

-- Directors can read and write notes for shows they own.
create policy "directors manage show notes"
on public.show_notes
for all
to authenticated
using (
  exists (
    select 1
    from public.portal_user_access pua
    join public.directors d on d.personnel_id = pua.personnel_id
    join public.show_information si on si.director_id = d.director_id
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'director'
      and pua.is_active = true
      and si.show_id = show_notes.show_id
  )
)
with check (
  exists (
    select 1
    from public.portal_user_access pua
    join public.directors d on d.personnel_id = pua.personnel_id
    join public.show_information si on si.director_id = d.director_id
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'director'
      and pua.is_active = true
      and si.show_id = show_notes.show_id
  )
);

create policy "directors manage game notes"
on public.show_game_notes
for all
to authenticated
using (
  exists (
    select 1
    from public.portal_user_access pua
    join public.directors d on d.personnel_id = pua.personnel_id
    join public.show_information si on si.director_id = d.director_id
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'director'
      and pua.is_active = true
      and si.show_id = show_game_notes.show_id
  )
)
with check (
  exists (
    select 1
    from public.portal_user_access pua
    join public.directors d on d.personnel_id = pua.personnel_id
    join public.show_information si on si.director_id = d.director_id
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'director'
      and pua.is_active = true
      and si.show_id = show_game_notes.show_id
  )
);

create policy "directors manage personnel notes"
on public.show_personnel_notes
for all
to authenticated
using (
  exists (
    select 1
    from public.portal_user_access pua
    join public.directors d on d.personnel_id = pua.personnel_id
    join public.show_information si on si.director_id = d.director_id
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'director'
      and pua.is_active = true
      and si.show_id = show_personnel_notes.show_id
  )
)
with check (
  exists (
    select 1
    from public.portal_user_access pua
    join public.directors d on d.personnel_id = pua.personnel_id
    join public.show_information si on si.director_id = d.director_id
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'director'
      and pua.is_active = true
      and si.show_id = show_personnel_notes.show_id
  )
);

-- Team admins/managers can fully manage notes.
create policy "team admin manage show notes"
on public.show_notes
for all
to authenticated
using (
  exists (
    select 1
    from public.portal_user_access pua
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'team'
      and pua.is_active = true
      and pua.portal_role in ('admin', 'manager')
  )
)
with check (
  exists (
    select 1
    from public.portal_user_access pua
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'team'
      and pua.is_active = true
      and pua.portal_role in ('admin', 'manager')
  )
);

create policy "team admin manage game notes"
on public.show_game_notes
for all
to authenticated
using (
  exists (
    select 1
    from public.portal_user_access pua
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'team'
      and pua.is_active = true
      and pua.portal_role in ('admin', 'manager')
  )
)
with check (
  exists (
    select 1
    from public.portal_user_access pua
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'team'
      and pua.is_active = true
      and pua.portal_role in ('admin', 'manager')
  )
);

create policy "team admin manage personnel notes"
on public.show_personnel_notes
for all
to authenticated
using (
  exists (
    select 1
    from public.portal_user_access pua
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'team'
      and pua.is_active = true
      and pua.portal_role in ('admin', 'manager')
  )
)
with check (
  exists (
    select 1
    from public.portal_user_access pua
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'team'
      and pua.is_active = true
      and pua.portal_role in ('admin', 'manager')
  )
);
