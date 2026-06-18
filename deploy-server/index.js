const { Hono } = require('hono')
const { serve } = require('@hono/node-server')
const { serveStatic } = require('@hono/node-server/serve-static')

const app = new Hono()

app.use('/*', serveStatic({ root: './public' }))

app.get('/*', serveStatic({ root: './public', path: '/index.html' }))

serve({ fetch: app.fetch, port: 80 }, (info) => {
  console.log(`Server running on port ${info.port}`)
})
