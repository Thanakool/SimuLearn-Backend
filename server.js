import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from "openai"; 

dotenv.config();

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/api/generate-simulation', async (req, res) => {
  try {
    const { prompt, imageBase64 } = req.body;

    const systemi = ` 
      คุณคือผู้เชี่ยวชาญด้านฟิสิกส์ วิเคราะห์โจทย์และตอบกลับเป็น JSON เท่านั้น

      JSON Schema:
      {
        "variables": {
          "gravity": number,
          "velocity": number,
          "angle": number,
          "mass": number
        },
        "description": "คำอธิบายสั้นๆ 1 ประโยคว่าเหตุการณ์นี้คืออะไร (ภาษาไทย)"
      }
    `;

    let messageContent = [
      { type: "text", text: systemi },
      { type: "text", text: prompt ? `โจทย์คือ: ${prompt}` : "จงวิเคราะห์โจทย์จากรูปภาพนี้" }
    ];

    if (imageBase64) {
      messageContent.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
      });
    }

    console.log("กำลังให้ AI (OpenAI) วิเคราะห์โจทย์...");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: messageContent }],
      response_format: { type: "json_object" } 
    });

    const jsonResponse = JSON.parse(response.choices[0].message.content);

    console.log("ให้หน้าเว็บ");
    res.json(jsonResponse);

  } catch (error) {
    console.error("ผิดพลาด:", error);
    res.status(500).json({ error: "ตรวจสอบBackend" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => { 
  console.log(`✅ Backend รันแล้วที่ IP: http://:${PORT}`); 
});