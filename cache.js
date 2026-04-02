const store = new Map();

function setCache(key, data, ttl) {
  store.set(key, {
    data,
    expire: Date.now() + ttl * 1000
  });
}

function getCache(key) {
  const item = store.get(key);
  if (!item) return null;

  if (Date.now() > item.expire) {
    store.delete(key);
    return null;
  }

  return item.data;
}

module.exports = { setCache, getCache };
