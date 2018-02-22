import express from 'express'

import db from '../database/connection'

const router = express.Router()

router.post('/', async (req, res) => {
  const { user_id, post_id } = req.body

  const newLike = await db.query(
    'INSERT INTO likes (user_id, post_id) ' +
    'VALUES ($1, $2) ' +
    'RETURNING user_id, post_id',
    [user_id, post_id]
  )

  return res.json(newLike.rows[0])
})

export default router