import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import admin from 'firebase-admin';
import db from './db.js'; 
import historyRoute from './historyRoute.js'; 

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
      model: "gemini-3.1-flash-lite-preview", //MODEL gemini-3.1-flash-lite-preview
      generationConfig: { responseMimeType: "application/json" } 
    });

    // ⛔ Prompt เดิม 100% ห้ามแก้
    const systemi = `
คุณคือ AI ผู้เชี่ยวชาญด้านฟิสิกส์ หน้าที่เดียวของคุณคืออ่านโจทย์ จำแนกประเภท สกัดตัวแปร และตอบกลับเป็น JSON ใน Markdown code block ที่ถูกต้องตาม Schema 100% เท่านั้น ห้ามมีข้อความอื่นปะปน
[ขั้นตอนการทำงาน]:
วิเคราะห์มิติการเคลื่อนที่:
  - หากโจทย์ระบุแค่การ "โยนขึ้น", "ปาลง", "ปล่อย", "ตก" โดยไม่มีการพูดถึง "มุม", "ทำมุม", หรือ "ระยะห่างแนวราบ" ให้ถือว่าเป็นแนวตรงแนวดิ่งเสมอ -> ตอบ "freefall" (แม้จะมีเป้าหมายเป็นระเบียงหรือหน้าต่างก็ตาม)
  - หากโจทย์ระบุ "มุม", "ทิศทางทำมุม", "ขว้างแนวราบจากที่สูง" หรือ "ระยะห่างแนวราบ" -> ตอบ "projectile"
"ห้ามวิเคราะห์บริบทแวดล้อม (เช่น ห้อง, เพดาน, ระเบียง) ว่าเป็นการเคลื่อนที่ 2 มิติ หากโจทย์ไม่ระบุ 'มุม' หรือ 'ทิศทางแนวราบ' มาให้เห็นเป็นตัวเลขหรือตัวแปรชัดเจน ให้ตีเป็น freefall 100%"
เลือก Topic และ Schema ให้ถูกต้องตามกฎของเรื่องนั้นๆ
สกัดเฉพาะตัวเลขดิบ ที่มีหน่วยกำกับชัดเจน (เช่น 10m, 5 m/s)  ห้ามคำนวณ ห้ามใส่หน่วย หากเจอตัวแปรติดสัมประสิทธิ์ (เช่น 2s, 3u, v/2) หรือตัวแปรที่ติดตัวอักษรโดยไม่มีตัวเลขกำกับ (เช่น มวล m, ความสูง h) ให้ถือว่าไม่มีตัวเลขจริงและใส่ค่าเป็น null เสมอ ห้ามเดาเลขเอง
[กฎเฉพาะเรื่อง 1: Freefall]
หมวดหมู่ (Topic): "freefall"
ตัวแปร (Variables): "u", "v", "g", "t", "s", "mass"
กฎเครื่องหมาย: ยึดทิศ "ลง" เป็นบวก (+) เสมอ
หากโยนขึ้น u เป็นลบ, หากปาลง/ปล่อย u เป็นบวกหรือ 0
ค่า g ให้ใช้ 9.8 เสมอ (เว้นแต่โจทย์สั่ง 10)
คีย์เวิร์ด: "ปล่อย/ตก" (u=0), "สูงสุด/หยุด" (v=0)
[กฎเฉพาะเรื่อง 2: Projectile]
หมวดหมู่ (Topic): "projectile"
ตัวแปร (Variables): "u", "theta", "ux", "uy", "g", "t", "sx", "sy", "mass"
โครงสร้าง theta: ต้องส่งเป็น Object {"value": ..., "unit": "deg" หรือ "rad"} โดยมีเงื่อนไข:
หากมุมเป็นตัวเลขดิบ (เช่น 30, 45) ให้ส่งเป็น Number
หากมุมติดค่า π  หรือเป็นเศษส่วน (เช่น pi/2, 2pi) ให้ส่งเป็น String โดยเปลี่ยนสัญลักษณ์เป็นคำว่า "pi" เสมอ ห้ามคำนวณเป็นเลขทศนิยมเอง
สกัดเข้า theta เฉพาะเมื่อโจทย์ระบุว่าเป็น "มุม", "ทิศทาง" หรือ "ทำมุมกับ..." เท่านั้น
หน่วย: องศา/° ให้ใช้ "deg", เรเดียน/rad/π  ให้ใช้ "rad" (ถ้าไม่ระบุให้ถือเป็น "deg")
กฎเครื่องหมาย: ยึดทิศ "ขึ้น" เป็นบวก (+) เสมอ
g ต้องติดลบ (-9.8) เสมอ (เว้นแต่โจทย์สั่ง 10 ให้ใช้ -10)
แนวราบ (x) ให้ทิศที่พุ่งออกจากจุดเริ่มเป็นบวก (+) เสมอ
sy ติดลบถ้าตกต่ำกว่าจุดเริ่ม


[กฎการตอบกลับ]:
ตอบในรูปแบบ Markdown code blocks เท่านั้น
ห้ามมีบทสนทนา ห้ามมีคำอธิบายเพิ่มเติมนอก JSON
หากโจทย์ไม่ระบุตัวแปรใด ให้ใส่ null
[ตัวอย่างโจทย์และการตอบกลับ - บังคับเลียนแบบรูปแบบนี้เท่านั้น]
 User: "ปล่อยวัตถุจากที่สูง 20 เมตร"
 AI:
{
  "topic": "freefall",
  "variables": { "u": 0, "v": null, "g": 9.8, "t": null, "s": 20, "mass": null },
  "description": "ปล่อยวัตถุจากความสูง 20 เมตรลงมาตามแนวแรงโน้มถ่วง"
}

User: "เตะบอลด้วยความเร็ว 20 m/s ทำมุม 30 องศา" 
AI:
{
  "topic": "projectile",
  "variables": { "u": 20, "theta": {"value": 30, "unit": "deg"}, "ux": null, "uy": null, "g": -9.8, "t": null, "sx": null, "sy": 0, "mass": null },
  "description": "เตะลูกบอลด้วยความเร็ว 20 m/s ทำมุม 30 องศา"
}
`;
    let aiParts = [{ text: systemi }, { text: prompt ? `โจทย์คือ: ${prompt}` : "จงวิเคราะห์โจทย์" }];
    const result = await model.generateContent(aiParts);
    let rawText = result.response.text();
    rawText = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
    const jsonResponse = JSON.parse(rawText);

    const v = jsonResponse.variables || {};
    const aiTopic = jsonResponse.topic; 

    let finalData = {
      type: aiTopic === "projectile" ? "projectile" : "free_fall", 
      variables: {},
      description: jsonResponse.description
    };

    // Logic คำนวณ (เหมือนเดิม)
    if (aiTopic === "projectile") {
        let speed = v.u ?? 0;
        let angleVal = v.theta?.value ?? 0;
        let unit = v.theta?.unit ?? "deg";
        let rad = 0;
        if (typeof angleVal === 'string') {
            if (angleVal === 'pi') rad = Math.PI;
            else if (angleVal === 'pi/2') rad = Math.PI / 2;
            else rad = parseFloat(angleVal) || 0; 
        } else {
            rad = unit === "rad" ? angleVal : (angleVal * Math.PI) / 180;
        }
        finalData.variables = {
            gravity: v.g != null ? Math.abs(v.g) : 9.8,
            h_start: Math.abs(v.sy ?? (v.s ?? 0)), 
            vx: parseFloat((speed * Math.cos(rad)).toFixed(2)),
            vy: parseFloat((-speed * Math.sin(rad)).toFixed(2)),
            mass: v.mass ?? 1,
            angle: parseFloat(rad.toFixed(4))
        };
    } else {
        let vyCal = v.u ?? 0;
        if (prompt && prompt.includes("ขึ้น")) vyCal = -Math.abs(vyCal);
        else if (prompt && (prompt.includes("ลง") || prompt.includes("ตก") || prompt.includes("ปล่อย"))) vyCal = Math.abs(vyCal);
        finalData.variables = {
            gravity: v.g != null ? Math.abs(v.g) : 9.8,
            h_start: v.s ?? 0,
            vx: 0,
            vy: vyCal,
            mass: v.mass ?? 1
        };
    }

    if (userId) {
      db.collection('simulations').add({
        userId: userId,
        title: prompt || "ไม่ระบุโจทย์",
        topic_type: finalData.type,
        ai_description: finalData.description,
        calculated_variables: finalData.variables,
        data: finalData, // เก็บเพื่อให้รีเฟรชแล้ววาดบอลได้
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }).then(() => console.log("💾 บันทึกสำเร็จ")).catch(e => console.error(e));
    }
    res.json(finalData);
  } catch (error) {
    res.status(500).json({ error: "Backend Error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`✅ Port: ${PORT}`));