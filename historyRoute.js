import express from 'express';
import db from './db.js'; // ดึง db

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "ต้องระบุ userId ใน URL" });
    }

    const snapshot = await db.collection('simulation_history')
                             .where('userId', '==', userId)
                             .orderBy('timestamp', 'desc')
                             .get();
    
    let historyList = [];
    snapshot.forEach(doc => {
      historyList.push({ id: doc.id, ...doc.data() });
    });

    res.json(historyList);
  } catch (error) {
    console.error("ดึงไม่ได้:", error);
    res.status(500).json({ error: "ไม่สามารถดึงได้" });
  }
});

export default router;