import { geographyPrecisionLabel, geographyReaderHref, geographyReferenceLabel, geographyReferences, geographyStatus, googleEarthHref, type GeographyCandidate, type GeographyPlace, type GeographyTranslation } from "./geography";

export function escapeGeographyXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!);
}

/** Export reference points, retaining alternative identifications and uncertainty. */
export function geographyKml(places: GeographyPlace[], title: string, translation: GeographyTranslation, readerOrigin: string): string {
  const origin = new URL(readerOrigin);
  if (!["http:", "https:"].includes(origin.protocol)) throw new Error("Invalid reader origin");
  const xml = escapeGeographyXml;
  const folders = places.map((place) => {
    const references = geographyReferences(place, translation);
    const reading = references.slice(0, 24).map(geographyReferenceLabel).join("; ");
    const back = references.length ? `${origin.origin}${geographyReaderHref(references[0])}` : `${origin.origin}/bible/earth`;
    const description = (candidate?: GeographyCandidate) => xml([
      `<p>${xml(place.name)} — ${xml(geographyStatus(place))}</p>`,
      candidate ? `<p>${xml(candidate.description)}<br/>${xml(geographyPrecisionLabel(candidate))}<br/>OpenBible source score: ${candidate.score ?? "unscored"} / 1000. Not an independently verified probability.</p>` : "<p>See individual candidates. If none are listed, no coordinate is supplied.</p>",
      `<p>${xml(reading)}</p>`,
      `<p>${xml(place.unresolved.map((item) => item.description).join("; "))}</p>`,
      `<p><a href="${xml(place.sourceUrl)}">Identification sources</a> · <a href="${xml(back)}">Read in YourBible</a></p>`,
      "<p>OpenBible.info, CC BY 4.0. Includes OpenStreetMap contributors, ODbL 1.0. Modern imagery is not biblical-era imagery.</p>",
    ].join(""));
    const placemarks = place.candidates.map((candidate) => {
      googleEarthHref(candidate); // Validate both coordinates before emitting geometry.
      const range = candidate.coordinateKind === "point" ? 6000 : Math.min(5000000, Math.max(30000, (candidate.radiusMeters ?? 20000) * 3));
      const label = `${place.name} — ${candidate.name}${candidate.score === 1000 ? "" : " (candidate)"}`;
      return `<Placemark id="${xml(candidate.id)}"><name>${xml(label)}</name><description>${description(candidate)}</description><styleUrl>#${candidate.score === 1000 ? "high" : "candidate"}</styleUrl><LookAt><longitude>${candidate.lon}</longitude><latitude>${candidate.lat}</latitude><altitude>0</altitude><heading>0</heading><tilt>35</tilt><range>${range}</range><altitudeMode>clampToGround</altitudeMode></LookAt><Point><coordinates>${candidate.lon},${candidate.lat},0</coordinates></Point></Placemark>`;
    }).join("");
    return `<Folder><name>${xml(place.name)}</name><description>${description()}</description>${placemarks}</Folder>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${xml(title)}</name><description>Derived by YourBible from OpenBible.info (CC BY 4.0), including OpenStreetMap contributors (ODbL 1.0). Candidate locations and approximate reference points are not proven event sites. No speculative travel paths are drawn. References: ${xml(translation.toUpperCase())}.</description><Style id="high"><IconStyle><color>ff57a86c</color><scale>0.8</scale></IconStyle></Style><Style id="candidate"><IconStyle><color>ff32b8ed</color><scale>0.7</scale></IconStyle></Style>${folders}</Document></kml>`;
}

export function downloadGeographyKml(places: GeographyPlace[], title: string, translation: GeographyTranslation): void {
  const blob = new Blob([geographyKml(places, title, translation, window.location.origin)], { type: "application/vnd.google-earth.kml+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.kml`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
