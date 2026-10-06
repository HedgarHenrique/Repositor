const express = require('express');
const router = express.Router();
const db = require('../database.js');

// CONFIGURAÇÃO DA SENHA DO GERENTE (Mude os 4 dígitos aqui se quiser)
const PIN_GERENTE = "1234";

// Middleware que valida a senha enviada pelas ações do painel
function verificarAutenticacao(req, res, next) {
    const pin = req.headers['x-gerente-pin'] || req.query.pin;
    if (pin === PIN_GERENTE) {
        return next();
    }
    res.status(401).send(`
        <script>
            alert('Acesso negado. PIN incorreto!');
            window.location.href = '/';
        </script>
    `);
}

// 1. Tela do funcionário (Página Inicial)
router.get('/', (req, res) => {
    res.render('pedido');
});

// 2. Recebe o pedido do funcionário e salva no banco
router.post('/enviar-pedido', (req, res) => {
    const { funcionario, loja, quantidade, descricao } = req.body;
    const sql = `INSERT INTO pedidos (funcionario, loja, quantidade, descricao) VALUES (?, ?, ?, ?)`;
    
    db.run(sql, [funcionario, loja, quantidade, descricao], function(err) {
        if (err) return res.status(500).send('Erro ao salvar o pedido.');
        res.send(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Sucesso</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { background-color: #0f172a; color: white; font-family: 'Segoe UI', sans-serif; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; overflow: hidden; }
                    h2 { font-size: 24px; margin-bottom: 25px; }
                    .btn-group { display: flex; gap: 15px; }
                    .btn { display: inline-block; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; cursor: pointer; }
                    .btn-blue { background-color: #3b82f6; color: white; }
                    .btn-green { background-color: #10b981; color: white; }
                </style>
            </head>
            <body>
                <h2>✅ Pedido registrado com sucesso!</h2>
                <div class="btn-group">
                    <button onclick="acessarComPin()" class="btn btn-blue">Ir para o Painel</button>
                    <a href="/" class="btn btn-green">Fazer outro pedido</a>
                </div>
                <script>
                    function acessarComPin() {
                        const pin = prompt('Digite o PIN de 4 dígitos para acessar o painel:');
                        if (pin) { window.location.href = '/gerente?pin=' + pin; }
                    }
                </script>
            </body>
            </html>
        `);
    });
});

// 3. Atualizar Status (Protegido por PIN)
router.post('/pedido/:id/status', verificarAutenticacao, (req, res) => {
    const { id } = req.params;
    const { novoStatus } = req.body;
    const pin = req.query.pin;

    db.run(`UPDATE pedidos SET status = ? WHERE id = ?`, [novoStatus, id], (err) => {
        if (err) return res.status(500).send('Erro ao atualizar status.');
        res.redirect('/gerente?pin=' + pin);
    });
});

// 4. Tela de Edição (Protegida por PIN)
router.get('/pedido/:id/editar', verificarAutenticacao, (req, res) => {
    const { id } = req.params;
    const pin = req.query.pin;
    db.get(`SELECT * FROM pedidos WHERE id = ?`, [id], (err, pedido) => {
        if (err || !pedido) return res.status(404).send('Pedido não encontrado.');
        res.render('editar', { pedido, pin });
    });
});

// 5. Salvar a Edição (Protegido por PIN)
router.post('/pedido/:id/editar', verificarAutenticacao, (req, res) => {
    const { id } = req.params;
    const { funcionario, loja, quantidade, descricao } = req.body;
    const pin = req.query.pin;

    db.run(
        `UPDATE pedidos SET funcionario = ?, loja = ?, quantidade = ?, descricao = ? WHERE id = ?`,
        [funcionario, loja, quantidade, descricao, id],
        (err) => {
            if (err) return res.status(500).send('Erro ao salvar edição.');
            res.redirect('/gerente?pin=' + pin);
        }
    );
});

// 6. Tela do Gerente Principal (Protegida por PIN)
router.get('/gerente', verificarAutenticacao, (req, res) => {
    const pin = req.query.pin;
    db.all(`SELECT *, strftime('%d/%m/%Y %H:%M', datetime(data_pedido, 'localtime')) as data_formatada FROM pedidos WHERE loja = 'Bar' AND status = 'Pendente' ORDER BY id DESC`, [], (err, pedidosBar) => {
        if (err) return res.status(500).send('Erro no banco (Bar)');

        db.all(`SELECT *, strftime('%d/%m/%Y %H:%M', datetime(data_pedido, 'localtime')) as data_formatada FROM pedidos WHERE loja = 'Tabacaria' AND status = 'Pendente' ORDER BY id DESC`, [], (err, pedidosTabacaria) => {
            if (err) return res.status(500).send('Erro no banco (Tabacaria)');
            
            const sqlListaUnica = `
                SELECT descricao, SUM(quantidade) as total_whitespace_quantidade 
                FROM pedidos 
                WHERE status = 'Pendente'
                GROUP BY LOWER(TRIM(descricao)) 
                ORDER BY descricao ASC
            `;

            db.all(sqlListaUnica, [], (err, listaCompras) => {
                if (err) return res.status(500).send('Erro ao gerar lista unificada.');
                res.render('gerente', { pedidosBar, pedidosTabacaria, listaCompras, pin });
            });
        });
    });
});

module.exports = router;
