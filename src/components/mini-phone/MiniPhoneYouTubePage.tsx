/** YouTube inside the mini phone — mobile site in a full-height iframe. */
export function MiniPhoneYouTubePage() {
  return (
    <iframe
      title="YouTube"
      src="https://m.youtube.com"
      className="h-full w-full border-0 bg-black"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}
