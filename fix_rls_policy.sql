-- Create proper contacts RLS policy
create policy "Auth users can access their own contacts"
on contacts 
for all -- applies to all operations
to authenticated -- authenticated users only
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Alternative policy for upsert operations
create policy "Auth users can upsert their own contacts"
on contacts 
for insert
to authenticated 
with check (user_id = auth.uid()); 