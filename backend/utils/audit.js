const prisma = require('../db');

async function logAudit(felhasznalo, muvelet, reszletek) {
  try {
    await prisma.auditLog.create({ data: { felhasznalo, muvelet, reszletek } });
    console.log(`📝 [Audit] ${felhasznalo}: ${muvelet} - ${reszletek}`);
  } catch (e) { console.error('Hiba az Audit logolásakor:', e); }
}

module.exports = { logAudit };