import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import OpenAI from "openai";

const app = express();
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: "YOUR_OPENAI_API_KEY"
});

const VERIFY_TOKEN = "ayomide@234";
const WHATSAPP_TOKEN = "YOUR_WHATSAPP_TOKEN";
const PHONE_NUMBER_ID = "YOUR_PHONE_NUMBER_ID";

// 🔹 Webhook Verification (Meta requirement)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
});

// 🔹 Handle incoming messages
app.post("/webhook", async (req, res) => {
  try {
    const message =
      req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) return res.sendStatus(200);

    const userText = message.text?.body;
    const from = message.from;

    // 🧠 Generate design
    const image = await openai.images.generate({
      model: "gpt-image-1",
      prompt: `
      Design a premium Nigerian church flyer.

      Details:
      ${userText}

      Style:
      - Bold typography
      - Gold and black cinematic lighting
      - Clean layout
      - Modern church design
      - High quality, 4K look
      `,
      size: "1024x1024"
    });

    const imageUrl = image.data[0].url;

    // 📤 Send back to WhatsApp
    await axios.post(
      `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: from,
        type: "image",
        image: {
          link: imageUrl
        }
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
