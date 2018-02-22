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
const s3 = new aws.S3()

router.get('/:id', async (req, res) => {
  const { id } = req.params

  const foundPost = await db.query(
    'SELECT posts.id, content, posts.user_id, created_at, image_url, count(likes) AS likes ' +
    'FROM posts ' +
    'LEFT JOIN likes ON likes.post_id = posts.id ' +
    'WHERE id = $1 ' +
    'GROUP BY posts.id, posts.user_id',
    [id]
  )

  if(!foundPost.rows.length) {
    return res.status(404).json({ error: 'Post not found' })
  }

  const postsUser = await db.query(
    'SELECT id, firstname, lastname, email, created_at ' +
    'FROM users ' +
    'WHERE id = $1',
    [foundPost.rows[0].user_id]
  )

  return res.json({ ...foundPost.rows[0], user: postsUser.rows[0] })
})

router.post('/', upload.single('photo'), async (req, res) => {
  const time = moment().format().replace(/:/g, '-')
  const { content, user_id } = req.body

  await s3.putObject({
    Body: req.file.buffer,
    Bucket: `gui-project-database/${user_id}`,
    Key: `${time}.png`,
    ACL: 'public-read'
  }).promise()

  const newPost = await db.query(
    'INSERT INTO posts (content, user_id, image_url) ' +
    'VALUES ($1, $2, $3) ' +
    'RETURNING id, user_id, content, image_url, created_at',
    [content, user_id, `/${user_id}/${time}.png`]
  )

  const user = await db.query(
    'SELECT id, firstname, lastname, email, created_at FROM users WHERE id = $1',
    [newPost.rows[0].user_id]
  )

  return res.json({ ...newPost.rows[0], user: user.rows[0] })
})

export default router