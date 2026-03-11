import express from 'express';
import db from './db.js';

const router = express.Router();

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`🔍 กำลังดึงประวัติ ${userId}`);

    const snapshot = await db.collection('simulation_history')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .get();

    if (snapshot.empty) {
      return res.json([]);
    }

    const history = [];
    snapshot.forEach(doc => {
      history.push({ id: doc.id, ...doc.data() });
    });

    console.log(`✅ ส่งประวัติให้บอสแล้ว ${history.length} รายการ`);
    res.json(history);
  } catch (error) {
    console.error("🚫 หลังบ้านดึงประวัติพลาด:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
  }
});

export default router;