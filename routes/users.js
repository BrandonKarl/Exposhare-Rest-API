import express from 'express'

// Encryption library
import bcrypt from 'bcrypt'

// User auth token
import jwt from 'jsonwebtoken'

import db from '../database/connection'

const router = express.Router()

router.get('/:id', async (req, res) => {
  const { id } = req.params
  try {
    var user = await db.query(`
      SELECT id, firstname, lastname, email, created_at, bio, username, profile_picture
      FROM users 
      WHERE id = $1`,
      [id]
    )
  } catch(e) {
    return res.status(400).json({ error: 'Malformed or bad query' })
  }

  if(!user.rows.length) {
    return res.status(404).json({ error: 'User not found' })
  }

  try {
    var followerCount = await db.query(`
      SELECT count(followee)
      FROM follows 
      WHERE followee = $1`,
      [id]
    )
  } catch(e) {
    return res.status(400).json({ error: 'Can not get number of followers' })
  }

  try {
    var followingCount = await db.query(`
      SELECT count(follower)
      FROM follows 
      WHERE follower = $1`,
      [id]
    )
  } catch(e) {
    return res.status(400).json({ error: 'Can not get number of number of following' })
  }

  user.rows[0]['followers'] = followerCount.rows[0].count
  user.rows[0]['following'] = followingCount.rows[0].count

  return res.json({ ...user.rows[0] })
})

router.get('/:id/feed', async (req, res) => {
  const { id } = req.params
  try {
    var feed = await db.query(`
    SELECT firstname, lastname, email, users.created_at AS user_created_at, users.id AS user_id,
      posts.created_at, image_url, posts.id, content, likes 
    FROM follows 
    JOIN posts ON posts.user_id = followee
    JOIN users ON users.id = posts.user_id
    WHERE follower = $1
    ORDER BY posts.id DESC`,
    [id])
  } catch(e) {
    return res.status(500).json({ error: 'Error getting feed for user' })
  }

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

  return res.json(feed)
})

router.get('/:id/posts', async (req, res) => {
  const { id } = req.params
  try {
    var feed = await db.query(`
    SELECT id, content, image_url, likes, user_id, created_at
    FROM posts
    WHERE user_id = $1
    ORDER BY id DESC`,
    [id])
  } catch(e) {
    return res.status(500).json({ error: 'Error getting posts for user' })
  }

  return res.json(feed.rows)
})

router.get('/:id/followers', async (req, res) => {
  const { id } = req.params
  try {
    var followers = await db.query(`
    SELECT id, firstname, lastname, email, users.created_at, bio, username, profile_picture
    FROM follows
    JOIN users ON users.id = follower
    WHERE followee = $1`,
    [id])
  } catch(e) {
    return res.status(500).json({ error: 'Error getting posts for user' })
  }

  return res.json(followers.rows)
})

router.get('/:id/following', async (req, res) => {
  const { id } = req.params
  try {
    var followers = await db.query(`
    SELECT id, firstname, lastname, email, users.created_at, bio, username, profile_picture
    FROM follows
    JOIN users ON users.id = followee
    WHERE follower = $1`,
    [id])
  } catch(e) {
    return res.status(500).json({ error: 'Error getting posts for user' })
  }

  return res.json(followers.rows)
})

router.get('/search/:username', async (req, res) => {
  const { username } = req.params
  console.log(username)
  try {
    var users = await db.query(`
    SELECT id, firstname, lastname, email, created_at, bio, username, profile_picture
    FROM users
    WHERE username LIKE $1`,
    [`%${username}%`])
  } catch(e) {
    return res.status(500).json({ error: 'Error getting posts for user' })
  }

  res.json(users.rows)
})

router.post('/', async (req, res) => {
  // Check params
  const { firstname, lastname, email, password, bio, username } = req.body
  try {
    var foundUser = await db.query(
      `SELECT * FROM users WHERE email = $1`, [email]
    )
  } catch(e) {
    return res.status(400).json({ error: 'Could not lookup users' })
  }

  if(foundUser.rows.length) {
    return res.status(400).json({ error: 'Email in use' })
  }

  const hashedPass = bcrypt.hashSync(password, 10)

  try {
    var newUser = await db.query(`
    INSERT INTO users (firstname, lastname, email, password, bio, username)
    VALUES ($1, $2, $3, $4, $5, $6) 
    RETURNING firstname, lastname, email, id, created_at, bio, username, profile_picture`,
    [firstname, lastname, email, hashedPass, bio, username])
  } catch(e) {
    return res.status(400).json({ error: 'Could not create user' })
  }


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

  try {
    var foundUser = await db.query(`
    SELECT firstname, lastname, email, id, created_at, password, profile_picture, bio, username 
    FROM users
    WHERE email = $1`,
    [email])
  } catch(e) {
    res.status(400).json({ error: 'Could not lookup users' })
  }

  if(!foundUser.rows.length) {
    return res.status(404).json({ error: 'User not found' })
  }

  if(!bcrypt.compareSync(password, foundUser.rows[0].password)) {
    return res.status(403).json({ error: 'Invalid Password' })
  }

  delete foundUser.rows[0]['password']

  const token = jwt.sign({
    user: foundUser.rows[0],
  }, process.env.JWT)

  return res.json({
    user: foundUser.rows[0],
    token
  })
})

export default router
