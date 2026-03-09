import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
app.post('/api/generate-simulation', async (req, res) => {
  try {
    const { prompt, imageBase64 } = req.body;
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash-latest", //MODEL
      generationConfig: { responseMimeType: "application/json" } 
    });

    const systemi = ` 
      คุณคือผู้เชี่ยวชาญด้านฟิสิกส์ วิเคราะห์โจทย์และตอบกลับเป็น JSON เท่านั้น

      JSON Schema:
      {
        "variables": {
          "gravity": 9.8,
          "velocity": 0,
          "angle": 0,
          "mass": 1 
        },
        "description": "คำอธิบายสั้นๆ 1 ประโยคว่าเหตุการณ์นี้คืออะไร (ภาษาไทย)"
      }
    `;
    let aiParts = [
      { text: systemi },
      { text: prompt ? `โจทย์คือ: ${prompt}` : "จงวิเคราะห์โจทย์จากรูปภาพนี้" }
    ];

    if (imageBase64) {
      aiParts.push({
        inlineData: {
          data: imageBase64,
          mimeType: "image/jpeg"
        }
      });
    }

    console.log("กำลังให้ AI วิเคราะห์โจทย์...");
    
    const result = await model.generateContent(aiParts);
    const jsonResponse = JSON.parse(result.response.text());

    console.log("ให้หน้าเว็บ");
    res.json(jsonResponse);

  } catch (error) {
    console.error("ผิดพลาด:", error);
    res.status(500).json({ error: "ตรวจสอบBackend" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => { 
  console.log(`✅ Backend รันแล้วที่ Port: ${PORT}`); 
});