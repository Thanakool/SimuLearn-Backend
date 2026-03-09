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
      model: "gemini-2.5-flash", //MODEL
      generationConfig: { responseMimeType: "application/json" } 
    });

    const systemi = `
  คุณคือผู้เชี่ยวชาญด้านฟิสิกส์ วิเคราะห์โจทย์และตอบกลับเป็น JSON เท่านั้น
  
  กฎเหล็ก:
  1. วิเคราะห์ Topic ให้ตรงกับหมวด: "projectile", "freefall", "linear_motion"
  2. variables ต้องใช้ชื่อ Key ตามที่กำหนดไว้เท่านั้น (ห้ามตั้งชื่อเอง)
  3. ทุกค่าต้องเป็น Number (ห้ามใส่หน่วย)
  
  โครงสร้างตัวแปรตาม Topic:
  - ถ้า "projectile": { "velocity": num, "angle": num, "gravity": 9.8 }
  - ถ้า "freefall": { "height": num, "gravity": 9.8, "mass": num }
  - ถ้า "linear_motion": { "u": num, "v": num, "a": num, "t": num, "s": num }

  JSON Schema:
  {
    "topic": "ชื่อหมวดภาษาอังกฤษ",
    "variables": {},
    "description": "คำอธิบายภาษาไทยสั้นๆ 1 ประโยค"
  }
`;//รอเขียน prompt
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

    console.log("AI วิเคราะห์โจทย์");
    
    const result = await model.generateContent(aiParts);
    const jsonResponse = JSON.parse(result.response.text());

    console.log("✅ให้หน้าเว็บ");
    res.json(jsonResponse);

  } catch (error) {
    console.error("🚫ผิดพลาด:", error);
    res.status(500).json({ error: "ตรวจBackend" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => { 
  console.log(`✅ Backend รันแล้วที่ Port: ${PORT}`); 
});