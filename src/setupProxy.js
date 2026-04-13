const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // Proxy for fetchById endpoint (api-preprod.txninfra.com)
  app.use(
    '/api/preprod',
    createProxyMiddleware({
      target: 'https://api-preprod.txninfra.com',
      changeOrigin: true,
      pathRewrite: {
        '^/api/preprod': ''
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(500).json({ error: 'Proxy error', message: err.message });
      }
    })
  );

  // Proxy for services.txninfra.com endpoints
  app.use(
    '/api/services',
    createProxyMiddleware({
      target: 'https://services.txninfra.com',
      changeOrigin: true,
      pathRewrite: {
        '^/api/services': ''
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(500).json({ error: 'Proxy error', message: err.message });
      }
    })
  );

  // Proxy for services-cboi-uat.isupay.in endpoints (reports)
  app.use(
    '/api/cboi-uat',
    createProxyMiddleware({
      target: 'https://services-cboi-uat.isupay.in',
      changeOrigin: true,
      pathRewrite: {
        '^/api/cboi-uat': ''
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(500).json({ error: 'Proxy error', message: err.message });
      }
    })
  );
};
