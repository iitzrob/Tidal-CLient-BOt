const store = new Map();

// returns seconds left (0 = ok) and starts the cooldown if ok
module.exports = (key, ms) => {
  const left = ms - (Date.now() - (store.get(key) || 0));
  if (left > 0) return Math.ceil(left / 1000);
  store.set(key, Date.now());
  return 0;
};
