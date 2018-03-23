import express from 'express'

import db from '../database/connection'

const router = express.Router()

router.post('/', async (req, res) => {
  const { user_id, post_id } = req.body

  try {
    var newLike = await db.query(
      'INSERT INTO likes (user_id, post_id) ' +
      'VALUES ($1, $2) ' +
      'RETURNING user_id, post_id',
      [user_id, post_id]
    )
  } catch(e) {
    return res.status(400).json({ error: 'Could not create like' })
  }

  try {
    await db.query(
      'UPDATE posts SET likes = likes + 1 WHERE id=$1', [post_id]
    )
  } catch(e) {
    return res.status(400).json({ error: 'Could not create like' })
  }

  return res.json(newLike.rows[0])
})

router.delete('/:user_id/:post_id', async (req, res) => {
  const { user_id, post_id } = req.params
  try {
    await db.query(
      `DELETE FROM likes WHERE user_id = $1 AND post_id = $2`,
      [user_id, post_id]
    )
  } catch(e) {
    return res.status(400).json({ error: 'Could not remove like' })
  }

  try {
    await db.query(
      'UPDATE posts SET likes = likes - 1 WHERE id = $1', [post_id]
    )
  } catch(e) {
    return res.status(400).json({ error: 'Could not remove like' })
  }

  return res.send('removed')
})

export default router