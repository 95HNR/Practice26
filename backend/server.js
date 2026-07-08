require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const http = require('http');
const { Server } = require('socket.io');
const { body, validationResult } = require('express-validator');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const JWT_SECRET = process.env.JWT_SECRET || 'titkos_drivecheck_kulcs_2026';

async function logAudit(felhasznalo, muvelet, reszletek) {
  try {
    await prisma.auditLog.create({ data: { felhasznalo, muvelet, reszletek } });
    console.log(`📝 [Audit] ${felhasznalo}: ${muvelet} - ${reszletek}`);
  } catch (e) { console.error('Hiba az Audit logolásakor:', e); }
}

// JAVÍTOTT: Token ellenőrzése Headerből ÉS URL-ből is (letöltésekhez)
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // Ha nincs a headerben, megnézzük az URL paraméterek között (a CSV letöltés miatt kell)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) return res.status(401).json({ hiba: 'Hiányzó token!' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ hiba: 'Érvénytelen token!' });
    req.user = user; next();
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

app.get('/api/admin/riasztasok', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const autok = await prisma.auto.findMany();
    const ma = new Date(); ma.setHours(0, 0, 0, 0);
    const hetesHatar = new Date(ma); hetesHatar.setDate(hetesHatar.getDate() + 7);
    let riasztasok = [];

    for (let auto of autok) {
      let lejaratok = [];
      if (auto.itp_lejarat && auto.itp_lejarat < ma) lejaratok.push('ITP');
      if (auto.biztositas_lejarat && auto.biztositas_lejarat < ma) lejaratok.push('RCA');
      if (auto.utado_lejarat && auto.utado_lejarat < ma) lejaratok.push('Rovinieta');

      if (lejaratok.length > 0) {
        if (auto.statusz === 'ELERHETO') await prisma.auto.update({ where: { rendszam: auto.rendszam }, data: { statusz: 'FOGLALT' } });
        riasztasok.push(`🚨 KRITIKUS: A(z) ${auto.rendszam} (${auto.tipus}) letiltva! Lejárt: ${lejaratok.join(', ')}.`);
      }

      let hamarosan = [];
      if (auto.itp_lejarat && auto.itp_lejarat >= ma && auto.itp_lejarat <= hetesHatar) hamarosan.push('ITP');
      if (auto.biztositas_lejarat && auto.biztositas_lejarat >= ma && auto.biztositas_lejarat <= hetesHatar) hamarosan.push('RCA');
      if (auto.utado_lejarat && auto.utado_lejarat >= ma && auto.utado_lejarat <= hetesHatar) hamarosan.push('Rovinieta');

      if (hamarosan.length > 0) {
        riasztasok.push(`⚠️ KÖZELEG: A(z) ${auto.rendszam} dokumentumai 7 napon belül lejárnak: ${hamarosan.join(', ')}.`);
      }
    }
    res.json(riasztasok);
  } catch (error) { res.status(500).json({ hiba: 'Hiba a riasztások feldolgozásakor.' }); }
});

app.get('/api/autok', authenticateToken, async (req, res) => {
  try {
    const { form_date } = req.query;
    const today = new Date().toISOString().split('T')[0];
    const todayApprovedUtak = await prisma.ut.findMany({ where: { honap_ev: today, status: 'JOVAHAGYOTT' }, select: { auto_rendszam: true } });
    const todayBusyPlates = todayApprovedUtak.map(u => u.auto_rendszam);
    let formBusyPlates = [];
    if (form_date) {
      const formApprovedUtak = await prisma.ut.findMany({ where: { honap_ev: form_date, status: 'JOVAHAGYOTT' }, select: { auto_rendszam: true } });
      formBusyPlates = formApprovedUtak.map(u => u.auto_rendszam);
    }
    const autok = await prisma.auto.findMany();
    const dinamikusFlotta = autok.map(a => ({
      rendszam: a.rendszam, tipus: a.tipus, statusz: todayBusyPlates.includes(a.rendszam) ? 'FOGLALT' : a.statusz,
      elerhetoAFormDatumon: !formBusyPlates.includes(a.rendszam) && a.statusz === 'ELERHETO',
      itp: a.itp_lejarat, rca: a.biztositas_lejarat, rovinieta: a.utado_lejarat
    }));
    res.json(dinamikusFlotta);
  } catch (error) { res.status(500).json({ hiba: 'Hiba.' }); }
});

app.get('/api/admin/aktiv-flotta', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    res.json(await prisma.ut.findMany({ where: { honap_ev: today, status: 'JOVAHAGYOTT' }, include: { auto: true } }));
  } catch (error) { res.status(500).json({ hiba: 'Hiba.' }); }
});

