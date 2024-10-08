const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');
const app = express();
const stripe = require('stripe')(process.env.STRIPE_API_KEY);

app.use(cors({
  origin: 'https://gatosdoacoes.netlify.app'
}));

app.get('/total-donations', async (req, res) => {
    try {
        const charges = await stripe.charges.list({ limit: 100 });
        let total = 0;
        charges.data.forEach(charge => {
            total += charge.amount;
        });
        res.json({ total: total / 100 });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao obter total de doações' });
    }
});

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
