const { google } = require('googleapis');
const config = require('../../config');

class GoogleDriveAuthService {
  constructor() {
    this._oauth2Client = null;
  }

  /**
   * Returns an authenticated OAuth2 client with proactive token refresh.
   */
  getClient() {
    if (!this._oauth2Client) {
      const clientId = config.GOOGLE_CLIENT_ID;
      const clientSecret = config.GOOGLE_CLIENT_SECRET;
      const refreshToken = config.GOOGLE_REFRESH_TOKEN;

      if (!clientId || !clientSecret || !refreshToken) {
        throw new Error('Google Drive OAuth2 credentials are not configured');
      }

      this._oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
      this._oauth2Client.setCredentials({ refresh_token: refreshToken });
    }
    return this._oauth2Client;
  }

  getFolderId() {
    return config.GOOGLE_DRIVE_FOLDER_ID;
  }
}

module.exports = GoogleDriveAuthService;
