import express from 'express'

// File uploading
import multer from 'multer'
import aws from 'aws-sdk'

// Date
import moment from 'moment'

// Database
import db from '../database/connection'

const router = express.Router()

// Setup file upload
const upload = multer()

const s3 = new aws.S3({
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.AWS_SECRET
})

router.get('/:id', async (req, res) => {
  const { id } = req.params

  try {
    var foundPost = await db.query(
      'SELECT posts.id, content, posts.user_id, created_at, image_url, likes ' +
      'FROM posts WHERE id = $1',
      [id])
  } catch(e) {
    return res.status(400).json({ error: 'Malformed or bad query' })
  }

  if(!foundPost.rows.length) {
    return res.status(404).json({ error: 'Post not found' })
  }

  try {
    var postsUser = await db.query(
      'SELECT id, firstname, lastname, email, created_at, bio, profile_picture, username ' +
      'FROM users ' +
      'WHERE id = $1',
      [foundPost.rows[0].user_id])
  } catch(e) {
    return res.status(400).json({ error: 'Could not lookup users' })
  }

  return res.json({ ...foundPost.rows[0], user: postsUser.rows[0] })
})

router.post('/', upload.single('photo'), async (req, res) => {
  const time = moment().format().replace(/:/g, '-')
  const { content, user_id } = req.body

  try {
    await s3.putObject({
      Body: req.file.buffer,
      Bucket: `gui-project-database/${user_id}`,
      Key: `${time}.png`,
      ACL: 'public-read'
    }).promise()
  } catch(e) {
    return res.status(500).json({ error: 'Unable to upload image' })
  }

  try {
    var newPost = await db.query(
      'INSERT INTO posts (content, user_id, image_url) ' +
      'VALUES ($1, $2, $3) ' +
      'RETURNING id, user_id, content, image_url, created_at',
      [content, user_id, `/${user_id}/${time}.png`]
    )
  } catch(e) {
    return res.status(400).json({ error: 'Could not create post '})
  }

  try {
    var user = await db.query(
      'SELECT id, firstname, lastname, email, created_at FROM users WHERE id = $1',
      [newPost.rows[0].user_id]
    )
  } catch(e) {
    return res.status(400).json({ error: 'Could not lookup user' })
  }

  return res.json({ ...newPost.rows[0], user: user.rows[0] })
})

export default router