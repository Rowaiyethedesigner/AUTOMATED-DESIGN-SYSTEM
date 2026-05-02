import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import OpenAI from "openai";

const app = express();
app.use(bodyParser.json());

// 🔐 Environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

// 🔹 Webhook verification (Meta)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    return res.status(200).send(challenge);
  } else {
    console.log("❌ Webhook verification failed");
    return res.sendStatus(403);
  }
});

// 🔹 Handle incoming messages
app.post("/webhook", async (req, res) => {
  try {
    console.log("📩 Incoming:", JSON.stringify(req.body, null, 2));

    const message =
      req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) return res.sendStatus(200);

    const userText = message.text?.body;
    const from = message.from;

    if (!userText) return res.sendStatus(200);

    console.log("🧠 Generating design for:", userText);

    // 🎨 Generate image
    const image = await openai.images.generate({
      model: "gpt-image-1",
      prompt: `
Design a premium Nigerian church flyer.

Details:
${userText}

Style:
- Bold typography
- Clean layout
- Gold and black cinematic lighting
- Modern church design
- High contrast
- Social media square (1:1)
      `,
      size: "1024x1024"
    });

    // ✅ Get base64 image
    const image_base64 = image.data[0].b64_json;
    const imageBuffer = Buffer.from(image_base64, "base64");

    console.log("🖼️ Image generated successfully");

    // 📤 Upload media to WhatsApp
    const mediaUpload = await axios.post(
      `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/media`,
      imageBuffer,
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "image/png"
        },
        params: {
          messaging_product: "whatsapp"
        }
      }
    );

    const mediaId = mediaUpload.data.id;

    console.log("📦 Media uploaded:", mediaId);

    // 📤 Send image message
    await axios.post(
      `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: from,
        type: "image",
        image: {
          id: mediaId
        }
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Sent image to WhatsApp");

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ ERROR:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});

// 🔥 Use Render port
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
