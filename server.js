import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import admin from 'firebase-admin';
import db from './db.js'; 
import historyRoute from './historyRoute.js'; //  ดึง API

dotenv.config();

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

app.use('/api/history', historyRoute);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/generate-simulation', async (req, res) => {
  try {
    const { prompt, userId } = req.body; 
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash", //MODEL
      generationConfig: { responseMimeType: "application/json" } 
    });

    const systemi = `
  คุณคือ AI ผู้เชี่ยวชาญด้านฟิสิกส์ หน้าที่เดียวของคุณคืออ่านโจทย์ สกัดตัวแปร และตอบกลับเป็น JSON ที่ถูกต้องตาม Schema 100% เท่านั้น ห้ามมีข้อความอื่นปะปน

[กฎขั้นเด็ดขาด]:
1.หมวดหมู่ (Topic): บังคับใช้ค่า "freefall" เท่านั้น
2.ตัวแปร (Variables): บังคับใช้ Key ชุดนี้เป๊ะๆ ห้ามเพิ่ม ห้ามลด ห้ามเปลี่ยนชื่อเด็ดขาด: "u" (ความเร็วต้น), "v" (ความเร็วปลาย), "g" (ความเร่งแรงโน้มถ่วง), "t" (เวลา), "s" (ระยะทาง/ความสูง), "mass" (มวล)
3.ชนิดข้อมูล (Data Type): ต้องเป็นตัวเลข (Number) หรือ null เท่านั้น ห้ามใส่หน่วย (เช่น m, m/s, s) ลงใน variables เด็ดขาด ถ้าโจทย์ไม่ระบุตัวแปรไหนมาชัดเจน ให้ใส่ค่าเป็น null เสมอ ห้ามเดาเลขเอง ค่า g ให้ใช้ 9.8 เสมอ (ยกเว้นโจทย์ระบุเป็น 10) สกัดเฉพาะ "ตัวเลขดิบ" จากโจทย์ ห้ามทำการคำนวณสมการเพื่อหาค่าที่หายไปเองเด็ดขาด
4.คำอธิบาย (Description): สรุปสถานการณ์ในโจทย์เป็นภาษาไทยสั้นๆ 1 ประโยค

[ตัวอย่างโจทย์และการตอบกลับ - บังคับเลียนแบบรูปแบบนี้เท่านั้น]
User: "ปล่อยวัตถุจากที่สูง 20 เมตรลงมาตามแนวแรงโน้มถ่วง"
AI: { "topic": "freefall", "variables": { "u": 0, "v": null, "g": 9.8, "t": null, "s": 20, "mass": null }, "description": "ปล่อยวัตถุจากที่สูง 20 เมตรลงมาตามแนวแรงโน้มถ่วง" }
User: "ปาหินมวล 2 กิโลกรัม ลงมาจากตึกด้วยความเร็ว 5 เมตรต่อวินาที ใช้เวลา 3 วินาทีตกถึงพื้น"
AI: { "topic": "freefall", "variables": { "u": 5, "v": null, "g": 9.8, "t": 3, "s": null, "mass": 2 }, "description": "ปาหินมวล 2 kg ลงมาด้วยความเร็ว 5 m/s ใช้เวลา 3 วินาที" }" 

`;
    let aiParts = [
      { text: systemi },
      { text: prompt ? `โจทย์คือ: ${prompt}` : "จงวิเคราะห์โจทย์" }
    ];

    console.log("AI วิเคราะห์โจทย์");
    
    const result = await model.generateContent(aiParts);
    const jsonResponse = JSON.parse(result.response.text());

    const v = jsonResponse.variables;
    
    let vyCal = v.u !== null ? v.u : 0;
    if (prompt && prompt.includes("ขึ้น")) {
        vyCal = -vyCal; 
    }

    const finalData = {
      type: "free_fall",
      variables: {
        gravity: v.g !== null ? v.g : 9.8,
        h_start: v.s !== null ? v.s : 0,
        vx: 0,
        vy: vyCal,
        mass: v.mass !== null ? v.mass : 0
      },
      description: jsonResponse.description
    };
    if (userId) {
      try {
        await db.collection('simulation_history').add({
          userId: userId, 
          original_prompt: prompt || "ไม่ระบุโจทย์",
          topic_type: finalData.type,
          ai_description: finalData.description,
          calculated_variables: finalData.variables,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`💾 บันทึก ${userId} เรียบร้อย!`);
      } catch (dbError) {
        console.error("⚠️ บันทึกไม่สำเร็จ:", dbError);
      }
    } else {
      console.log("🛑(Guest)ไม่บันทึกประวัติ");
    }

    console.log("✅ให้หน้าเว็บ");
    res.json(finalData);

  } catch (error) {
    console.error("🚫ผิดพลาด:", error);
    res.status(500).json({ error: "ตรวจBackend" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => { 
  console.log(`✅ Backend รันที่ Port: ${PORT}`); 
});