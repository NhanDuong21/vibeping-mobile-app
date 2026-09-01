(() => {
  const fallback = Object.freeze({
    title: "VibePing",
    body: "VibePing có thông báo mới.",
    tag: "vibeping-gate0",
    url: "/",
  });

  function text(value, defaultValue, maxLength) {
    return typeof value === "string" && value.trim()
      ? value.trim().slice(0, maxLength)
      : defaultValue;
  }

  function normalize(value) {
    if (typeof value === "string") {
      return { ...fallback, body: text(value, fallback.body, 240) };
    }
    const input = value && typeof value === "object" ? value : {};
    const candidateUrl = text(input.url, fallback.url, 512);
    return {
      title: text(input.title, fallback.title, 80),
      body: text(input.body, fallback.body, 240),
      tag: text(input.tag, fallback.tag, 80),
      url: candidateUrl.startsWith("/") && !candidateUrl.startsWith("//") ? candidateUrl : "/",
      timestamp: Number.isFinite(Number(input.timestamp)) ? Number(input.timestamp) : Date.now(),
    };
  }

  globalThis.VibePingPush = Object.freeze({ normalize });
})();
