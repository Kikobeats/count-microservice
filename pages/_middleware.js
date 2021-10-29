/* global Response */

import UrlPattern from 'url-pattern'
import { incr, get } from '@upstash/redis'

const pattern = new UrlPattern('/:namespace/:key')

const allowedDomains = process.env.DOMAINS.split(',').map(n => n.trim())

const isProduction = process.env.NODE_ENV === 'production'

const isAllowedDomain = isProduction
  ? origin => allowedDomains.includes(origin)
  : () => true

export default async function middleware (request) {
  const url = request.nextUrl
  const origin = request.headers.get('origin')

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Max-Age': '86400'
      }
    })
  }

  if (url.pathname === '/' || url.pathname === '/robots.txt') {
    return new Response()
  }

  if (!isAllowedDomain(origin)) {
    return new Response(null, { status: 403 })
  }

  const { namespace, key } = pattern.match(url.pathname)

  const readOnly = !url.searchParams.has('incr')

  const redisKey = `${namespace}:${key}`
  let value = 0

  const { data } = readOnly ? await get(redisKey) : await incr(redisKey)
  if (data) value = data

  return new Response(JSON.stringify(value), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin
    }
  })
}
