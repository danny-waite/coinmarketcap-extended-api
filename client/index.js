import request from 'request-promise-native'
import cheerio from 'cheerio'
import { fromPairs } from './utils'

export async function coinFromTicker(ticker, options) {
  await refreshCacheIfOld(options)
  const coin = cache.byTicker.get(ticker)
  if (!coin) { return null; }
  const markets = await getMarkets(coin.id)
  return {
    ...coin,
    markets,
  }
}

export async function idFromTicker(ticker, options) {
  const coin = await coinFromTicker(ticker, options)
  if (!coin) { return null; }
  return coin.id
}

export async function getMarkets(id) {
  try {
    const html = await request(getUrlFromId(id))
    const $ = cheerio.load(html)
    const marketsRow = $('#markets-table > tbody tr').get()
    const rawMarketsHtml = marketsRow.map(r => $(r).children().get())
    const columns = [
      [],
      ['exchange', c =>
        c.text().trim()],
      ['pair', c =>
        ({ pair: c.text().trim(), url: c.find('a').attr('href'), })],
      ['volumeUsd', c =>
        Math.floor(parseFloat(c.find('span').data('usd')))],
      ['priceUsd', c =>
        Math.floor(parseFloat(c.find('span').data('usd')))],
      ['volumePercent', c =>
        (/([0-9]{0,3}\.[0-9]+)%/.exec(c.text().trim()) || [, c.text().trim()])[1]],
      [],
    ]

    const markets = rawMarketsHtml
      .map(row =>
        columns
        .map(([ column, transform ]=[], i) => column &&
          [ column, transform($(row[i])) ])
        .filter(a => a)
      )
      .map(fromPairs)
      .map(market => ({
        ...market,
        pair: market.pair.pair,
        url: market.pair.url,
      }))

    return markets
  } catch(e) {
    console.error(e)
  }
}

export async function getMarketsFromTicker(ticker) {
  const id = await idFromTicker(ticker)
  if (!id) { return null; }
  return await getMarkets(id)
}

export { default as default } from './CoinMarketCap'