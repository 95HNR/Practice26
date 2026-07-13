const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const { authenticateToken, requireAdmin } = require('../middlewares/auth');

const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const userController = require('../controllers/userController');

// AUTH
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// ADMIN
router.get('/admin/riasztasok', authenticateToken, requireAdmin, adminController.getRiasztasok);
router.get('/admin/aktiv-flotta', authenticateToken, requireAdmin, adminController.getAktivFlotta);
router.get('/admin/beerkezo-fuvarok', authenticateToken, requireAdmin, adminController.getBeerkezoFuvarok);
router.post('/admin/autok', authenticateToken, requireAdmin, adminController.addAuto);
router.patch('/admin/autok/:rendszam', authenticateToken, requireAdmin, adminController.patchAuto);
router.delete('/admin/autok/:rendszam', authenticateToken, requireAdmin, adminController.deleteAuto);
router.get('/admin/szerviz/:rendszam', authenticateToken, requireAdmin, adminController.getSzerviz);
router.post('/admin/szerviz', authenticateToken, requireAdmin, adminController.addSzerviz);
router.get('/admin/utak', authenticateToken, requireAdmin, adminController.getAdminUtak);
router.patch('/admin/utak/:id', authenticateToken, requireAdmin, adminController.patchUt);
router.get('/admin/jelentes/:periodus', authenticateToken, requireAdmin, adminController.getJelentes);
router.get('/admin/audit', authenticateToken, requireAdmin, adminController.getAudit);
router.get('/admin/statisztika/flotta', authenticateToken, requireAdmin, adminController.getFlottaStatisztika);
router.get('/admin/szerviz-figyelmeztetesek', authenticateToken, requireAdmin, adminController.getSzervizFigyelmeztetesek);
router.get('/admin/statisztika/soforok', authenticateToken, requireAdmin, adminController.getSoforStatisztika);

// USER
router.get('/autok', authenticateToken, userController.getAutok);
router.get('/utak', authenticateToken, userController.getUtak);
router.post('/utak', authenticateToken, userController.addUt);
router.patch('/utak/:id/lezar', authenticateToken, [
    body('koltseg').isFloat({ min: 0 }).withMessage('A költség nem lehet negatív!'),
    body('fogyasztas').isFloat({ min: 0 }).withMessage('A fogyasztás nem lehet negatív!')
], userController.lezarUt);

// --- JAVÍTOTT: Új felhasználó kezelő végpontok a megfelelő middleware-ekkel ---
router.get('/admin/users', authenticateToken, requireAdmin, adminController.getUsers);
router.delete('/admin/users/:id', authenticateToken, requireAdmin, adminController.deleteUser);
router.patch('/admin/users/:id', authenticateToken, requireAdmin, adminController.patchUser);

module.exports = router;