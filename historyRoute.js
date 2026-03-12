import express from 'express';
import db from './db.js';

const router = express.Router();

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const snapshot = await db.collection('simulations')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const history = [];
    snapshot.forEach(doc => { history.push({ id: doc.id, ...doc.data() }); });
    res.json(history);
  } catch (error) { res.status(500).json({ error: "Fetch History Error" }); }
});

export default router;