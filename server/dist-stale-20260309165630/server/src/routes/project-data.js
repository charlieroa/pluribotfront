import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { prisma } from '../db/client.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'plury-project-secret';
const MAX_ROWS_PER_PROJECT = 10_000;
const TABLE_NAME_RE = /^[a-z_][a-z0-9_]{0,63}$/;
// File upload config for project files
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'projects');
if (!fs.existsSync(UPLOAD_DIR))
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const projectUpload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
        filename: (_req, file, cb) => cb(null, `${Date.now()}-${uuid().slice(0, 8)}${path.extname(file.originalname)}`),
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|gif|webp|svg|pdf|doc|docx|xls|xlsx|csv|txt|mp4|mp3)$/i;
        cb(null, allowed.test(path.extname(file.originalname)));
    },
});
// ─── Helpers ───
function getProjectJwt(req) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer '))
        return null;
    try {
        const payload = jwt.verify(auth.slice(7), JWT_SECRET);
        if (payload.type !== 'project')
            return null;
        return { projectId: payload.projectId, projectUserId: payload.projectUserId, email: payload.email, role: payload.role };
    }
    catch {
        return null;
    }
}
// ─── Auth endpoints ───
router.post('/:id/auth/register', async (req, res) => {
    try {
        const conversationId = req.params.id;
        const { email, password, displayName, role } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Email y password son requeridos' });
            return;
        }
        const existing = await prisma.projectUser.findUnique({
            where: { conversationId_email: { conversationId, email } },
        });
        if (existing) {
            res.status(409).json({ error: 'El email ya esta registrado' });
            return;
        }
        // First user in a project is auto-admin, rest are 'user'
        const userCount = await prisma.projectUser.count({ where: { conversationId } });
        const assignedRole = userCount === 0 ? 'admin' : (role || 'user');
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.projectUser.create({
            data: { id: uuid(), conversationId, email, passwordHash, displayName: displayName || email.split('@')[0], role: assignedRole },
        });
        const token = jwt.sign({ type: 'project', projectId: conversationId, projectUserId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role } });
    }
    catch (err) {
        console.error('[ProjectAuth] Register error:', err);
        res.status(500).json({ error: 'Error al registrar' });
    }
});
router.post('/:id/auth/login', async (req, res) => {
    try {
        const conversationId = req.params.id;
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Email y password son requeridos' });
            return;
        }
        const user = await prisma.projectUser.findUnique({
            where: { conversationId_email: { conversationId, email } },
        });
        if (!user) {
            res.status(401).json({ error: 'Credenciales invalidas' });
            return;
        }
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            res.status(401).json({ error: 'Credenciales invalidas' });
            return;
        }
        const token = jwt.sign({ type: 'project', projectId: conversationId, projectUserId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role } });
    }
    catch (err) {
        console.error('[ProjectAuth] Login error:', err);
        res.status(500).json({ error: 'Error al iniciar sesion' });
    }
});
router.get('/:id/auth/me', async (req, res) => {
    const auth = getProjectJwt(req);
    if (!auth) {
        res.status(401).json({ error: 'No autenticado' });
        return;
    }
    try {
        const user = await prisma.projectUser.findUnique({ where: { id: auth.projectUserId } });
        if (!user) {
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }
        res.json({ id: user.id, email: user.email, displayName: user.displayName, role: user.role });
    }
    catch {
        res.status(500).json({ error: 'Error interno' });
    }
});
// ─── Schema endpoints ───
router.get('/:id/schema', async (req, res) => {
    try {
        const schemas = await prisma.projectSchema.findMany({
            where: { conversationId: req.params.id },
            orderBy: { tableName: 'asc' },
        });
        res.json(schemas.map(s => ({ tableName: s.tableName, columns: JSON.parse(s.columnsJson) })));
    }
    catch (err) {
        console.error('[ProjectSchema] Error:', err);
        res.status(500).json({ error: 'Error al obtener schema' });
    }
});
router.post('/:id/schema', async (req, res) => {
    try {
        const conversationId = req.params.id;
        const { tableName, columns } = req.body;
        if (!tableName || !TABLE_NAME_RE.test(tableName)) {
            res.status(400).json({ error: 'Nombre de tabla invalido' });
            return;
        }
        const schema = await prisma.projectSchema.upsert({
            where: { conversationId_tableName: { conversationId, tableName } },
            create: { id: uuid(), conversationId, tableName, columnsJson: JSON.stringify(columns) },
            update: { columnsJson: JSON.stringify(columns) },
        });
        res.json({ tableName: schema.tableName, columns: JSON.parse(schema.columnsJson) });
    }
    catch (err) {
        console.error('[ProjectSchema] Error:', err);
        res.status(500).json({ error: 'Error al guardar schema' });
    }
});
// ─── Admin: update user role ───
router.put('/:id/auth/users/:userId/role', async (req, res) => {
    const auth = getProjectJwt(req);
    if (!auth || auth.role !== 'admin') {
        res.status(403).json({ error: 'Solo administradores pueden cambiar roles' });
        return;
    }
    try {
        const user = await prisma.projectUser.findUnique({ where: { id: req.params.userId } });
        if (!user || user.conversationId !== req.params.id) {
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }
        const { role } = req.body;
        if (!role || !['admin', 'user', 'editor', 'viewer'].includes(role)) {
            res.status(400).json({ error: 'Rol invalido. Usa: admin, user, editor, viewer' });
            return;
        }
        await prisma.$executeRawUnsafe(`UPDATE ProjectUser SET role = ? WHERE id = ?`, role, user.id);
        res.json({ id: user.id, email: user.email, role });
    }
    catch (err) {
        console.error('[ProjectAuth] Update role error:', err);
        res.status(500).json({ error: 'Error al actualizar rol' });
    }
});
// ─── Admin: list users ───
router.get('/:id/auth/users', async (req, res) => {
    const auth = getProjectJwt(req);
    if (!auth || auth.role !== 'admin') {
        res.status(403).json({ error: 'Solo administradores pueden listar usuarios' });
        return;
    }
    try {
        const users = await prisma.projectUser.findMany({
            where: { conversationId: req.params.id },
            orderBy: { createdAt: 'desc' },
        });
        res.json(users.map(u => ({ id: u.id, email: u.email, displayName: u.displayName, role: u.role || 'user', createdAt: u.createdAt })));
    }
    catch (err) {
        res.status(500).json({ error: 'Error al listar usuarios' });
    }
});
// ─── File upload ───
router.post('/:id/upload', projectUpload.single('file'), (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: 'No se recibio archivo' });
        return;
    }
    const cdnBase = process.env.CDN_BASE_URL || `http://localhost:${process.env.PORT ?? '3002'}`;
    const url = `${cdnBase}/uploads/projects/${req.file.filename}`;
    res.json({ url, filename: req.file.filename, size: req.file.size, mimetype: req.file.mimetype });
});
// ─── CRUD endpoints ───
// Count rows
router.get('/:id/data/:table/count', async (req, res) => {
    try {
        const { id: conversationId, table: tableName } = req.params;
        if (!TABLE_NAME_RE.test(tableName)) {
            res.status(400).json({ error: 'Nombre de tabla invalido' });
            return;
        }
        const rows = await prisma.projectData.findMany({
            where: { conversationId, tableName },
            select: { dataJson: true },
        });
        // Apply same filters as list
        const { ...filters } = req.query;
        let count = rows.length;
        if (Object.keys(filters).length > 0) {
            let parsed = rows.map(r => JSON.parse(r.dataJson));
            for (const [key, val] of Object.entries(filters)) {
                if (typeof val === 'string') {
                    parsed = parsed.filter((row) => row[key] !== undefined && String(row[key]).toLowerCase() === val.toLowerCase());
                }
            }
            count = parsed.length;
        }
        res.json({ count });
    }
    catch (err) {
        console.error('[ProjectData] Count error:', err);
        res.status(500).json({ error: 'Error al contar datos' });
    }
});
// Aggregate (sum, avg, min, max)
router.get('/:id/data/:table/aggregate', async (req, res) => {
    try {
        const { id: conversationId, table: tableName } = req.params;
        if (!TABLE_NAME_RE.test(tableName)) {
            res.status(400).json({ error: 'Nombre de tabla invalido' });
            return;
        }
        const { _field, _op, ...filters } = req.query;
        if (!_field || !_op) {
            res.status(400).json({ error: 'Parametros _field y _op son requeridos (_op: sum, avg, min, max)' });
            return;
        }
        const rows = await prisma.projectData.findMany({
            where: { conversationId, tableName },
        });
        let parsed = rows.map(r => ({ id: r.id, ...JSON.parse(r.dataJson) }));
        // Apply filters
        for (const [key, val] of Object.entries(filters)) {
            if (typeof val === 'string') {
                parsed = parsed.filter((row) => row[key] !== undefined && String(row[key]).toLowerCase() === val.toLowerCase());
            }
        }
        const field = _field;
        const values = parsed.map((r) => parseFloat(r[field])).filter(v => !isNaN(v));
        let result = null;
        switch (_op) {
            case 'sum':
                result = values.reduce((a, b) => a + b, 0);
                break;
            case 'avg':
                result = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
                break;
            case 'min':
                result = values.length > 0 ? Math.min(...values) : null;
                break;
            case 'max':
                result = values.length > 0 ? Math.max(...values) : null;
                break;
            default:
                res.status(400).json({ error: 'Operacion invalida. Usa: sum, avg, min, max' });
                return;
        }
        res.json({ field, op: _op, value: result, count: values.length });
    }
    catch (err) {
        console.error('[ProjectData] Aggregate error:', err);
        res.status(500).json({ error: 'Error en agregacion' });
    }
});
// List rows (with expand, row-level security, and _mine filter)
router.get('/:id/data/:table', async (req, res) => {
    try {
        const { id: conversationId, table: tableName } = req.params;
        if (!TABLE_NAME_RE.test(tableName)) {
            res.status(400).json({ error: 'Nombre de tabla invalido' });
            return;
        }
        const rows = await prisma.projectData.findMany({
            where: { conversationId, tableName },
            orderBy: { createdAt: 'desc' },
        });
        let parsed = rows.map(r => ({ id: r.id, ...JSON.parse(r.dataJson), _createdAt: r.createdAt }));
        // Apply filters from query params
        const { _sort, _order, _limit, _offset, _expand, _mine, ...filters } = req.query;
        // Row-level security: _mine=true filters to current user's rows only
        if (_mine === 'true') {
            const auth = getProjectJwt(req);
            if (auth) {
                parsed = parsed.filter((row) => row.user_id === auth.projectUserId);
            }
        }
        for (const [key, val] of Object.entries(filters)) {
            if (typeof val === 'string') {
                parsed = parsed.filter((row) => {
                    const rowVal = row[key];
                    if (rowVal === undefined)
                        return false;
                    return String(rowVal).toLowerCase() === val.toLowerCase();
                });
            }
        }
        // Sort
        if (typeof _sort === 'string') {
            const order = _order === 'asc' ? 1 : -1;
            parsed.sort((a, b) => {
                const av = a[_sort], bv = b[_sort];
                if (av < bv)
                    return -1 * order;
                if (av > bv)
                    return 1 * order;
                return 0;
            });
        }
        // Pagination
        const offset = _offset ? parseInt(_offset, 10) : 0;
        const limit = _limit ? Math.min(parseInt(_limit, 10), 100) : 100;
        parsed = parsed.slice(offset, offset + limit);
        // Expand relations: _expand=tableName.foreignKey loads related rows
        // Usage: ?_expand=categories.category_id means: for each row, load from "categories" where category row.id === row.category_id
        if (typeof _expand === 'string') {
            const expands = _expand.split(',');
            for (const exp of expands) {
                const [relTable, fkField] = exp.split('.');
                if (!relTable || !TABLE_NAME_RE.test(relTable))
                    continue;
                const foreignKey = fkField || `${relTable.replace(/s$/, '')}_id`;
                // Load all rows from the related table
                const relRows = await prisma.projectData.findMany({
                    where: { conversationId, tableName: relTable },
                });
                const relMap = new Map();
                for (const r of relRows) {
                    const data = { id: r.id, ...JSON.parse(r.dataJson) };
                    relMap.set(r.id, data);
                }
                // Attach related data to each row
                parsed = parsed.map((row) => {
                    const fkValue = row[foreignKey];
                    if (fkValue && relMap.has(fkValue)) {
                        return { ...row, [`_${relTable.replace(/s$/, '')}`]: relMap.get(fkValue) };
                    }
                    return row;
                });
            }
        }
        res.json(parsed);
    }
    catch (err) {
        console.error('[ProjectData] List error:', err);
        res.status(500).json({ error: 'Error al listar datos' });
    }
});
// Get single row
router.get('/:id/data/:table/:rowId', async (req, res) => {
    try {
        const row = await prisma.projectData.findUnique({ where: { id: req.params.rowId } });
        if (!row || row.conversationId !== req.params.id || row.tableName !== req.params.table) {
            res.status(404).json({ error: 'No encontrado' });
            return;
        }
        res.json({ id: row.id, ...JSON.parse(row.dataJson), _createdAt: row.createdAt });
    }
    catch (err) {
        res.status(500).json({ error: 'Error al obtener dato' });
    }
});
// Create row
router.post('/:id/data/:table', async (req, res) => {
    try {
        const { id: conversationId, table: tableName } = req.params;
        if (!TABLE_NAME_RE.test(tableName)) {
            res.status(400).json({ error: 'Nombre de tabla invalido' });
            return;
        }
        // Check row limit
        const count = await prisma.projectData.count({ where: { conversationId } });
        if (count >= MAX_ROWS_PER_PROJECT) {
            res.status(429).json({ error: `Limite de ${MAX_ROWS_PER_PROJECT} filas alcanzado` });
            return;
        }
        // Inject user_id from JWT if authenticated
        const auth = getProjectJwt(req);
        const data = { ...req.body };
        if (auth)
            data.user_id = auth.projectUserId;
        const row = await prisma.projectData.create({
            data: { id: uuid(), conversationId, tableName, dataJson: JSON.stringify(data) },
        });
        res.status(201).json({ id: row.id, ...data, _createdAt: row.createdAt });
    }
    catch (err) {
        console.error('[ProjectData] Create error:', err);
        res.status(500).json({ error: 'Error al crear dato' });
    }
});
// Update row
router.put('/:id/data/:table/:rowId', async (req, res) => {
    try {
        const existing = await prisma.projectData.findUnique({ where: { id: req.params.rowId } });
        if (!existing || existing.conversationId !== req.params.id || existing.tableName !== req.params.table) {
            res.status(404).json({ error: 'No encontrado' });
            return;
        }
        const merged = { ...JSON.parse(existing.dataJson), ...req.body };
        const row = await prisma.projectData.update({
            where: { id: req.params.rowId },
            data: { dataJson: JSON.stringify(merged) },
        });
        res.json({ id: row.id, ...merged, _createdAt: row.createdAt });
    }
    catch (err) {
        console.error('[ProjectData] Update error:', err);
        res.status(500).json({ error: 'Error al actualizar dato' });
    }
});
// Delete row
router.delete('/:id/data/:table/:rowId', async (req, res) => {
    try {
        const existing = await prisma.projectData.findUnique({ where: { id: req.params.rowId } });
        if (!existing || existing.conversationId !== req.params.id || existing.tableName !== req.params.table) {
            res.status(404).json({ error: 'No encontrado' });
            return;
        }
        await prisma.projectData.delete({ where: { id: req.params.rowId } });
        res.json({ deleted: true });
    }
    catch (err) {
        console.error('[ProjectData] Delete error:', err);
        res.status(500).json({ error: 'Error al eliminar dato' });
    }
});
export default router;
//# sourceMappingURL=project-data.js.map