// ÚJ: Beérkező fuvarok végpont
app.get('/api/admin/beerkezo-fuvarok', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const beerkezok = await prisma.ut.findMany({
      where: { status: 'BEERKEZO' },
      include: { auto: true },
      orderBy: { id: 'desc' }
    });
    res.json(beerkezok);
  } catch (error) { res.status(500).json({ hiba: 'Hiba a beérkezők lekérdezésekor.' }); }
});

app.delete('/api/admin/autok/:rendszam', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await prisma.auto.delete({ where: { rendszam: req.params.rendszam } });
    await logAudit(req.user.username, 'Törlés', `Autó törölve: ${req.params.rendszam}`);
    io.emit('adat_frissites');
    res.json({ üzenet: 'Törölve!' });
  } catch (error) { res.status(400).json({ hiba: 'Nem törölhető!' }); }
});

app.patch('/api/admin/autok/:rendszam', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { tipus, statusz, itp_lejarat, biztositas_lejarat, utado_lejarat } = req.body;
    const frissitett = await prisma.auto.update({
      where: { rendszam: req.params.rendszam },
      data: { tipus, statusz, itp_lejarat: itp_lejarat ? new Date(itp_lejarat) : null, biztositas_lejarat: biztositas_lejarat ? new Date(biztositas_lejarat) : null, utado_lejarat: utado_lejarat ? new Date(utado_lejarat) : null }
    });
    await logAudit(req.user.username, 'Módosítás', `Autó módosítva: ${req.params.rendszam}`);
    io.emit('adat_frissites');
    res.json(frissitett);
  } catch (error) { res.status(400).json({ hiba: 'Hiba.' }); }
});

app.post('/api/admin/autok', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { rendszam, tipus, statusz, itp_lejarat, biztositas_lejarat, utado_lejarat } = req.body;
    const ujAuto = await prisma.auto.create({
      data: { rendszam, tipus, statusz: statusz || 'ELERHETO', itp_lejarat: itp_lejarat ? new Date(itp_lejarat) : null, biztositas_lejarat: biztositas_lejarat ? new Date(biztositas_lejarat) : null, utado_lejarat: utado_lejarat ? new Date(utado_lejarat) : null }
    });
    await logAudit(req.user.username, 'Létrehozás', `Új autó: ${rendszam}`);
    io.emit('adat_frissites');
    res.status(201).json(ujAuto);
  } catch (error) { res.status(400).json({ hiba: 'Létezik!' }); }
});

app.get('/api/admin/szerviz/:rendszam', authenticateToken, requireAdmin, async (req, res) => {
  try { res.json(await prisma.szerviz.findMany({ where: { auto_rendszam: req.params.rendszam }, orderBy: { datum: 'desc' } })); }
  catch (error) { res.status(500).json({ hiba: 'Hiba.' }); }
});

app.post('/api/admin/szerviz', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { auto_rendszam, datum, leiras, kilometer } = req.body;
    const uj = await prisma.szerviz.create({ data: { auto_rendszam, datum: new Date(datum), leiras, kilometer: parseInt(kilometer) } });
    await logAudit(req.user.username, 'Szerviz', `Új szerviz bejegyzés: ${auto_rendszam}`);
    io.emit('adat_frissites');
    res.status(201).json(uj);
  } catch (error) { res.status(400).json({ hiba: 'Hiba.' }); }
});

app.get('/api/utak', authenticateToken, async (req, res) => {
  try {
    const { honap } = req.query; let feltetel = { sofor_nev: req.user.username };
    if (honap && honap.trim() !== '') feltetel.honap_ev = { contains: honap };
    res.json(await prisma.ut.findMany({ where: feltetel, include: { auto: true }, orderBy: { id: 'desc' } }));
  } catch (error) { res.status(500).json({ hiba: 'Hiba.' }); }
});

app.get('/api/admin/utak', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { honap } = req.query; let feltetel = {};
    if (honap && honap.trim() !== '') feltetel.honap_ev = { contains: honap };
    res.json(await prisma.ut.findMany({ where: feltetel, include: { auto: true }, orderBy: { id: 'desc' } }));
  } catch (error) { res.status(500).json({ hiba: 'Hiba.' }); }
});

