import * as express from "express"
import * as path from "path"
import * as bodyParser from "body-parser";

const app = express()

// view engine setup
app.set('views', path.join(__dirname, '../client/views'))
app.set('view engine', 'jade')
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))
app.use(express.static(path.join(__dirname, '../../dist')))

app.get('/', (req, res) => {
  res.render('index')
})

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error(`Not Found ${req.url}`)
  // @ts-ignore
  res.status = 404
  next(err)
})

// error handlers
app.use((err, req, res) => {
  // @ts-ignore
  res.status(err.status || 500)
  // @ts-ignore
  res.render('error', {
    // @ts-ignore
    message: err.message,
    error: err
  })
})

// production error handler
app.use((err, req, res) => {
  // @ts-ignore
  res.status(err.status || 500)
  // @ts-ignore
  res.render('error', {
    // @ts-ignore
    message: err.message,
    error: {}
  })
})

export default app
