/**
 * @openapi
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Health check
 *     description: Returns the liveness status of the service. No authentication required.
 *     security: []
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: ok
 *                 error:
 *                   type: string
 *                   nullable: true
 *                   example: null
 */

/**
 * @openapi
 * tags:
 *   - name: System
 *     description: Service health and metadata
 */
