/** Responsive storybook body copy — scales down as text grows. */
export function childrenBookBodyClassName(body: string): string {
  const length = body.trim().length;

  if (length > 260) {
    return "text-[1.05rem] leading-[1.58] sm:text-[1.14rem] sm:leading-[1.62]";
  }
  if (length > 180) {
    return "text-[1.14rem] leading-[1.62] sm:text-[1.22rem] sm:leading-[1.66]";
  }
  if (length > 120) {
    return "text-[1.22rem] leading-[1.66] sm:text-[1.3rem] sm:leading-[1.7]";
  }

  return "text-[1.3rem] leading-[1.68] sm:text-[1.4rem] sm:leading-[1.72]";
}

/** Overlay copy on full-bleed art — slightly larger for legibility. */
export function childrenBookOverlayBodyClassName(body: string): string {
  const length = body.trim().length;

  if (length > 220) {
    return "text-[1.08rem] leading-[1.58] sm:text-[1.16rem] sm:leading-[1.62]";
  }

  return "text-[1.16rem] leading-[1.62] sm:text-[1.26rem] sm:leading-[1.66]";
}
