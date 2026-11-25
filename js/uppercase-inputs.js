/* ChurchRecords: automatically keep user-entered form text in uppercase.
   Email addresses and passwords are intentionally excluded. */
(function () {
  function shouldUppercase(el) {
    if (!el || el.disabled || el.readOnly) return false;
    if (el.matches('textarea')) return true;
    if (!el.matches('input')) return false;
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    return !['password', 'email', 'hidden', 'checkbox', 'radio', 'button', 'submit',
      'reset', 'file', 'date', 'datetime-local', 'month', 'week', 'time', 'number',
      'range', 'color'].includes(type);
  }
  document.addEventListener('input', function (event) {
    const el = event.target;
    if (!shouldUppercase(el)) return;
    const start = el.selectionStart, end = el.selectionEnd;
    const upper = el.value.toLocaleUpperCase();
    if (el.value !== upper) {
      el.value = upper;
      try { if (start !== null && end !== null) el.setSelectionRange(start, end); } catch (_) {}
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, true);
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('select option').forEach(function (option) {
      if (option.textContent) option.textContent = option.textContent.toLocaleUpperCase();
    });
    document.querySelectorAll('input:not([type="password"]):not([type="email"]), textarea')
      .forEach(function (el) {
        if (shouldUppercase(el) && el.value) el.value = el.value.toLocaleUpperCase();
      });
  });
  // Uppercase dynamically added dropdown labels as well.
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        if (node.matches && node.matches('option') && node.textContent)
          node.textContent = node.textContent.toLocaleUpperCase();
        if (node.querySelectorAll) node.querySelectorAll('option').forEach(function (option) {
          if (option.textContent) option.textContent = option.textContent.toLocaleUpperCase();
        });
      });
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
