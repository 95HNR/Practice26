const prisma = require('../db');
const { logAudit } = require('../utils/audit');
const ExcelJS = require('exceljs'); // Add a fájl elejéhez
const bcrypt = require('bcrypt'); // (vagy bcryptjs, attól függően mit telepítettél)

exports.getRiasztasok = async (req, res) => {
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
};

exports.getAktivFlotta = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        res.json(await prisma.ut.findMany({ where: { honap_ev: today, status: 'JOVAHAGYOTT' }, include: { auto: true } }));
    } catch (error) { res.status(500).json({ hiba: 'Hiba.' }); }
};

exports.getBeerkezoFuvarok = async (req, res) => {
    try {
        const beerkezok = await prisma.ut.findMany({
            where: { status: 'BEERKEZO' },
            include: { auto: true },
            orderBy: { id: 'desc' }
        });
        res.json(beerkezok);
    } catch (error) { res.status(500).json({ hiba: 'Hiba a beérkezők lekérdezésekor.' }); }
};

exports.deleteAuto = async (req, res) => {
    try {
        await prisma.auto.delete({ where: { rendszam: req.params.rendszam } });
        await logAudit(req.user.username, 'Törlés', `Autó törölve: ${req.params.rendszam}`);
        req.app.get('io').emit('adat_frissites');
        res.json({ üzenet: 'Törölve!' });
    } catch (error) { res.status(400).json({ hiba: 'Nem törölhető!' }); }
};

exports.patchAuto = async (req, res) => {
    try {
        const { tipus, statusz, itp_lejarat, biztositas_lejarat, utado_lejarat } = req.body;
        const frissitett = await prisma.auto.update({
            where: { rendszam: req.params.rendszam },
            data: { tipus, statusz, itp_lejarat: itp_lejarat ? new Date(itp_lejarat) : null, biztositas_lejarat: biztositas_lejarat ? new Date(biztositas_lejarat) : null, utado_lejarat: utado_lejarat ? new Date(utado_lejarat) : null }
        });
        await logAudit(req.user.username, 'Módosítás', `Autó módosítva: ${req.params.rendszam}`);
        req.app.get('io').emit('adat_frissites');
        res.json(frissitett);
    } catch (error) { res.status(400).json({ hiba: 'Hiba.' }); }
};

exports.addAuto = async (req, res) => {
    try {
        const { rendszam, tipus, statusz, itp_lejarat, biztositas_lejarat, utado_lejarat, aktualis_km } = req.body;
        const ujAuto = await prisma.auto.create({
            data: {
                rendszam, tipus, statusz: statusz || 'ELERHETO',
                aktualis_km: parseInt(aktualis_km) || 0,
                itp_lejarat: itp_lejarat ? new Date(itp_lejarat) : null,
                biztositas_lejarat: biztositas_lejarat ? new Date(biztositas_lejarat) : null,
                utado_lejarat: utado_lejarat ? new Date(utado_lejarat) : null
            }
        });
        await logAudit(req.user.username, 'Létrehozás', `Új autó: ${rendszam}`);
        req.app.get('io').emit('adat_frissites');
        res.status(201).json(ujAuto);
    } catch (error) {
        console.error("--- VALÓDI HIBA ---", error);
        res.status(400).json({ hiba: error.message });
    }
};

exports.getSzerviz = async (req, res) => {
    try { res.json(await prisma.szerviz.findMany({ where: { auto_rendszam: req.params.rendszam }, orderBy: { datum: 'desc' } })); }
    catch (error) { res.status(500).json({ hiba: 'Hiba.' }); }
};

exports.addSzerviz = async (req, res) => {
    try {
        const { auto_rendszam, datum, leiras, kilometer } = req.body;
        const uj = await prisma.szerviz.create({ data: { auto_rendszam, datum: new Date(datum), leiras, kilometer: parseInt(kilometer) } });
        await logAudit(req.user.username, 'Szerviz', `Új szerviz bejegyzés: ${auto_rendszam}`);
        req.app.get('io').emit('adat_frissites');
        res.status(201).json(uj);
    } catch (error) { res.status(400).json({ hiba: 'Hiba.' }); }
};

