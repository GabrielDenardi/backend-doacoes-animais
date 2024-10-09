const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const app = express();
const stripe = Stripe(process.env.STRIPE_API_KEY);

app.use(cors({
  origin: 'https://gatosdoacoes.netlify.app'
}));

app.get('/total-donations', async (req, res) => {
    try {
        let total = 0;
        let hasMore = true;
        let startingAfter = null;

        while (hasMore) {
            let params = {
                limit: 100,
                expand: ['data.refunds']
            };

            if (startingAfter) {
                params.starting_after = startingAfter;
            }

            const charges = await stripe.charges.list(params);

            charges.data.forEach(charge => {
                if (charge.status === 'succeeded') {
                    let amount = charge.amount;
                    if (charge.amount_refunded > 0) {
                        amount -= charge.amount_refunded;
                    }
                    total += amount;
                }
            });

            if (charges.has_more) {
                startingAfter = charges.data[charges.data.length - 1].id;
            } else {
                hasMore = false;
            }
        }

        res.json({ total: total / 100 });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao obter total de doações' });
    }
});

app.get('/image', async (req, res) => {
    try {
        const charges = await stripe.charges.list({
            limit: 100,
            expand: ['data.refunds']
        });

        let totalDonations = 0;

        charges.data.forEach(charge => {
            if (charge.status === 'succeeded') {
                let amount = charge.amount;
                if (charge.amount_refunded > 0) {
                    amount -= charge.amount_refunded;
                }
                totalDonations += amount;
            }
        });

        totalDonations = totalDonations / 100;

        const maxDonations = 1000;
        let blurLevel = 20 * (1 - (totalDonations / maxDonations));
        blurLevel = blurLevel < 0 ? 0 : blurLevel;

        const imagePath = path.join(__dirname, 'private-images', 'gato-de-rua.jpg');

        if (!fs.existsSync(imagePath)) {
            return res.status(404).send('Imagem não encontrada');
        }

        const imageBuffer = fs.readFileSync(imagePath);

        let transformedImage = sharp(imageBuffer);

        if (blurLevel > 0) {
            transformedImage = transformedImage.blur(blurLevel);
        }

        const outputImageBuffer = await transformedImage.toBuffer();

        res.writeHead(200, {
            'Content-Type': 'image/jpeg',
            'Content-Length': outputImageBuffer.length,
            'Cache-Control': 'no-cache'
        });
        res.end(outputImageBuffer);
    } catch (error) {
        console.error('Erro ao processar a imagem:', error);
        res.status(500).send('Erro ao processar a imagem');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
