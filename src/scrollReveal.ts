let OBS: IntersectionObserver | null = null;
let MO: MutationObserver | null = null;

export function initScrollReveal() {
  if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return;

  if (OBS) OBS.disconnect();
  if (MO) MO.disconnect();

  OBS = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("aos-animate");
          OBS?.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
  );

  document.querySelectorAll("[data-aos]").forEach((el) => {
    const delay = el.getAttribute("data-aos-delay");
    if (delay) (el as HTMLElement).style.transitionDelay = delay + "ms";
    OBS?.observe(el);
  });

  MO = new MutationObserver(() => {
    document.querySelectorAll("[data-aos]:not(.aos-animate)").forEach((el) => {
      OBS?.observe(el);
    });
  });
  MO.observe(document.body, { childList: true, subtree: true });
}

export function destroyScrollReveal() {
  OBS?.disconnect();
  OBS = null;
  MO?.disconnect();
  MO = null;
}
