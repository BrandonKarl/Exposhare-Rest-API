import express from 'express'

import db from '../database/connection'

const router = express.Router()

router.get('/:id', async (req, res) => {
  const { id } = req.params
  // People that follower follows
  try {
    var followees = await db.query(
      'SELECT * FROM follows WHERE follower = $1',
      [id]
    )
  } catch(e) {
    return res.status(404).json({ error: 'Could not lookup follow' })
  }

  return res.json(followees.rows)
})

router.post('/', async (req, res) => {
  const { follower, followee } = req.body

  try {
    var newFollow = await db.query(
      'INSERT INTO follows (follower, followee) ' +
      'VALUES ($1, $2) ' +
      'RETURNING follower, followee',
      [follower, followee]
    )
  } catch(e) {
    return res.status(500).json({ error: 'Could not create follow' })
  }

  return res.json(newFollow.rows[0])
})

export default router