// FRISSÍTETT: Fuvar létrehozása (Távolság validáció kiszedve)
app.post('/api/utak', authenticateToken, async (req, res) => {
  try {
    const { auto_rendszam, indulas, erkezes, tavolsag, fogyasztas, honap_ev } = req.body;

    const auto = await prisma.auto.findUnique({ where: { rendszam: auto_rendszam } });
    if (!auto || auto.statusz !== 'ELERHETO') return res.status(400).json({ hiba: 'Az autó nem elérhető!' });

    const ujUt = await prisma.ut.create({
      data: {
        sofor_nev: req.user.username,
        auto_rendszam,
        indulas,
        erkezes,
        tavolsag: parseFloat(tavolsag),
        koltseg: 0,
        fogyasztas: parseFloat(fogyasztas),
        honap_ev,
        status: 'BEERKEZO'
      }
    });

    await logAudit(req.user.username, 'Igénylés', `Új fuvarigény: ${auto_rendszam}`);
    io.emit('adat_frissites');
    res.status(201).json(ujUt);
  } catch (error) { res.status(400).json({ hiba: 'Hiba a mentés során.' }); }
});

app.patch('/api/admin/utak/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const ut = await prisma.ut.update({ where: { id: parseInt(req.params.id) }, data: { status: req.body.status } });
    await logAudit(req.user.username, 'Bírálat', `Fuvar #${req.params.id} állapota: ${req.body.status}`);
    io.emit('adat_frissites');
    res.json({ üzenet: `Frissítve`, ut });
  } catch (error) { res.status(400).json({ hiba: 'Hiba.' }); }
});

app.patch('/api/utak/:id/lezar', authenticateToken, [
  body('koltseg').isFloat({ min: 0 }).withMessage('A költség nem lehet negatív!'),
  body('fogyasztas').isFloat({ min: 0 }).withMessage('A fogyasztás nem lehet negatív!')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ hiba: errors.array()[0].msg });
  try {
    const { koltseg, fogyasztas } = req.body;
    const ut = await prisma.ut.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!ut || ut.sofor_nev !== req.user.username || ut.status !== 'JOVAHAGYOTT') return res.status(403).json({ hiba: 'Nem engedélyezett!' });

    const frissitett = await prisma.ut.update({ where: { id: parseInt(req.params.id) }, data: { koltseg: parseFloat(koltseg), fogyasztas: parseFloat(fogyasztas), status: 'TELJESITVE' } });
    await prisma.auto.update({ where: { rendszam: ut.auto_rendszam }, data: { statusz: 'ELERHETO' } });
    await logAudit(req.user.username, 'Lezárás', `Fuvar #${req.params.id} teljesítve.`);
    io.emit('adat_frissites');
    res.json(frissitett);
  } catch (error) { res.status(400).json({ hiba: 'Hiba.' }); }
});

// FRISSÍTETT: Fejlett jelentés letöltése (összesítéssel)
app.get('/api/admin/jelentes/:periodus', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const periodus = req.params.periodus;
    let whereClause = { status: { in: ['JOVAHAGYOTT', 'TELJESITVE'] } };

    if (periodus.includes('_')) {
      const [start, end] = periodus.split('_');
      whereClause.honap_ev = { gte: start, lte: end };
    } else {
      whereClause.honap_ev = { startsWith: periodus };
    }

    const utak = await prisma.ut.findMany({ where: whereClause });

    let totalKm = 0, totalKoltseg = 0, totalFogyasztas = 0;
    let csv = 'ID;Datum;Sofor;Rendszam;Indulas;Erkezes;Tavolsag(km);Koltseg(RON);Fogyasztas(L)\n';

    utak.forEach(u => {
      totalKm += u.tavolsag || 0;
      totalKoltseg += u.koltseg || 0;
      totalFogyasztas += u.fogyasztas || 0;
      csv += `${u.id};${u.honap_ev};${u.sofor_nev};${u.auto_rendszam};${u.indulas};${u.erkezes};${u.tavolsag};${u.koltseg};${u.fogyasztas}\n`;
    });

    csv += `\n;;;;;OSSZESEN:;${totalKm.toFixed(1)};${totalKoltseg.toFixed(2)};${totalFogyasztas.toFixed(1)}\n`;

    res.header('Content-Type', 'text/csv');
    res.attachment(`Jelentes_${periodus}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ hiba: 'Hiba a jelentés generálásakor.' });
  }
});

app.get('/api/admin/audit', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({ orderBy: { datum: 'desc' }, take: 20 });
    res.json(logs);
  } catch (error) { res.status(500).json({ hiba: 'Hiba.' }); }
});

const PORT = 3000;
server.listen(PORT, () => console.log(`🚗 DriveCheck API fut a ${PORT} porton.`));