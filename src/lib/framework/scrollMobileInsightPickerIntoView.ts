export function scrollMobileInsightPickerIntoView(scroller: HTMLElement | null) {
  if (!scroller) return;
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const target = document.getElementById("key-insights");
      if (!target || !scroller.contains(target)) {
        scroller.scrollTo({ top: 0, behavior: "auto" });
        return;
      }
      const scrollerRect = scroller.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const paddingTop = parseFloat(getComputedStyle(scroller).paddingTop) || 0;
      const top = Math.max(0, scroller.scrollTop + targetRect.top - scrollerRect.top - paddingTop);
      scroller.scrollTo({ top, behavior: "auto" });
    });
  });
}
