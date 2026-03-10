export function errorHandler(err, _req, res, _next) {
    console.error('[Error]', err.message, err.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
}
//# sourceMappingURL=errors.js.map