# Google Drive Credentials Setup Guide (Dev & Prod)

This guide explains how to generate and manage Google Drive API credentials for both local development and production environments.

---

## 1. Create or Select a Google Cloud Project
- Go to [Google Cloud Console](https://console.cloud.google.com/).
- Create a new project or select an existing one.

---

## 2. Enable Google Drive API
- In the Cloud Console, go to **APIs & Services > Library**.
- Search for **Google Drive API** and click **Enable**.

---

## 3. Configure OAuth Consent Screen
- Go to **APIs & Services > OAuth consent screen**.
- Fill in required fields (App name, User support email, etc.).
- For development, set User Type to **External** and add your email as a test user.
- For production, complete the verification process if needed.

---


## 4. Create OAuth Client Credentials

If you see "No OAuth clients to display," you must create a new client:

### For Development (Desktop App)
1. Go to **APIs & Services > Credentials**.
2. Click **+ Create client** (or **Create Credentials > OAuth client ID**).
3. Choose **Desktop app** as the application type.
4. Enter a name (e.g., `Polyglot-Dev`).
5. Click **Create** and copy the **Client ID** and **Client Secret**.

### For Production (Web Application)
1. Go to **APIs & Services > Credentials**.
2. Click **+ Create client** (or **Create Credentials > OAuth client ID**).
3. Choose **Web application** as the application type.
4. Add your production domain(s) as **Authorized redirect URIs**.
   - These are the URLs that Google will redirect to after a user authorizes your app.
   - For most server-side or backend integrations, you should add the URL where your app will handle the OAuth callback, such as:
     - `https://yourdomain.com/oauth2callback`
     - `https://api.yourdomain.com/auth/google/callback`
   - If you are using the OAuth 2.0 Playground to generate a refresh token, add:
     - `https://developers.google.com/oauthplayground`
  - You can add multiple URIs if needed. Each must match exactly what is used in your OAuth flow.
  - For security, only add URIs you control and that are used by your app.

#### Purpose of Redirect URI
The redirect URI is the address where Google sends the user (and the authorization code) after they approve your app’s access request. Your app or tool receives this code at the redirect URI, then exchanges it for access and refresh tokens.

#### Why it matters
- The redirect URI must match exactly what you registered in the Google Cloud Console for security reasons.
- For web apps, this is usually a backend endpoint (e.g., `/oauth2callback`).
- For desktop apps or scripts, it’s often a special value (like `urn:ietf:wg:oauth:2.0:oob`) or handled by the tool (e.g., OAuth Playground uses its own URI).

#### One-time setup
- You only need to do this flow once per account/client to get the refresh token.
- After that, your backend uses the refresh token to get new access tokens—no more redirects or user interaction needed.
- The redirect URI is only used during the initial authorization flow. Once you have the refresh token, it is not used again unless you need to re-authorize or generate a new refresh token.
5. Click **Create** and copy the **Client ID** and **Client Secret**.

---

## 5. Add Test Users (if needed)
- In the OAuth consent screen, add your email as a test user for unverified apps.

---


## 6. Generate a Refresh Token

### For Development (Desktop App Client) — Using the Provided Node.js Script
1. Make sure you have your Desktop app **Client ID** and **Client Secret** in your `.env` or set as environment variables:
  - `GOOGLE_CLIENT_ID=your-dev-client-id`
  - `GOOGLE_CLIENT_SECRET=your-dev-client-secret`
2. Install dependencies (if not already):
  ```
  npm install googleapis
  ```
3. Run the script:
  ```
  node scripts/generate_google_refresh_token.js
  ```
4. Follow the instructions:
  - Visit the URL printed in the terminal.
  - Authorize the app and copy the code provided by Google.
  - Paste the code into the terminal when prompted.
5. The script will print your **refresh token**. Copy it into your `.env` as `GOOGLE_REFRESH_TOKEN`.

### For Production (Web Application Client) — Using OAuth 2.0 Playground
1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. Click the gear icon, check **Use your own OAuth credentials**, and enter your Web app Client ID and Secret.
3. In Step 1, enter the scope:
  ```
  https://www.googleapis.com/auth/drive.file
  ```
  and click **Authorize APIs**.
4. Sign in and allow access.
5. In Step 2, click **Exchange authorization code for tokens**.
6. Copy the **refresh token**.

---

## 7. Find Your Google Drive Folder ID
- In Google Drive, open the folder you want to use.
- The URL will look like:
  `https://drive.google.com/drive/folders/<FOLDER_ID>`
- Copy the `<FOLDER_ID>` part.

---

## 8. Update Your .env Files

### For Development (.env.dev or .env)
```
GOOGLE_CLIENT_ID=your-dev-client-id
GOOGLE_CLIENT_SECRET=your-dev-client-secret
GOOGLE_REFRESH_TOKEN=your-dev-refresh-token
GOOGLE_DRIVE_FOLDER_ID=your-dev-folder-id
```

### For Production (.env.prod or .env)
```
GOOGLE_CLIENT_ID=your-prod-client-id
GOOGLE_CLIENT_SECRET=your-prod-client-secret
GOOGLE_REFRESH_TOKEN=your-prod-refresh-token
GOOGLE_DRIVE_FOLDER_ID=your-prod-folder-id
```

---

## 9. Restart Your App
- Run `npm run dev` (dev) or your production start command.

---

## Notes
- **Never commit real .env files to version control.**
- Use `.env.dev.example` and `.env.prod.example` as templates.
- For production, complete Google verification if your app will be public.
- Each environment should have its own refresh token, client ID, and secret.

---

For questions, see the official [Google Drive API docs](https://developers.google.com/drive/api/v3/about-auth) or ask your team lead.
