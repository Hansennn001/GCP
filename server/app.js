import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import healthRoutes from './routes/healthRoutes.js'
import notFound from './middleware/notFound.js'
import errorHandler from './middleware/errorHandler.js'

const app = express()

app.disable('x-powered-by')
app.use(helmet())
app.use(cors())
app.use(express.json({ limit: '100kb' }))
app.use('/api', healthRoutes)
app.use(notFound)
app.use(errorHandler)

export default app
