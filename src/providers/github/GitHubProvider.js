const { Octokit } = require('@octokit/rest');
const IStorageProvider = require('../IStorageProvider');
const GitHubAuthService = require('./GitHubAuthService');
const ApiError = require('../../utils/ApiError');
const logger = require('../../utils/logger');

class GitHubProvider extends IStorageProvider {
  constructor() {
    super();
    this.auth = new GitHubAuthService();
    this.octokit = new Octokit({ auth: this.auth.getToken() });
  }

  /**
   * Upload a file by committing it to the configured GitHub repository.
   * externalId = the file path inside the repo (used for getUrl / delete).
   */
  async upload(fileBuffer, filename, mimeType, options = {}) {
    const owner = this.auth.getOwner();
    const repo = this.auth.getRepo();
    const branch = this.auth.getBranch();
    const basePath = this.auth.getUploadPath();
    const filePath = `${basePath}/${filename}`;

    try {
      const content = fileBuffer.toString('base64');

      // Check if file already exists (we need its SHA to update)
      let sha;
      try {
        const { data } = await this.octokit.repos.getContent({
          owner,
          repo,
          path: filePath,
          ref: branch,
        });
        sha = data.sha;
      } catch (err) {
        if (err.status !== 404) throw err;
        // File does not exist yet — that's fine, create it
      }

      await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: filePath,
        message: `Upload ${filename}`,
        content,
        branch,
        ...(sha && { sha }),
      });

      const publicUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;

      logger.info(`GitHub: uploaded ${filePath}`);
      return { externalId: filePath, publicUrl };
    } catch (err) {
      logger.error(`GitHub upload failed: ${err.message}`);
      throw ApiError.badGateway(`GitHub upload failed: ${err.message}`);
    }
  }

  async getUrl(externalId) {
    const owner = this.auth.getOwner();
    const repo = this.auth.getRepo();
    const branch = this.auth.getBranch();
    const publicUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${externalId}`;
    return { publicUrl };
  }

  async delete(externalId) {
    const owner = this.auth.getOwner();
    const repo = this.auth.getRepo();
    const branch = this.auth.getBranch();

    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path: externalId,
        ref: branch,
      });

      await this.octokit.repos.deleteFile({
        owner,
        repo,
        path: externalId,
        message: `Delete ${externalId}`,
        sha: data.sha,
        branch,
      });

      logger.info(`GitHub: deleted ${externalId}`);
    } catch (err) {
      logger.error(`GitHub delete failed: ${err.message}`);
      throw ApiError.badGateway(`GitHub delete failed: ${err.message}`);
    }
  }
}

module.exports = GitHubProvider;
