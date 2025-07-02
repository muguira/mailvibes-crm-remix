# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/244077ab-888f-4e29-835c-589729e7d746

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/244077ab-888f-4e29-835c-589729e7d746) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/244077ab-888f-4e29-835c-589729e7d746) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

# Supabase RLS Setup for Contacts Table

To properly set up Row Level Security for the contacts table in Supabase, run the following SQL in your Supabase SQL Editor:

```sql
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
```

This will ensure that:

1. Only authenticated users can access the contacts table
2. Users can only see and modify their own contacts (where user_id = their auth.uid())
3. All operations (select, insert, update, delete) are covered by the policy
4. The policy enforces user_id = auth.uid() for both reading and writing data

# Supabase RLS Setup for Tasks Table

To properly set up Row Level Security for the tasks table in Supabase, run the following SQL in your Supabase SQL Editor:

```sql
-- Enable RLS on tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policy for SELECT
CREATE POLICY "Users can view their own tasks"
ON tasks FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create policy for INSERT
CREATE POLICY "Users can create their own tasks"
ON tasks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create policy for UPDATE
CREATE POLICY "Users can update their own tasks"
ON tasks FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create policy for DELETE
CREATE POLICY "Users can delete their own tasks"
ON tasks FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

This will ensure that:

1. Only authenticated users can access the tasks table
2. Users can only see and modify their own tasks (where user_id = their auth.uid())
3. All operations (select, insert, update, delete) are covered by separate policies
4. The policy enforces user_id = auth.uid() for all operations
