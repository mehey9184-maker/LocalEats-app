const origReject = Promise.reject;
Promise.reject = function(reason) {
  console.log("Promise.reject called with:", reason, new Error().stack);
  return origReject.call(this, reason);
};
