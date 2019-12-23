import express from "express"
import * as path from "path"
import * as bodyParser from "body-parser";

const app = express()

// view engine setup
app.set('views', path.join(__dirname, '../client/views'))
app.set('view engine', 'jade')

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))
app.use(express.static(path.join(__dirname, '../../dist')))

app.get('/', (
  req: express.Request,
  res: express.Response
) => {
  res.render('index')
})

// catch 404 and forward to error handler
app.use((
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const err = new Error(`Not Found ${req.url}`)
  res.status(404)
  next(err)
})

// error handlers
app.use((
  err: any,
  req: express.Request,
  res: express.Response
) => {
  res.status(err.status || 500)
  res.render('error', {
    message: err.message,
    error: err
  })
})

// production error handler
app.use((
  err: any,
  req: express.Request,
  res: express.Response
) => {
  res.status(err.status || 500)
  res.render('error', {
    message: err.message,
    error: {}
  })
})

export default app
