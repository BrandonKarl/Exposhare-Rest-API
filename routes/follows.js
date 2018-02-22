import express from 'express'

import db from '../database/connection'

const router = express.Router()

router.get('/:id', async (req, res) => {
  const { id } = req.params
  // People that follower follows
  const followees = await db.query(
    'SELECT * FROM follows WHERE follower = $1',
    [id]
  )

  return res.json(followees.rows)
})

router.post('/', async (req, res) => {
  const { follower, followee } = req.body

  const newFollow = await db.query(
    'INSERT INTO follows (follower, followee) ' +
    'VALUES ($1, $2) ' +
    'RETURNING follower, followee',
    [follower, followee]
  )

  return res.json(newFollow.rows[0])
})

export default router