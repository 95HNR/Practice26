// Modulok beimportálása
import * as Utils from './ui/utils.js';
import * as MapCtrl from './ui/map.js';
import * as Modals from './ui/modals.js';
import * as Lists from './ui/lists.js';
import * as Actions from './ui/actions.js';

// --- GLOBÁLIS VÁLTOZÓK ---
window.startCoords = { lat: 0, lon: 0 };
window.endCoords = { lat: 0, lon: 0 };
window.debounceTimer = null;
window.currentFlotta = [];
window.costChartInstance = null;

// --- GLOBÁLIS FÜGGVÉNYEK KIHELYEZÉSE A HTML SZÁMÁRA ---
// Utils
window.showNotification = Utils.showNotification;
window.initScrollReveal = Utils.initScrollReveal;
window.toggleTheme = Utils.toggleTheme;
window.formatDateStr = Utils.formatDateStr;

// Térkép
window.resetDistanceField = MapCtrl.resetDistanceField;
window.searchOSM = MapCtrl.searchOSM;
window.selectLocation = MapCtrl.selectLocation;

// Modalok
window.openModalWithAnim = Modals.openModalWithAnim;
window.openEditModal = Modals.openEditModal;
window.closeEditModal = Modals.closeEditModal;
window.openSzervizModal = Modals.openSzervizModal;
window.closeSzervizModal = Modals.closeSzervizModal;
window.openLezarModal = Modals.openLezarModal;
window.closeLezarModal = Modals.closeLezarModal;
window.toggleDateInputs = Modals.toggleDateInputs;

// Listák
window.renderDashboard = Lists.renderDashboard;
window.loadAktivFlotta = Lists.loadAktivFlotta;
window.loadAutok = Lists.loadAutok;
window.loadFlottaStatisztika = Lists.loadFlottaStatisztika;
window.loadUtak = Lists.loadUtak;
window.loadBeerkezoList = Lists.loadBeerkezoList;
window.loadSzervizRiasztasok = Lists.loadSzervizRiasztasok;
window.loadSoforRangsor = Lists.loadSoforRangsor;
window.loadAuditLog = Lists.loadAuditLog;
window.loadRiasztasok = Lists.loadRiasztasok;
window.renderUI = Lists.renderUI;

// Akciók
window.addAuto = Actions.addAuto;
window.downloadAdvancedJelentes = Actions.downloadAdvancedJelentes;


// --- ESEMÉNYKEZELŐK ÉS INICIALIZÁLÁS ---

// Socket.io bekötése
const socket = (typeof io !== 'undefined') ? io('http://localhost:3000') : null;
if (socket) {
    socket.on('adat_frissites', () => {
        console.log("🔄 Valós idejű frissítés érkezett a szervertől!");
        if (window.AppState && window.AppState.user && window.AppState.user.role === 'ADMIN') {
            window.loadRiasztasok();
            window.loadBeerkezoList();
            window.showNotification("Új fuvarigény vagy rendszeresemény történt!");
            window.loadAuditLog();
            window.loadAktivFlotta();
            window.renderDashboard();
            window.loadFlottaStatisztika();
        }
        if (window.AppState && window.AppState.token) {
            window.loadAutok();
            window.loadUtak();
        }
    });
}

// Oldal betöltésének figyelése (Téma beállítása)
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('drivecheck_theme') === 'light') { document.body.classList.add('light-theme'); }
});

// Külső kattintás figyelő a térkép dropdownhoz
document.addEventListener('click', (e) => {
    if (!e.target.closest('.relative')) {
        document.getElementById('indulasList')?.classList.add('hidden');
        document.getElementById('erkezesList')?.classList.add('hidden');
    }
});