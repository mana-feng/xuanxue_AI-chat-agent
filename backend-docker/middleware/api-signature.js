/**
 * API signature verification middleware.
 * Used to validate request signatures and block replay/tampering.
 */

const config = require('../config');
const { verifySignature, extractSignatureInfo } = require('../utils/api-signature');
const { sanitizeErrorForLog, sanitizeText } = require('../utils/error-sanitizer');

const SIGNATURE_ENABLED = config.API_SIGNATURE_ENABLED;

function apiSignatureMiddleware() {
	return async (req, res, next) => {
		if (!SIGNATURE_ENABLED) {
			return next();
		}

		// Signatures are only required for state-changing requests.
		if (req.method === 'GET' || req.method === 'OPTIONS') {
			return next();
		}

		try {
			const { params, timestamp, nonce, signature } = extractSignatureInfo(req);

			if (!signature || !timestamp || !nonce) {
				return res.status(400).json({
					error:
						'Missing signature headers. Please include X-Timestamp, X-Nonce, and X-Signature.',
				});
			}

			const signatureKey = req.user?.signatureKey || undefined;
			const verification = await verifySignature(
				params,
				timestamp,
				nonce,
				signature,
				signatureKey
			);

			if (!verification.valid) {
				console.warn(
					'Signature verification failed:',
					sanitizeText(verification.error || ''),
					req.path
				);
				return res.status(400).json({
					error: verification.error || 'Signature verification failed',
				});
			}

			return next();
		} catch (error) {
			console.error('Signature middleware error:', sanitizeErrorForLog(error));
			return res.status(500).json({ error: 'Signature verification failed' });
		}
	};
}

module.exports = {
	apiSignatureMiddleware,
};
