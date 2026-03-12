import express from 'express';
import db from './db.js';

const router = express.Router();

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`🔍 กำลังดึงประวัติของบอส ID: ${userId}`);
    const snapshot = await db.collection('simulations')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc') // 💡 ใช้ createdAt ให้ตรงกับระบบใหม่
      .get();

    if (snapshot.empty) {
      console.log(`📭 ไม่พบประวัติสำหรับ ID: ${userId}`);
      return res.json([]);
    }

    const history = [];
    snapshot.forEach(doc => {
      history.push({ id: doc.id, ...doc.data() });
    });

    console.log(`✅ ดึงข้อมูลสำเร็จ! ส่งคืน ${history.length} รายการ`);
    res.json(history);
  } catch (error) {
    console.error("🚫 หลังบ้านดึงประวัติพลาด:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
  }
});

export default router;