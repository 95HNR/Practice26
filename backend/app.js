const express = require('express');
const app = express();
const PORT = 3000;

// Egy egyszerű végpont (endpoint), ami adatot ad vissza a frontendnek
app.get('/api/adat', (req, res) => {
    res.json({ 
        uzenet: "Sziaaaa! Ezt az adatot a Dockerben futó Node.js backend küldte!",
        idobelyeg: new Date(),
        uzenet2: "Ez egy teszt uzenet",
        idobelyeg2: new Date()
    });
});

app.listen(PORT, () => {
    console.log(`A backend szerver folyamatosan fut a ${PORT}-es porton...`);
});
