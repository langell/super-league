# Auth & Deployment Setup

To ensure authentication works both locally and on Vercel, follow these steps:

## 1. Vercel Environment Variables
Go to your project settings in Vercel > Environment Variables and add:

- **DATABASE_URL**: Your Neon connection string (postgres://...)
- **AUTH_SECRET**: A random string (generate with `openssl rand -base64 32` or similar)
- **GOOGLE_CLIENT_ID**: From Google Cloud Console
- **GOOGLE_CLIENT_SECRET**: From Google Cloud Console

**Important**: You do **NOT** need to set `AUTH_URL` on Vercel deployments anymore because we added `trustHost: true` to the configuration. Vercel will automatically detect the correct domain (including preview URLs).

## 2. Google Cloud Console Configuration
This is the most common reason for "redirect_uri_mismatch" errors.

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project.
3. Keep your **Authorized JavaScript Origins** and **Authorized redirect URIs** for Localhost:
   - Origins: `http://localhost:3000`
   - Redirect URI: `http://localhost:3000/api/auth/callback/google`
4. **ADD** your Vercel domains. You will need to add likely two entries:
   - **Production Domain**:
     - Origin: `https://your-app-name.vercel.app`
     - Redirect URI: `https://your-app-name.vercel.app/api/auth/callback/google`
   - **Preview/Development Domains** (Automatic Vercel URLs):
     - Origin: `https://golf-league-git-main-yourname.vercel.app` (Example)
     - Redirect URI: `https://golf-league-git-main-yourname.vercel.app/api/auth/callback/google`

**Note**: Google sometimes takes a few minutes to propagate these changes.

## 3. Local Development
For your local `env.local` file, keep:
- `AUTH_URL=http://localhost:3000` (Optional with `trustHost` but good practice locally)
