const DISCOUNT_RATE = 0.25;
const round3 = (v) => Math.round((Number(v) || 0) * 1000) / 1000;
const lineTotal = (price, qty) => round3((Number(price) || 0) * (Number(qty) || 1) * (1 - DISCOUNT_RATE));
const payableOf = (items) => round3((items || []).reduce((s, i) => s + lineTotal(i.priceNum, i.quantity), 0));
const subtotalOf = (items) => round3((items || []).reduce((s, i) => s + (Number(i.priceNum) || 0) * (Number(i.quantity) || 1), 0));
module.exports = { DISCOUNT_RATE, round3, lineTotal, payableOf, subtotalOf };