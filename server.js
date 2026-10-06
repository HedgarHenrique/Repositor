const express = require('express');
const app = express();
const path = require('path');
const pedidoRoutes = require('./src/routes/pedidoRoutes');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

// Conecta as rotas externas
app.use('/', pedidoRoutes);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Sistema rodando com sucesso em http://localhost:${PORT}`);
});
