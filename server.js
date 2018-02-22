// Framework
import express from 'express'

// Middleware
import cors from 'cors'
import bodyParser from 'body-parser'

// .env config
import dotenv from 'dotenv'
import path from 'path'

// Routes
import users from './routes/users'
import posts from './routes/posts'
import likes from './routes/likes'
import follows from './routes/follows'

// Configure .env
dotenv.config({ path: path.join(__dirname, '/.env') })

// Dynamically select port
const PORT = process.env.PORT || '4000'

// Initialize framework
const app = express()

// Use middleware
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(cors())

app.get('/', (req, res) => res.send('Home Route /'))

app.use('/api/users', users)
app.use('/api/posts', posts)
app.use('/api/likes', likes)
app.use('/api/follows', follows)

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))



