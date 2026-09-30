import { calculateRestValuePC } from './calculateRestValuePC.js'

// Highest amount a product line may have.
export const MAX_PRODUCT_PRICE = 5000

// Products whose price is worked out here, not taken from product.price.
// A new one: create it under Innstillinger, add its _id here and its rule in productPrice().
export const PRODUCT = {
  buyOutPC: '69bd4c20e7d203bdae952250',
  egenandel: '69d7d4c3d9ab0462f2ef38fb',
  restverdi: '6a216481d8650085b998a23d',
  yearlyRent: '6a9eae8f4d0dd6ed3d8de53f'
}

// Only administrators may invoice these.
export const ADMIN_ONLY_PRODUCTS = [PRODUCT.buyOutPC, PRODUCT.egenandel, PRODUCT.restverdi]

export const isCalculatedProduct = (id) => Object.values(PRODUCT).includes(id)

/**
 * Whether the elev gets the reduced price: on the exception list by fnr, or by class.
 * Same rule as returnCorrectPriceForStudent in azf-elevkontrakt.
 */
export const hasReducedPrice = (settings, elevInfo) => {
  const exceptions = settings?.exceptionsFromRegularPrices ?? {}
  if ((exceptions.students ?? []).some(s => s.fnr === elevInfo?.fnr)) return true
  return (exceptions.classes ?? []).some(c => c.className === elevInfo?.klasse)
}

// Price of one rate. The backend sets the final price when the invoice is sent at 01:00.
export const ratePrice = (settings, elevInfo) => {
  const prices = settings?.prices ?? {}
  return parseInt(hasReducedPrice(settings, elevInfo) ? prices.reducedPrice : prices.regularPrice, 10)
}

const toNumber = (value) => {
  if (value === undefined || value === null || String(value).trim() === '') return null
  return parseInt(String(value).replace(/\s/g, ''), 10)
}

/**
 * Price of a product for this elev, and how it was worked out.
 * values holds what the user typed into the product's empty extra fields.
 * @returns {{ price: Number|null, how: String }} price is null while a required amount is missing
 */
export const productPrice = (product, values, settings, elevInfo) => {
  const field = (key) => values?.[key] ?? product[key]
  switch (product._id) {
    case PRODUCT.buyOutPC: {
      // The purchase price is on the product, or typed in when the product leaves it empty.
      const total = toNumber(field('Innkjøpspris PC'))
      if (total === null) return { price: null, how: 'Regnes ut fra innkjøpsprisen', required: 'Innkjøpspris PC' }
      if (Number.isNaN(total)) return { price: NaN, how: '' }
      const grade = elevInfo?.trinn
      const share = { VG1: 'hele', VG2: '2/3 av', VG3: '1/3 av' }[grade]
      const price = calculateRestValuePC(total, grade)
      return { price, how: share ? `${share} innkjøpspris kr ${total} (${grade})` : 'Trinnet er ukjent, så restverdien kan ikke regnes ut' }
    }
    case PRODUCT.egenandel:
      return { price: toNumber(field('Egenandel')), how: 'Beløpet du fyller inn', required: 'Egenandel' }
    case PRODUCT.restverdi:
      return { price: toNumber(field('Restverdi')), how: 'Beløpet du fyller inn', required: 'Restverdi' }
    case PRODUCT.yearlyRent:
      return { price: ratePrice(settings, elevInfo), how: hasReducedPrice(settings, elevInfo) ? 'Redusert pris' : 'Ordinær pris' }
    default:
      return { price: toNumber(product.price), how: '' }
  }
}

/**
 * Whether a product can be added. 0 kr and more than MAX_PRODUCT_PRICE are blocked.
 * @returns {{ ok: Boolean, level?: 'need'|'block', message?: String }}
 */
export const checkProductPrice = ({ price, required }) => {
  if (price === null) return { ok: false, level: 'need', message: `Fyll inn ${String(required).toLowerCase()} for å legge til.` }
  if (Number.isNaN(price)) return { ok: false, level: 'block', message: 'Beløpet må være et tall.' }
  if (price === 0) return { ok: false, level: 'block', message: 'Prisen blir kr 0. En faktura på kr 0 kan ikke sendes. Kontakt support hvis du mener prisen er feil.' }
  if (price > MAX_PRODUCT_PRICE) return { ok: false, level: 'block', message: `kr ${price} er over grensen på kr ${MAX_PRODUCT_PRICE} og kan ikke faktureres. Sjekk beløpet, eller kontakt support hvis det skal være høyere.` }
  return { ok: true }
}
