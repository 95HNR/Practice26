const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { JWT_SECRET } = require('../middlewares/auth');

exports.register = async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const password_hash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({ data: { username, password_hash, role: role || 'USER' } });
    res.status(201).json({ üzenet: 'Kész!', userId: newUser.id });
  } catch (error) { res.status(400).json({ hiba: 'Létező név!' }); }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ hiba: 'Hibás adatok!' });
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ üzenet: 'Belépve!', token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) { res.status(500).json({ hiba: 'Szerverhiba.' }); }
};