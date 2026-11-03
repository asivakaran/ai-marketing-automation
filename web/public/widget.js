/*!
 * AutoPilot Marketing OS — website chat widget
 *
 * Embed on any website:
 *   <script src="https://app.yourdomain.com/widget.js" data-tenant="CLINK_apex"></script>
 *
 * Options:
 *   data-tenant     (required) tenant id shown in your dashboard settings page
 *   data-auto-open  "false" disables the 30-second auto-open
 *   data-app-origin override the app origin (rarely needed)
 *
 * Everything is inline-styled: zero CSS leakage into the host page.
 */
(function () {
  "use strict";

  var script =
    document.currentScript ||
    (function () {
      var all = document.getElementsByTagName("script");
      return all[all.length - 1];
    })();

  var TENANT = script && script.getAttribute("data-tenant");
  if (!TENANT) {
    console.error("[autopilot-widget] missing data-tenant attribute");
    return;
  }

  var AUTO_OPEN = (script && script.getAttribute("data-auto-open")) !== "false";
  var APP_ORIGIN =
    (script && script.getAttribute("data-app-origin")) ||
    (script && new URL(script.src, location.href).origin) ||
    location.origin;

  var DEFAULT_BRAND = { name: "Chat with us", brandColor: "#1e293b", logoUrl: null };
  var brand = DEFAULT_BRAND;

  // Preserves the sandbox preview gateway param — no-op on normal deployments.
  function withGateway(path) {
    try {
      var u = new URL(path, APP_ORIGIN);
      var qp = new URLSearchParams(location.search).get("XTransformPort");
      if (qp) u.searchParams.set("XTransformPort", qp);
      return u.toString();
    } catch (e) {
      return APP_ORIGIN + path;
    }
  }

  var isMobile = window.matchMedia("(max-width: 640px)");
  var opened = false;
  var interacted = false; // user clicked or closed — stops the auto-open
  var timerId = null;
  var button = null;
  var frame = null;

  function applyBranding(b) {
    brand = { name: b.name || DEFAULT_BRAND.name, brandColor: b.brandColor || DEFAULT_BRAND.brandColor, logoUrl: b.logoUrl || null };
    if (button) button.style.background = brand.brandColor;
    if (frame && frame.contentWindow) {
      try {
        frame.contentWindow.postMessage({ type: "autopilot-widget-branding", brand: brand }, "*");
      } catch (e) {}
    }
  }

  function fetchBranding() {
    fetch(withGateway("/api/widget?tenantId=" + encodeURIComponent(TENANT)))
      .then(function (r) {
        return r.json();
      })
      .then(function (j) {
        if (j && j.success && j.data) applyBranding(j.data);
      })
      .catch(function () {
        /* offline — keep default branding */
      });
  }

  function createButton() {
    button = document.createElement("button");
    button.id = "autopilot-widget-button";
    button.setAttribute("aria-label", "Open chat");
    button.type = "button";
    var s = button.style;
    s.position = "fixed";
    s.right = "24px";
    s.bottom = "24px";
    s.width = "60px";
    s.height = "60px";
    s.borderRadius = "999px";
    s.border = "none";
    s.cursor = "pointer";
    s.background = brand.brandColor;
    s.zIndex = "999998";
    s.boxShadow = "0 8px 24px rgba(15,23,42,.35)";
    s.transition = "transform .18s ease, box-shadow .18s ease";
    s.display = "flex";
    s.alignItems = "center";
    s.justifyContent = "center";
    s.padding = "0";
    s.outline = "none";
    button.innerHTML =
      '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
    button.addEventListener("mouseenter", function () {
      s.transform = "scale(1.06)";
      s.boxShadow = "0 12px 32px rgba(15,23,42,.42)";
    });
    button.addEventListener("mouseleave", function () {
      s.transform = "scale(1)";
      s.boxShadow = "0 8px 24px rgba(15,23,42,.35)";
    });
    button.addEventListener("click", function () {
      interacted = true;
      if (timerId) clearTimeout(timerId);
      toggle();
    });
    (document.body || document.documentElement).appendChild(button);
  }

  function createFrame() {
    frame = document.createElement("iframe");
    frame.id = "autopilot-widget-frame";
    frame.title = brand.name + " — chat";
    var s = frame.style;
    s.position = "fixed";
    s.right = "24px";
    s.bottom = "96px";
    s.width = "380px";
    s.height = "600px";
    s.maxWidth = "calc(100vw - 48px)";
    s.border = "none";
    s.borderRadius = "18px";
    s.boxShadow = "0 24px 64px rgba(15,23,42,.35)";
    s.background = "#fff";
    s.zIndex = "999999";
    s.display = "none";
    s.opacity = "0";
    s.transform = "translateY(12px) scale(.98)";
    s.transition = "opacity .2s ease, transform .2s ease";
    frame.setAttribute("allow", "clipboard-write");
    frame.src = withGateway("/widget/" + encodeURIComponent(TENANT));
    (document.body || document.documentElement).appendChild(frame);
  }

  function sizeForViewport() {
    if (!frame) return;
    var s = frame.style;
    if (isMobile.matches) {
      s.right = "0";
      s.bottom = "0";
      s.width = "100vw";
      s.height = "100dvh";
      s.maxWidth = "100vw";
      s.borderRadius = "0";
      if (button) button.style.bottom = "16px";
    } else {
      s.right = "24px";
      s.bottom = "96px";
      s.width = "380px";
      s.height = "600px";
      s.maxWidth = "calc(100vw - 48px)";
      s.borderRadius = "18px";
      if (button) button.style.bottom = "24px";
    }
  }

  function open() {
    if (opened || !frame) return;
    opened = true;
    sizeForViewport();
    frame.style.display = "block";
    requestAnimationFrame(function () {
      frame.style.opacity = "1";
      frame.style.transform = "translateY(0) scale(1)";
    });
    try {
      frame.contentWindow.focus();
    } catch (e) {}
  }

  function close() {
    if (!opened || !frame) return;
    opened = false;
    frame.style.opacity = "0";
    frame.style.transform = "translateY(12px) scale(.98)";
    setTimeout(function () {
      frame.style.display = "none";
    }, 210);
  }

  function toggle() {
    if (opened) close();
    else open();
  }

  window.addEventListener("message", function (ev) {
    if (ev.data && ev.data.type === "autopilot-widget-close") {
      interacted = true;
      if (timerId) clearTimeout(timerId);
      close();
    }
  });

  if (isMobile.addEventListener) isMobile.addEventListener("change", sizeForViewport);

  // boot
  createButton();
  createFrame();
  fetchBranding();
  if (AUTO_OPEN) {
    timerId = setTimeout(function () {
      if (!interacted && !opened) open();
    }, 30000);
  }
})();