exports.getAdminUtak = async (req, res) => {
    try {
        const { honap } = req.query; let feltetel = {};
        if (honap && honap.trim() !== '') feltetel.honap_ev = { contains: honap };
        res.json(await prisma.ut.findMany({ where: feltetel, include: { auto: true }, orderBy: { id: 'desc' } }));
    } catch (error) { res.status(500).json({ hiba: 'Hiba.' }); }
};

exports.patchUt = async (req, res) => {
    try {
        const ut = await prisma.ut.update({ where: { id: parseInt(req.params.id) }, data: { status: req.body.status } });
        await logAudit(req.user.username, 'Bírálat', `Fuvar #${req.params.id} állapota: ${req.body.status}`);
        req.app.get('io').emit('adat_frissites');
        res.json({ üzenet: `Frissítve`, ut });
    } catch (error) { res.status(400).json({ hiba: 'Hiba.' }); }
};

exports.getJelentes = async (req, res) => {
    try {
        const periodus = req.params.periodus;
        const format = req.query.format || 'csv';
        let whereClause = { status: { in: ['JOVAHAGYOTT', 'TELJESITVE'] } };

        if (periodus.includes('_')) {
            const [start, end] = periodus.split('_');
            whereClause.honap_ev = { gte: start, lte: end };
        } else {
            whereClause.honap_ev = { startsWith: periodus };
        }

        const utak = await prisma.ut.findMany({ where: whereClause, orderBy: { id: 'asc' } });

        let totalKm = 0, totalKoltseg = 0, totalFogyasztas = 0;
        utak.forEach(u => {
            totalKm += u.tavolsag || 0;
            totalKoltseg += u.koltseg || 0;
            totalFogyasztas += u.fogyasztas || 0;
        });

        // --- EXCEL GENERÁLÁS ---
        if (format === 'xlsx') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Jelentés');

            worksheet.columns = [
                { header: 'ID', key: 'id', width: 10 },
                { header: 'Dátum', key: 'honap_ev', width: 15 },
                { header: 'Sofőr', key: 'sofor_nev', width: 25 },
                { header: 'Rendszám', key: 'auto_rendszam', width: 15 },
                { header: 'Indulás', key: 'indulas', width: 30 },
                { header: 'Érkezés', key: 'erkezes', width: 30 },
                { header: 'Távolság (km)', key: 'tavolsag', width: 15 },
                { header: 'Költség (RON)', key: 'koltseg', width: 15 },
                { header: 'Fogyasztás (L)', key: 'fogyasztas', width: 15 }
            ];

            utak.forEach(u => worksheet.addRow(u));

            // Összesen sor hozzáadása
            const totalRow = worksheet.addRow({
                erkezes: 'ÖSSZESEN:',
                tavolsag: totalKm,
                koltseg: totalKoltseg,
                fogyasztas: totalFogyasztas
            });
            totalRow.font = { bold: true, color: { argb: 'FF000000' } };

            worksheet.getRow(1).font = { bold: true }; // Fejléc vastagon

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="Jelentes_${periodus}.xlsx"`);
            await workbook.xlsx.write(res);
            return res.end();
        }

        // --- EREDETI CSV GENERÁLÁS ---
        let csv = 'ID;Datum;Sofor;Rendszam;Indulas;Erkezes;Tavolsag(km);Koltseg(RON);Fogyasztas(L)\n';
        utak.forEach(u => {
            csv += `${u.id};${u.honap_ev};${u.sofor_nev};${u.auto_rendszam};${u.indulas};${u.erkezes};${u.tavolsag};${u.koltseg};${u.fogyasztas}\n`;
        });
        csv += `\n;;;;;OSSZESEN:;${totalKm.toFixed(1)};${totalKoltseg.toFixed(2)};${totalFogyasztas.toFixed(1)}\n`;

        res.header('Content-Type', 'text/csv');
        res.attachment(`Jelentes_${periodus}.csv`);
        res.send(csv);
    } catch (error) { res.status(500).json({ hiba: 'Hiba a jelentés generálásakor.' }); }
};

exports.getAudit = async (req, res) => {
    try { res.json(await prisma.auditLog.findMany({ orderBy: { datum: 'desc' }, take: 20 })); }
    catch (error) { res.status(500).json({ hiba: 'Hiba.' }); }
};

exports.getFlottaStatisztika = async (req, res) => {
    try {
        const utak = await prisma.ut.findMany({ where: { status: 'TELJESITVE' }, select: { auto_rendszam: true, tavolsag: true } });
        const stats = {};
        utak.forEach(u => {
            if (!stats[u.auto_rendszam]) stats[u.auto_rendszam] = { db: 0, km: 0 };
            stats[u.auto_rendszam].db += 1; stats[u.auto_rendszam].km += u.tavolsag;
        });
        res.json(stats);
    } catch (error) { res.status(500).json({ hiba: 'Hiba a statisztika lekérésekor.' }); }
};

exports.getSzervizFigyelmeztetesek = async (req, res) => {
    try {
        const autok = await prisma.auto.findMany({ include: { szerviz: { orderBy: { kilometer: 'desc' }, take: 1 } } });
        const riasztasok = autok.map(a => {
            const utolsoSzerviz = a.szerviz[0] ? a.szerviz[0].kilometer : 0;
            return { rendszam: a.rendszam, hatralevo: 15000 - (a.aktualis_km - utolsoSzerviz) };
        }).filter(r => r.hatralevo < 2000);
        res.json(riasztasok);
    } catch (e) { res.status(500).json({ hiba: 'Hiba.' }); }
};

exports.getSoforStatisztika = async (req, res) => {
    try {
        const utak = await prisma.ut.findMany({ where: { status: 'TELJESITVE' } });
        const stats = {};
        utak.forEach(u => {
            if (!stats[u.sofor_nev]) stats[u.sofor_nev] = { km: 0, fogy: 0 };
            stats[u.sofor_nev].km += u.tavolsag; stats[u.sofor_nev].fogy += u.fogyasztas;
        });
        const eredmeny = Object.entries(stats).map(([nev, data]) => ({
            nev, atlagFogy: data.km > 0 ? (data.fogy / (data.km / 100)).toFixed(2) : 0
        })).sort((a, b) => a.atlagFogy - b.atlagFogy);
        res.json(eredmeny);
    } catch (e) { res.status(500).json({ hiba: 'Hiba.' }); }
};

// --- ÚJ: FELHASZNÁLÓK KEZELÉSE ---
exports.getUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, username: true, role: true }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ hiba: 'Hiba a felhasználók lekérésekor.' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        // Ne engedjük, hogy az admin véletlenül saját magát törölje!
        if (req.user.id === userId) return res.status(400).json({ hiba: 'Saját magadat nem törölheted!' });
        
        await prisma.user.delete({ where: { id: userId } });
        await logAudit(req.user.username, 'Törlés', `Fiók törölve: ID ${userId}`);
        res.json({ üzenet: 'Felhasználó törölve!' });
    } catch (error) { res.status(400).json({ hiba: 'Nem törölhető a felhasználó!' }); }
};

exports.patchUser = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { role, password } = req.body;
        let data = {};
        
        if (role) data.role = role;
        if (password) data.password = await bcrypt.hash(password, 10);
        
        await prisma.user.update({ where: { id: userId }, data });
        await logAudit(req.user.username, 'Módosítás', `Fiók módosítva: ID ${userId}`);
        res.json({ üzenet: 'Sikeres módosítás!' });
    } catch (error) { res.status(400).json({ hiba: 'Hiba a módosításkor.' }); }
};