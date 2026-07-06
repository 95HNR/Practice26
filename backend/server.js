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

// CORS engedélyezése, hogy a frontend (localhost:5173 vagy 127.0.0.1:5173) kommunikálhasson a backenddel
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'titkos_drivecheck_kulcs_2026';

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
  if (req.user.role !== 'ADMIN') return res.status(403).json({ hiba: '403 Forbidden!' });
  next();
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const password_hash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({ data: { username, password_hash, role: role || 'USER' } });
    res.status(201).json({ üzenet: 'Kész!', userId: newUser.id });
  } catch (error) { res.status(400).json({ hiba: 'Létező név!' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ hiba: 'Hibás adatok!' });
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ üzenet: 'Belépve!', token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) { res.status(500).json({ hiba: 'Szerverhiba.' }); }
});

app.get('/api/autok', authenticateToken, async (req, res) => {
  try {
    const { form_date } = req.query;
    const today = new Date().toISOString().split('T')[0];
    
    const todayApprovedUtak = await prisma.ut.findMany({
      where: { honap_ev: today, status: 'JOVAHAGYOTT' },
      select: { auto_rendszam: true }
    });
    const todayBusyPlates = todayApprovedUtak.map(u => u.auto_rendszam);

    let formBusyPlates = [];
    if (form_date) {
      const formApprovedUtak = await prisma.ut.findMany({
        where: { honap_ev: form_date, status: 'JOVAHAGYOTT' },
        select: { auto_rendszam: true }
      });
      formBusyPlates = formApprovedUtak.map(u => u.auto_rendszam);
    }

    const autok = await prisma.auto.findMany();
    
    const dinamikusFlotta = autok.map(a => ({
      rendszam: a.rendszam,
      tipus: a.tipus,
      statusz: todayBusyPlates.includes(a.rendszam) ? 'FOGLALT' : 'ELERHETO',
      elerhetoAFormDatumon: !formBusyPlates.includes(a.rendszam)
    }));

    res.json(dinamikusFlotta);
  } catch (error) { res.status(500).json({ hiba: 'Hiba a flotta lekérdezésekor.' }); }
});

app.get('/api/utak', authenticateToken, async (req, res) => {
  try { res.json(await prisma.ut.findMany({ where: { sofor_nev: req.user.username }, include: { auto: true } })); } catch (error) { res.status(500).json({ hiba: 'Hiba.' }); }
});

app.post('/api/utak', authenticateToken, async (req, res) => {
  try {
    const { auto_rendszam, indulas, erkezes, tavolsag, koltseg, fogyasztas, honap_ev } = req.body;
    const auto = await prisma.auto.findUnique({ where: { rendszam: auto_rendszam } });
    if (!auto) return res.status(404).json({ hiba: 'Az autó nem létezik!' });

    const ujUt = await prisma.ut.create({
      data: {
        sofor_nev: req.user.username, auto_rendszam, indulas, erkezes,
        tavolsag: parseFloat(tavolsag), koltseg: parseFloat(koltseg || 0),
        fogyasztas: parseFloat(fogyasztas), honap_ev, status: 'BEERKEZO'
      }
    });
    res.status(201).json(ujUt);
  } catch (error) { res.status(400).json({ hiba: 'Hiba.' }); }
});

app.get('/api/admin/utak', authenticateToken, requireAdmin, async (req, res) => {
  try { res.json(await prisma.ut.findMany({ include: { auto: true } })); } catch (error) { res.status(500).json({ hiba: 'Hiba.' }); }
});

app.patch('/api/admin/utak/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const ut = await prisma.ut.update({ where: { id }, data: { status } });
    res.json({ üzenet: `Frissítve: ${status}`, ut });
  } catch (error) { res.status(400).json({ hiba: 'Hiba.' }); }
});

app.post('/api/admin/autok', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { rendszam, tipus, statusz, itp_lejart, utado_fizetve, szerviz_adatok } = req.body;
    res.status(201).json(await prisma.auto.create({ data: { rendszam, tipus, statusz: statusz || 'ELERHETO', itp_lejart, utado_fizetve, szerviz_adatok } }));
  } catch (error) { res.status(400).json({ hiba: 'Hiba.' }); }
});

app.get('/api/admin/jelentes/:honap', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const honap = req.params.honap;
    const utak = await prisma.ut.findMany({ where: { honap_ev: { startsWith: honap }, status: 'JOVAHAGYOTT' } });
    let csv = 'ID;Datum;Sofor;Rendszam;Indulas;Erkezes;Tavolsag(km);Koltseg(EUR);Fogyasztas(L)\n';
    utak.forEach(u => {
      csv += `${u.id};${u.honap_ev};${u.sofor_nev};${u.auto_rendszam};${u.indulas};${u.erkezes};${u.tavolsag};${u.koltseg};${u.fogyasztas}\n`;
    });
    res.header('Content-Type', 'text/csv');
    res.attachment(`DriveCheck_Jelentes_${honap}.csv`);
    res.send(csv);
  } catch (error) { res.status(500).json({ hiba: 'Hiba.' }); }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚗 DriveCheck V2 API fut a ${PORT} porton.`));
