const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')

const app = express()

// view engine setup
app.set('views', path.join(__dirname, '../client/views'))
app.set('view engine', 'jade')
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, '../../dist')))

app.get('/', function (req, res) {
  res.render('index')
})

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  const err = new Error(`Not Found ${req.url}`)
  err.status = 404
  next(err)
})

// error handlers
app.use(function (err, req, res) {
  res.status(err.status || 500)
  res.render('error', {
    message: err.message,
    error: err
  })
})

// production error handler
app.use(function (err, req, res) {
  res.status(err.status || 500)
  res.render('error', {
    message: err.message,
    error: {}
  })
})

module.exports = app
