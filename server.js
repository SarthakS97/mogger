const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json({limit: '50mb'}));

app.post('/upload', async (req, res) => {
    const { image1, image2 } = req.body;

    try {
        // Convert base64 to the required format
        const base64ToDataUrl = (base64) => {
            return `data:application/octet-stream;base64,${base64.split(',')[1]}`;
        };

        const base_image = base64ToDataUrl(image1);  // reference image
        const identity_image = base64ToDataUrl(image2);  // selfie image

        const input = {
            base_image: base_image,
            style_image: identity_image,
            identity_image: identity_image,
            composition_image: base_image,
            base_image_strength: parseFloat(req.body.base_image_strength)
        };

        const replicateApiKey = process.env.REPLICATE_API_KEY; // Replace with your actual API key
        const replicateApiUrl = 'https://api.replicate.com/v1/predictions';

        const response = await fetch(replicateApiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${replicateApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                version: "1a6dcacf62f387316745e91928dec9d59412b6d0518647fdb0f52e6f40b6a46c",
                input: input
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const prediction = await response.json();
        console.log('Prediction:', prediction);

        // Check if the prediction is completed
        if (prediction.status === 'succeeded') {
            res.json({ message: 'Images processed successfully', output: prediction.output });
        } else {
            // If not completed, send the id for polling
            res.json({ message: 'Processing started', id: prediction.id });
        }
    } catch (error) {
        console.error('Error processing images:', error);
        res.status(500).json({ error: 'Failed to process images', details: error.message });
    }
});

app.get('/check-status/:id', async (req, res) => {
    try {
      const replicateApiKey = process.env.REPLICATE_API_KEY;      // Replace with your actual API key
        const replicateApiUrl = `https://api.replicate.com/v1/predictions/${req.params.id}`;

        const response = await fetch(replicateApiUrl, {
            headers: {
                'Authorization': `Token ${replicateApiKey}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const prediction = await response.json();
        res.json(prediction);
    } catch (error) {
        console.error('Error checking status:', error);
        res.status(500).json({ error: 'Failed to check status', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});