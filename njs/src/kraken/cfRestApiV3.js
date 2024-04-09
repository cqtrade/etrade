// Crypto Facilities Ltd REST API V3

// Copyright (c) 2019 Crypto Facilities

// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the 'Software'),
// to deal in the Software without restriction, including without limitation
// the rights to use, copy, modify, merge, publish, distribute, sublicense,
// and/or sell copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
// WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
// IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

const crypto = require('crypto')
const utf8 = require('utf8')
const qs = require('querystring')

const request = require('request')

class CfRestApiV3 {
  constructor(baseUrl, apiKey, apiSecret, timeout) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
    this.apiSecret = apiSecret
    this.timeout = timeout
  }

  // ######################
  // ## public endpoints ##
  // ######################

  /**
   * Returns all instruments with specifications.
   */
  getInstruments() {
    const requestOptions = {
      url: this.baseUrl + '/derivatives/api/v3/instruments',
      method: 'GET',
      headers: { Accept: 'application/json' },
      timeout: this.timeout,
    }
    return makeRequest(requestOptions, 'getInstruments(): ')
  }

  /**
   * Returns market data for all instruments.
   */
  getTickers() {
    const requestOptions = {
      url: this.baseUrl + '/derivatives/api/v3/tickers',
      method: 'GET',
      headers: { Accept: 'application/json' },
      timeout: this.timeout,
    }
    return makeRequest(requestOptions, 'getTickers(): ')
  }

  /**
   * Returns the entire order book of a futures market.
   */
  getOrderbook(symbol) {
    const params = qs.stringify({ symbol })
    const requestOptions = {
      url: this.baseUrl + '/derivatives/api/v3/orderbook?' + params,
      method: 'GET',
      headers: { Accept: 'application/json' },
      timeout: this.timeout,
    }
    return makeRequest(requestOptions, 'getOrderbook(): ')
  }

  /**
   * Returns historical data for futures and indices.
   */
  getHistory(symbol, lastTime = null) {
    const params = { symbol }
    if (lastTime) {
      params[lastTime] = lastTime
    }
    const requestOptions = {
      url: this.baseUrl + '/derivatives/api/v3/history?' + qs.stringify(params),
      method: 'GET',
      headers: { Accept: 'application/json' },
      timeout: this.timeout,
    }
    return makeRequest(requestOptions, 'getHistory(): ')
  }

  // #######################
  // ## private endpoints ##
  // #######################

  /**
   * Returns key account information.
   */
  getAccounts() {
    const endpoint = '/derivatives/api/v3/accounts'
    const nonce = createNonce()
    const authent = this.signRequest(endpoint, nonce)
    const headers = {
      Accept: 'application/json',
      APIKey: this.apiKey,
      Nonce: nonce,
      Authent: authent,
    }

    const requestOptions = {
      url: this.baseUrl + endpoint,
      method: 'GET',
      headers,
      timeout: this.timeout,
    }

    return makeRequest(requestOptions, 'getAccounts(): ')
  }

  /**
   * Send/place order.
   */
  sendOrder(
    orderType,
    symbol,
    side,
    size,
    limitPrice,
    stopPrice = null,
    clientOrderId = null
  ) {
    const endpoint = '/derivatives/api/v3/sendorder'
    const nonce = createNonce()
    const data = `orderType=${orderType}&symbol=${symbol}&side=${side}&size=${size}&limitPrice=${limitPrice}`
    if (stopPrice) data.concat(`&stopPrice=${stopPrice}`)
    if (clientOrderId) data.concat(`&cliOrdId=${clientOrderId}`)
    const authent = this.signRequest(endpoint, nonce, data)
    const headers = {
      Accept: 'application/json',
      APIKey: this.apiKey,
      Nonce: nonce,
      Authent: authent,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': data.length,
    }
    const requestOptions = {
      url: this.baseUrl + endpoint,
      method: 'POST',
      headers,
      body: data,
      timeout: this.timeout,
    }
    return makeRequest(requestOptions, 'sendOrder(): ')
  }

  /**
   * Edit order.
   */
  editOrder(edit) {
    const endpoint = '/derivatives/api/v3/editorder'
    const nonce = createNonce()
    const data = qs.encode(edit)
    const authent = this.signRequest(endpoint, nonce, data)
    const headers = {
      Accept: 'application/json',
      APIKey: this.apiKey,
      Nonce: nonce,
      Authent: authent,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': data.length,
    }
    const requestOptions = {
      url: this.baseUrl + endpoint,
      method: 'POST',
      headers,
      body: data,
      timeout: this.timeout,
    }
    return makeRequest(requestOptions, 'editOrder(): ')
  }

  /**
   * Cancel order.
   */
  cancelOrder(orderId, cliOrdId) {
    const endpoint = '/derivatives/api/v3/cancelorder'
    let data
    if (orderId) data = `order_id=${orderId}`
    else data = `cliOrdId=${cliOrdId}`
    const nonce = createNonce()
    const authent = this.signRequest(endpoint, nonce, data)
    const headers = {
      Accept: 'application/json',
      APIKey: this.apiKey,
      Nonce: nonce,
      Authent: authent,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': data.length,
    }
    const requestOptions = {
      url: this.baseUrl + endpoint,
      method: 'POST',
      headers,
      body: data,
      timeout: this.timeout,
    }
    return makeRequest(requestOptions, 'cancelOrder(): ')
  }

  /**
   * Cancel all orders.
   */
  cancelAllOrders(symbol = null) {
    const endpoint = '/derivatives/api/v3/cancelallorders'
    let data
    if (symbol) data = `symbol=${symbol}`
    const nonce = createNonce()
    const authent = this.signRequest(endpoint, nonce, data)
    const headers = {
      Accept: 'application/json',
      APIKey: this.apiKey,
      Nonce: nonce,
      Authent: authent,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': data.length,
    }
    const requestOptions = {
      url: this.baseUrl + endpoint,
      method: 'POST',
      headers,
      body: data,
      timeout: this.timeout,
    }
    return makeRequest(requestOptions, 'cancelAllOrders(): ')
  }

  /**
   * Cancel all orders after X seconds.
   */
  cancelAllOrdersAfter(timeout) {
    const endpoint = '/derivatives/api/v3/cancelallordersafter'
    let data
    if (timeout) data = `timeout=${timeout}`
    const nonce = createNonce()
    const authent = this.signRequest(endpoint, nonce, data)
    const headers = {
      Accept: 'application/json',
      APIKey: this.apiKey,
      Nonce: nonce,
      Authent: authent,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': data.length,
    }
    const requestOptions = {
      url: this.baseUrl + endpoint,
      method: 'POST',
      headers,
      body: data,
      timeout: this.timeout,
    }
    return makeRequest(requestOptions, 'cancelAllOrdersAfter(): ')
  }

  /**
   * Batch order.
   */
  batchOrder(elementJson) {
    const endpoint = '/derivatives/api/v3/batchorder'
    const data = `json=${JSON.stringify(elementJson)}`
    const nonce = createNonce()
    const authent = this.signRequest(endpoint, nonce, data)
    const headers = {
      Accept: 'application/json',
      APIKey: this.apiKey,
      Nonce: nonce,
      Authent: authent,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': data.length,
    }
    const requestOptions = {
      url: this.baseUrl + endpoint,
      method: 'POST',
      headers,
      body: data,
    }
    return makeRequest(requestOptions, 'batchOrder(): ')
  }

  /**
   * Returns all open orders.
   */
  getOpenOrders() {
    const endpoint = '/derivatives/api/v3/openorders'
    const nonce = createNonce()
    const authent = this.signRequest(endpoint, nonce)
    const headers = {
      Accept: 'application/json',
      APIKey: this.apiKey,
      Nonce: nonce,
      Authent: authent,
    }
    const requestOptions = {
      url: this.baseUrl + endpoint,
      method: 'GET',
      headers,
      timeout: this.timeout,
    }
    return makeRequest(requestOptions, 'getOpenOrders(): ')
  }

  /**
   * Returns all open positions.
   */
  getOpenPositions() {
    const endpoint = '/derivatives/api/v3/openpositions'
    const nonce = createNonce()
    const authent = this.signRequest(endpoint, nonce)
    const headers = {
      Accept: 'application/json',
      APIKey: this.apiKey,
      Nonce: nonce,
      Authent: authent,
    }
    const requestOptions = {
      url: this.baseUrl + endpoint,
      method: 'GET',
      headers,
      timeout: this.timeout,
    }
    return makeRequest(requestOptions, 'getOpenPositions(): ')
  }

  /**
   * Returns recent orders.
   */
  getRecentOrders(symbol = null) {
    const endpoint = '/derivatives/api/v3/recentorders'
    const params = symbol ? `symbol=${symbol}` : ''
    const nonce = createNonce()
    const authent = this.signRequest(endpoint, nonce, params)
    const headers = {
      Accept: 'application/json',
      APIKey: this.apiKey,
      Nonce: nonce,
      Authent: authent,
    }
    const requestOptions = {
      url: `${this.baseUrl}${endpoint}?${encodeURI(params)}`,
      method: 'GET',
      headers,
      timeout: this.timeout,
    }
    return makeRequest(requestOptions, 'getRecentOrders(): ')
  }

  /**
   * Returns filled orders.
   */
  getFills(lastFillTime = null) {
    const endpoint = '/derivatives/api/v3/fills'
    const params = lastFillTime ? `lastFillTime=${lastFillTime}` : ''
    const nonce = createNonce()
    const authent = this.signRequest(endpoint, nonce, params)
    const headers = {
      Accept: 'application/json',
      APIKey: this.apiKey,
      Nonce: nonce,
      Authent: authent,
    }
    const requestOptions = {
      url: `${this.baseUrl}${endpoint}?${encodeURI(params)}`,
      method: 'GET',
      headers,
      timeout: this.timeout,
    }
    return makeRequest(requestOptions, 'getFills(): ')
  }

  /**
   * Returns account log.
   */
  getAccountLog() {
    const endpoint = '/api/history/v2/account-log'
    const nonce = createNonce()
    const authent = this.signRequest(endpoint, nonce)
    const headers = {
      Accept: 'application/json',
      APIKey: this.apiKey,
      Nonce: nonce,
      Authent: authent,
    }
    const requestOptions = {
      url: `${this.baseUrl}${endpoint}`,
      method: 'GET',
      headers,
      timeout: this.timeout,
    }
    return makeRequest(requestOptions, 'getAccountLog(): ')
  }

  /**
   * Returns transfers.
   */
  getTransfers(lastTransferTime = null) {
    const endpoint = '/derivatives/api/v3/transfers'
    const nonce = createNonce()
    const params = lastTransferTime ? `lastTransferTime=${lastTransferTime}` : ''
    const authent = this.signRequest(endpoint, nonce, params)
    const headers = {
      Accept: 'application/json',
      APIKey: this.apiKey,
      Nonce: nonce,
      Authent: authent,
    }
    const requestOptions = {
      url: `${this.baseUrl}${endpoint}?${encodeURI(params)}`,
      method: 'GET',
      headers,
      timeout: this.timeout,
    }
    return makeRequest(requestOptions, 'getTransfers(): ')
  }

  /**
   * Returns notifications.
   */
  getNotifications() {
    const endpoint = '/derivatives/api/v3/notifications'
    const nonce = createNonce()
    const authent = this.signRequest(endpoint, nonce)
    const headers = {
      Accept: 'application/json',
      APIKey: this.apiKey,
      Nonce: nonce,
      Authent: authent,
    }
    const requestOptions = {
      url: this.baseUrl + endpoint,
      method: 'GET',
      headers,
      timeout: this.timeout,
    }
    return makeRequest(requestOptions, 'getNotifications(): ')
  }

  /**
   * Historical orders after a certain point in reverse chronological order.
   */
  getHistoricalOrders(since = 'None') {
    return this._getHistoricalElements('orders', since)
  }

  /**
   * Recent orders in reverse chronological order.
   */
