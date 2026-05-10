const config = require('../../config');

class GitHubAuthService {
  getToken() {
    const token = config.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GITHUB_TOKEN is not configured');
    }
    return token;
  }

  getOwner() {
    return config.GITHUB_OWNER;
  }

  getRepo() {
    return config.GITHUB_REPO;
  }

  getBranch() {
    return config.GITHUB_BRANCH;
  }

  getUploadPath() {
    return config.GITHUB_UPLOAD_PATH;
  }
}

module.exports = GitHubAuthService;
