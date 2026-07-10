const prisma = require('../db');
const { logAudit } = require('../utils/audit');
const { validationResult } = require('express-validator');

exports.getAutok = async (req, res) => {
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
};

exports.getUtak = async (req, res) => {
  try {
    const { honap } = req.query; let feltetel = { sofor_nev: req.user.username };
    if (honap && honap.trim() !== '') feltetel.honap_ev = { contains: honap };
    res.json(await prisma.ut.findMany({ where: feltetel, include: { auto: true }, orderBy: { id: 'desc' } }));
  } catch (error) { res.status(500).json({ hiba: 'Hiba.' }); }
};

exports.addUt = async (req, res) => {
  try {
    const { auto_rendszam, indulas, erkezes, tavolsag, fogyasztas, honap_ev } = req.body;
    const auto = await prisma.auto.findUnique({ where: { rendszam: auto_rendszam } });
    if (!auto || auto.statusz !== 'ELERHETO') return res.status(400).json({ hiba: 'Az autó nem elérhető!' });

    const ujUt = await prisma.ut.create({
      data: {
        sofor_nev: req.user.username, auto_rendszam, indulas, erkezes,
        tavolsag: parseFloat(tavolsag), koltseg: 0, fogyasztas: parseFloat(fogyasztas),
        honap_ev, status: 'BEERKEZO'
      }
    });
    await logAudit(req.user.username, 'Igénylés', `Új fuvarigény: ${auto_rendszam}`);
    req.app.get('io').emit('adat_frissites');
    res.status(201).json(ujUt);
  } catch (error) { res.status(400).json({ hiba: 'Hiba a mentés során.' }); }
};

exports.lezarUt = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ hiba: errors.array()[0].msg });
  try {
    const { koltseg, fogyasztas } = req.body;
    const ut = await prisma.ut.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!ut || ut.sofor_nev !== req.user.username || ut.status !== 'JOVAHAGYOTT') return res.status(403).json({ hiba: 'Nem engedélyezett!' });

    const frissitett = await prisma.ut.update({ where: { id: parseInt(req.params.id) }, data: { koltseg: parseFloat(koltseg), fogyasztas: parseFloat(fogyasztas), status: 'TELJESITVE' } });
    await prisma.auto.update({ where: { rendszam: ut.auto_rendszam }, data: { statusz: 'ELERHETO' } });
    await logAudit(req.user.username, 'Lezárás', `Fuvar #${req.params.id} teljesítve.`);
    req.app.get('io').emit('adat_frissites');
    res.json(frissitett);
  } catch (error) { res.status(400).json({ hiba: 'Hiba.' }); }
};