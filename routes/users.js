import express from 'express'

// Encryption library
import bcrypt from 'bcrypt'

// User auth token
import jwt from 'jsonwebtoken'

import db from '../database/connection'

const router = express.Router()

router.get('/:id', async (req, res) => {
  const { id } = req.params
  const user = await db.query(
    'SELECT id, firstname, lastname, email, created_at FROM users WHERE id = $1',
    [id]
  )

  if(!user.rows.length) {
    return res.status(404).json({ error: 'User not found' })
  }

  let feed = await db.query(
    'SELECT users.firstname, users.lastname, users.email, users.created_at AS user_created_at, users.id AS user_id, ' + 
    'count(likes) AS likes, posts.created_at, posts.image_url, posts.id, posts.content ' +
    'FROM follows ' + 
    'JOIN posts ON posts.user_id = followee ' + 
    'JOIN users ON users.id = posts.user_id ' +
    'LEFT JOIN likes ON likes.post_id = posts.id ' + 
    'WHERE follower = $1 ' +
    'GROUP BY posts.id, users.firstname, users.lastname, users.email, users.created_at, users.id',
    [id]
  )

  feed = feed.rows.map(post => {
    return {
      id: post.id,
      content: post.content,
      likes: post.likes,
      created_at: post.created_at,
      image_url: post.image_url,
      user: {
        firstname: post.firstname,
        lastname: post.lastname,
        email: post.email,
        id: post.user_id,
        created_at: post.user_created_at
      }
    }
  })

  return res.json({ ...user.rows[0], feed })
})

router.post('/', async (req, res) => {
  const { firstname, lastname, email, password } = req.body
  const foundUser = await db.query(
    'SELECT * FROM users WHERE email = $1', [email]
  )

  if(foundUser.rows.length) {
    return res.status(400).json({ error: 'Email in use' })
  }

  const hashedPass = bcrypt.hashSync(password, 10)

  const newUser = await db.query(
    'INSERT INTO users (firstname, lastname, email, password) ' +
    'VALUES ($1, $2, $3, $4) ' + 
    'RETURNING firstname, lastname, email, id, created_at',
    [firstname, lastname, email, hashedPass]
  )

  const token = jwt.sign({
    user: newUser.rows[0],
  }, process.env.JWT)

  return res.json({
    user: newUser.rows[0],
    token
  })
})

router.post('/authenticate', async (req, res) => {
  const { email, password } = req.body

  const foundUser = await db.query(
    'SELECT firstname, lastname, email, id, created_at, password FROM users WHERE email = $1',
    [email]
  )

  if(!foundUser.rows.length) {
    return res.status(404).json({ error: 'User not found' })
  }

  if(!bcrypt.compareSync(password, foundUser.rows[0].password)) {
    return res.status(403).json({ error: 'Invalid Password' })
  }

  const token = jwt.sign({
    user: foundUser.rows[0],
  }, process.env.JWT)

  delete foundUser.rows[0]['password']

  return res.json({
    user: foundUser.rows[0],
    token
  })
})

export default router
