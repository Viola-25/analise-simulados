<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/0685eef1-0abe-476a-a62a-2ef211338078

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GROQ_API_KEY` in [.env.local](.env.local) to your Groq API key
3. Optionally set `GROQ_MODEL` if you want to swap the default model
4. Run the app:
   `npm run dev`

### Supabase

For authentication and per-user storage in this Vite app, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in [.env.local](.env.local). The browser client lives in [src/utils/supabase/client.ts](src/utils/supabase/client.ts) and the optional Express session middleware is in [src/utils/supabase/middleware.ts](src/utils/supabase/middleware.ts).

Apply the SQL in [supabase-schema.sql](supabase-schema.sql) to create the `user_app_data` table and RLS policies before using login/sync.