//   getRecentOrders() {
//     return this.getHistoricalOrders(None)
//   }

  /**
   * Historical executions after a certain point in reverse chronological order.
   */
  getHistoricalExecutions(since) {
    return this._getHistoricalElements('executions', since)
  }

  /**
   * Recent executions in reverse chronological order.
   */
  getRecentExecutions() {
    return this.getHistoricalExecutions()
  }

  async _getHistoricalElements(elementType, since) {
    const elements = []

    let more = true
    let contToken

    while (more) {
      const { response, body } = await this._getPartialHistoricalElements(
        elementType,
        since,
        contToken
      )

      const els = JSON.parse(body).elements
      for (const el of els) {
        elements.push(el)
      }

      const isTrunc = response.headers['is-truncated']
      if (isTrunc === undefined || isTrunc === 'false') {
        more = false
        contToken = undefined
      } else {
        contToken = response.headers['next-continuation-token']
      }

      elements.sort((a, b) => b.timestamp - a.timestamp)
    }

    return { name: 'getHistory(): ', body: elements }
  }

  _getPartialHistoricalElements(elementType, since, continuationToken) {
    const params = continuationToken
      ? { continuationToken }
      : since
      ? { since }
      : undefined
    const paramsStr = params ? qs.stringify(params) : ''

    let endpoint = `/api/history/v2/${elementType}`
    const authent = this.signRequest(endpoint, undefined, paramsStr)

    if (paramsStr) {
      endpoint += '?' + paramsStr
    }

    const headers = {
      Accept: 'application/json',
      APIKey: this.apiKey,
      Authent: authent,
    }

    const requestOptions = {
      url: this.baseUrl + endpoint,
      method: 'GET',
      headers,
      timeout: this.timeout,
    }

    return makeRequest(requestOptions, 'getHistory(): ')
  }

  /**
   * Sign request.
   */
  signRequest(endpoint, nonce = '', postData = '') {
    // step 1: concatenate postData, nonce + endpoint
    if (endpoint.startsWith('/derivatives')) {
      endpoint = endpoint.slice('/derivatives'.length)
    }

    const message = postData + nonce + endpoint

    // Step 2: hash the result of step 1 with SHA256
    const hash = crypto.createHash('sha256').update(utf8.encode(message)).digest()

    // step 3: base64 decode apiPrivateKey
    const secretDecoded = Buffer.from(this.apiSecret, 'base64')

    // step 4: use result of step 3 to hash the result of step 2 with
    const hash2 = crypto.createHmac('sha512', secretDecoded).update(hash).digest()

    // step 5: base64 encode the result of step 4 and return
    return Buffer.from(hash2).toString('base64')
  }
}

function makeRequest(requestOptions, printName) {
  return new Promise((resolve, reject) => {
    requestOptions.headers['User-Agent'] = 'cf-api-js/1.0'

    request(requestOptions, function (error, response, body) {
      if (error) {
        reject(error)
      } else {
        resolve({ name: printName, response, body })
      }
    })
  })
}

// Generate nonce
let nonce = 0
function createNonce() {
  if (nonce === 9999) nonce = 0
  const timestamp = new Date().getTime()
  return timestamp + ('0000' + nonce++).slice(-5)
}

module.exports = {
  CfRestApiV3,
}
