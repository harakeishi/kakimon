const { Hono } = require('hono')
const { serve } = require('@hono/node-server')
const { serveStatic } = require('@hono/node-server/serve-static')
const { basicAuth } = require('hono/basic-auth')

const app = new Hono()

app.use('/*', basicAuth({
  username: process.env.BASIC_AUTH_USER,
  password: process.env.BASIC_AUTH_PASS,
}))

app.use('/*', serveStatic({ root: './public' }))

app.get('/*', serveStatic({ root: './public', path: '/index.html' }))

serve({ fetch: app.fetch, port: 80 }, (info) => {
  console.log(`Server running on port ${info.port}`)
})
