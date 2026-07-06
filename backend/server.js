require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const JWT_SECRET = process.env.JWT_SECRET || 'titkos_drivecheck_kulcs_2026';

// --- BIZTONSÁGI MIDDLEWARE-EK ---
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ hiba: 'Hiányzó hitelesítési token!' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ hiba: 'Érvénytelen vagy lejárt token!' });
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ hiba: '403 Forbidden: Nincs adminisztrátori jogosultságod!' });
  }
  next();
}

// --- HITELESÍTÉS VÉGPONTOK ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ hiba: 'Kötelező adatok!' });

    const password_hash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: { username, password_hash, role: role || 'USER' }
    });
    res.status(201).json({ üzenet: 'Felhasználó sikeresen létrehozva!', userId: newUser.id });
  } catch (error) {
    res.status(400).json({ hiba: 'Ez a felhasználónév már létezik!' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ hiba: 'Hibás felhasználónév vagy jelszó!' });
    }

    const tokenPayload = { id: user.id, username: user.username, role: user.role };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      üzenet: 'Sikeres bejelentkezés!',
      token: token,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ hiba: 'Szerverhiba bejelentkezéskor.' });
  }
});

// --- SOFŐR VÉGPONTOK ---
app.get('/api/autok', authenticateToken, async (req, res) => {
  try {
    const autok = await prisma.auto.findMany({ select: { rendszam: true, tipus: true, statusz: true } });
    res.json(autok);
  } catch (error) { res.status(500).json({ hiba: 'Hiba.' }); }
});

app.get('/api/utak', authenticateToken, async (req, res) => {
  try {
    const utak = await prisma.ut.findMany({ where: { sofor_nev: req.user.username }, include: { auto: true } });
    res.json(utak);
  } catch (error) { res.status(500).json({ hiba: 'Hiba.' }); }
});

app.post('/api/utak', authenticateToken, async (req, res) => {
  try {
    const { auto_rendszam, indulas, erkezes, tavolsag, koltseg, fogyasztas, honap_ev } = req.body;
    const auto = await prisma.auto.findUnique({ where: { rendszam: auto_rendszam } });
    if (!auto) return res.status(404).json({ hiba: 'Az autó nem létezik!' });

    const ujUt = await prisma.ut.create({
      data: {
        sofor_nev: req.user.username,
        auto_rendszam, indulas, erkezes,
        tavolsag: parseFloat(tavolsag),
        koltseg: parseFloat(koltseg || 0),
        fogyasztas: parseFloat(fogyasztas),
        honap_ev,
        status: 'BEERKEZO'
      }
    });
    res.status(201).json(ujUt);
  } catch (error) { res.status(400).json({ hiba: 'Hiba az igény leadásakor.' }); }
});

// --- ADMIN VÉGPONTOK ---
app.get('/api/admin/utak', authenticateToken, requireAdmin, async (req, res) => {
  try { res.json(await prisma.ut.findMany({ include: { auto: true } })); } catch (error) { res.status(500).json({ hiba: 'Hiba.' }); }
});

app.patch('/api/admin/utak/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const ut = await prisma.ut.update({ where: { id }, data: { status } });
    if (status === 'JOVAHAGYOTT') {
      await prisma.auto.update({ where: { rendszam: ut.auto_rendszam }, data: { statusz: 'FOGLALT' } });
    }
    res.json({ üzenet: `Frissítve: ${status}`, ut });
  } catch (error) { res.status(400).json({ hiba: 'Hiba.' }); }
});

app.post('/api/admin/autok', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { rendszam, tipus, statusz, itp_lejart, utado_fizetve, szerviz_adatok } = req.body;
    const ujAuto = await prisma.auto.create({
      data: { rendszam, tipus, statusz: statusz || 'ELERHETO', itp_lejart, utado_fizetve, szerviz_adatok }
    });
    res.status(201).json(ujAuto);
  } catch (error) { res.status(400).json({ hiba: 'Hiba.' }); }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚗 DriveCheck V2 API fut a ${PORT} porton.`));
