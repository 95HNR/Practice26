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
            rendszam: a.rendszam, 
            tipus: a.tipus, 
            statusz: todayBusyPlates.includes(a.rendszam) ? 'FOGLALT' : a.statusz,
            elerhetoAFormDatumon: !formBusyPlates.includes(a.rendszam) && a.statusz === 'ELERHETO',
            aktualis_km: a.aktualis_km, // EZ A SOR HIÁNYZOTT! Most már elküldi a kilométert is!
            itp: a.itp_lejarat, 
            rca: a.biztositas_lejarat, 
            rovinieta: a.utado_lejarat
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
    try {
        const utId = parseInt(req.params.id);
        const { koltseg, fogyasztas, aktualis_km } = req.body;

        // 1. Lekérjük a fuvart, hogy tudjuk, melyik autó volt érintett
        const ut = await prisma.ut.findUnique({ where: { id: utId } });
        if (!ut) return res.status(404).json({ hiba: 'Fuvar nem található!' });

        // 2. Frissítjük a fuvar állapotát és költségeit
        await prisma.ut.update({
            where: { id: utId },
            data: {
                status: 'TELJESITVE',
                koltseg: parseFloat(koltseg),
                fogyasztas: parseFloat(fogyasztas)
            }
        });

        // 3. Frissítjük az autó kilométeróráját és elérhetővé tesszük
        if (aktualis_km) {
            await prisma.auto.update({
                where: { rendszam: ut.auto_rendszam },
                data: {
                    aktualis_km: parseInt(aktualis_km),
                    statusz: 'ELERHETO' // Fuvar vége, az autó szabad
                }
            });
        }

        // Audit naplózás
        await logAudit(req.user.username, 'Lezárás', `Fuvar #${utId} lezárva. Új km óra: ${aktualis_km}`);

        // Frissítés küldése minden kliensnek
        if (req.app.get('io')) {
            req.app.get('io').emit('adat_frissites');
        }

        res.json({ üzenet: 'Fuvar sikeresen lezárva, kilométeróra frissítve!' });
    } catch (error) {
        console.error("Hiba a fuvar lezárásakor:", error);
        res.status(500).json({ hiba: 'Hiba a lezárás során.' });
    }
};