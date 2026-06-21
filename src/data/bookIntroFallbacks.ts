import { BOOKS, findBookByAbbr, type BibleBook } from "@/data/books";
import type { BookIntroduction } from "@/lib/bible/api";

/** Brief publisher-style book intros when API.Bible has no *.intro chapter. */
const BOOK_INTRO_HTML: Record<string, string> = {
  Gen: "<p>Genesis tells how God created the heavens and the earth, how sin entered the world, and how he chose Abraham’s family to bless all nations. Key themes include creation, covenant, and the beginnings of Israel’s story.</p>",
  Exo: "<p>Exodus recounts Israel’s deliverance from Egypt, the giving of the Law at Sinai, and the instructions for the tabernacle. It shows God as redeemer and the formation of his covenant people.</p>",
  Lev: "<p>Leviticus explains how a holy God dwells among a sinful people through sacrifice, priesthood, and purity laws. It prepares Israel for worship and points toward atonement.</p>",
  Num: "<p>Numbers follows Israel in the wilderness from Sinai toward Canaan, including census, rebellion, and God’s sustaining provision. It highlights faith, judgment, and the journey to the promised land.</p>",
  Deu: "<p>Deuteronomy restates the Law for a new generation before entering Canaan. Moses calls Israel to love God wholeheartedly and choose life under the covenant.</p>",
  Jos: "<p>Joshua records the conquest and division of the promised land under Joshua’s leadership. It emphasizes God’s faithfulness to his promises and the call to covenant loyalty.</p>",
  Jdg: "<p>Judges describes cycles of sin, oppression, deliverance, and decline in Israel before the monarchy. It shows the need for righteous leadership and dependence on God.</p>",
  Rut: "<p>Ruth is a story of loyal love set in the period of the judges. Through Ruth and Boaz, God’s kindness extends beyond Israel to include the nations in the line of David.</p>",
  "1Sa": "<p>First Samuel traces Israel’s transition from judges to monarchy, focusing on Samuel, Saul, and the rise of David. It explores what it means for God to be Israel’s true king.</p>",
  "2Sa": "<p>Second Samuel follows David’s reign—his victories, failures, and the promise of an enduring dynasty. It mixes political history with deep theology of grace and consequence.</p>",
  "1Ki": "<p>First Kings opens with Solomon’s glory and temple, then charts the kingdom’s division and the prophetic ministries of Elijah and others. Wisdom and idolatry stand in sharp contrast.</p>",
  "2Ki": "<p>Second Kings continues the history of divided Israel and Judah until exile. Prophets call kings and people back to covenant faithfulness amid national collapse.</p>",
  "1Ch": "<p>First Chronicles retells Israel’s history from Adam to David with a focus on worship and the temple. Genealogies and David’s reign highlight God’s ongoing plan.</p>",
  "2Ch": "<p>Second Chronicles emphasizes Judah’s kings, the temple, and reform movements. It ends with exile and Cyrus’s decree, pointing toward restoration.</p>",
  Ezr: "<p>Ezra tells of the return from exile and rebuilding the temple. It stresses Scripture, repentance, and reordering community life around God’s word.</p>",
  Neh: "<p>Nehemiah recounts rebuilding Jerusalem’s walls and renewing the covenant. Leadership, prayer, and practical reform go together in restoring the nation.</p>",
  Est: "<p>Esther shows God’s hidden providence preserving the Jews in the Persian empire. Courage and timing deliver his people when human hope seems lost.</p>",
  Job: "<p>Job wrestles with innocent suffering and the mystery of God’s wisdom. The dialogue probes justice, creation, and humble trust beyond easy answers.</p>",
  Psa: "<p>Psalms is Israel’s prayer and praise book—laments, thanksgivings, royal psalms, and wisdom songs. It gives voice to every season of faith before God.</p>",
  Pro: "<p>Proverbs collects practical wisdom for living under God’s fear. Short sayings and longer poems train the heart as well as the mind.</p>",
  Ecc: "<p>Ecclesiastes reflects on life “under the sun,” testing pleasure, work, and wisdom. It concludes that meaning is found in fearing God and keeping his commands.</p>",
  Sng: "<p>Song of Songs celebrates married love in vivid poetry. Historically it has also been read as an allegory of God’s love for his people.</p>",
  Isa: "<p>Isaiah proclaims judgment and hope for Judah and the nations. Messianic visions, holy kingship, and the suffering servant shape much of the book’s message.</p>",
  Jer: "<p>Jeremiah warns of coming exile for persistent idolatry yet promises a new covenant written on the heart. His costly ministry spans Judah’s final decades.</p>",
  Lam: "<p>Lamentations grieves the destruction of Jerusalem in five poetic acrostics. Honest sorrow meets hope that God’s steadfast love will not end.</p>",
  Ezk: "<p>Ezekiel prophesies during exile with striking visions and symbolic acts. God’s glory, judgment, and future restoration of a new temple dominate the book.</p>",
  Dan: "<p>Daniel shows faithfulness in Babylonian and Persian courts alongside apocalyptic visions of kingdoms and the Son of Man. God rules history even in exile.</p>",
  Hos: "<p>Hosea uses marriage imagery to depict Israel’s unfaithfulness and God’s pursuing love. Judgment and compassion intertwine in this northern-kingdom prophecy.</p>",
  Jol: "<p>Joel calls Judah to lament a locust disaster and the coming day of the Lord. Repentance opens the way to renewed Spirit outpouring and deliverance.</p>",
  Amo: "<p>Amos condemns social injustice and empty religion in Israel. True worship requires righteousness and justice for the vulnerable.</p>",
  Oba: "<p>Obadiah pronounces judgment on Edom for violence against Judah. The shortest OT book affirms that the kingdom belongs to the Lord.</p>",
  Jon: "<p>Jonah tells of a reluctant prophet sent to Nineveh. God’s mercy toward enemies challenges narrow nationalism and displays compassionate sovereignty.</p>",
  Mic: "<p>Micah blends warnings of judgment with promises of a ruler from Bethlehem. What the Lord requires is justice, mercy, and humble walking with God.</p>",
  Nam: "<p>Nahum announces Nineveh’s fall, comforting Judah that oppressive power will not last. The Lord is slow to anger yet sure in justice.</p>",
  Hab: "<p>Habakkuk questions injustice and learns to live by faith while awaiting judgment. The book ends with a confession of trust despite hardship.</p>",
  Zep: "<p>Zephaniah warns of the day of the Lord and calls for humility before God. A remnant will be purified and rejoice when the Lord restores his people.</p>",
  Hag: "<p>Haggai urges returned exiles to prioritize rebuilding the temple. Obedience and courage bring blessing as God’s house is restored.</p>",
  Zec: "<p>Zechariah encourages temple rebuilding with night visions and messianic hope. Future restoration, cleansing, and the coming king animate the prophecy.</p>",
  Mal: "<p>Malachi addresses spiritual apathy after the exile. The Lord calls for sincere worship and promises a messenger before the great day of the Lord.</p>",
  Mat: "<p>Matthew presents Jesus as the promised Messiah and teacher-king who fulfills the Law and the Prophets. The Gospel emphasizes discipleship, kingdom ethics, and Jesus’ death and resurrection.</p>",
  Mrk: "<p>Mark portrays Jesus as the suffering servant and powerful Son of God on the move. Action, urgency, and the cross stand at the center of discipleship.</p>",
  Luk: "<p>Luke emphasizes Jesus’ compassion for outsiders, women, and the poor. Careful historical narrative leads from birth to ascension with joy and prayer.</p>",
  Jhn: "<p>John’s Gospel signs and discourses reveal Jesus as the Word made flesh. Belief in the Son brings eternal life through his cross and resurrection.</p>",
  Act: "<p>Acts continues Luke’s story as the risen Christ sends the Spirit and the church spreads from Jerusalem to Rome. Mission, persecution, and bold witness mark the early believers.</p>",
  Rom: "<p>Romans sets out the gospel of righteousness by faith for Jews and Gentiles alike. Deep theology of sin, grace, and new life in Christ shapes Christian teaching.</p>",
  "1Co": "<p>First Corinthians addresses division, ethics, and worship in a gifted but troubled church. Paul points to the cross and resurrection as the foundation of unity.</p>",
  "2Co": "<p>Second Corinthians is a personal, passionate defense of Paul’s apostolic ministry. Weakness, reconciliation, and generous giving reflect the gospel Paul preaches.</p>",
  Gal: "<p>Galatians insists that believers are justified by faith, not law-keeping. Freedom in Christ rejects legalism while producing Spirit-led love.</p>",
  Eph: "<p>Ephesians celebrates the church as Christ’s body united in one new humanity. Cosmic reconciliation leads to practical holiness in everyday relationships.</p>",
  Php: "<p>Philippians is a letter of joy from prison, thanking a partner church and urging humility modeled on Christ. Contentment and gospel partnership shine through.</p>",
  Col: "<p>Colossians exalts the supremacy of Christ over all powers and wisdom. Fullness in him calls believers to put off the old self and live renewed lives.</p>",
  "1Th": "<p>First Thessalonians encourages a young church in hope, holiness, and love as they await the Lord’s return. Paul’s affectionate tone models pastoral care.</p>",
  "2Th": "<p>Second Thessalonians corrects misunderstandings about the day of the Lord and idleness. Steadfast faith and diligent work go together while waiting for Christ.</p>",
  "1Ti": "<p>First Timothy guides church order, sound teaching, and leadership character. Paul instructs Timothy to guard the gospel in Ephesus amid false teachers.</p>",
  "2Ti": "<p>Second Timothy is Paul’s final charge to his protégé: preach the word, endure hardship, and entrust truth to faithful people. It is a testament to gospel perseverance.</p>",
  Tit: "<p>Titus outlines qualifications for elders and godly living on Crete. Good works should adorn the doctrine of God our Savior in every community.</p>",
  Phm: "<p>Philemon is a personal appeal for Onesimus, a runaway slave now a brother in Christ. Reconciliation and forgiveness embody the gospel in domestic life.</p>",
  Heb: "<p>Hebrews shows Jesus as superior high priest and perfect sacrifice who fulfills the old covenant. Persevering faith looks to him amid pressure and weariness.</p>",
  Jas: "<p>James insists that genuine faith produces wise, merciful action. Practical religion cares for the poor and tames the tongue.</p>",
  "1Pe": "<p>First Peter encourages believers facing hostility to hope in Christ’s example and return. Holy living witnesses to the grace that has called them.</p>",
  "2Pe": "<p>Second Peter warns against false teachers and scoffers while affirming the trustworthiness of apostolic witness. Growth in virtue keeps believers stable until the new heavens and earth.</p>",
  "1Jn": "<p>First John tests true fellowship with God through love, obedience, and belief in the incarnate Son. Assurance grows as believers walk in the light.</p>",
  "2Jn": "<p>Second John commends truth and love while refusing hospitality to deceivers who deny Christ. Faithfulness to the gospel protects the church.</p>",
  "3Jn": "<p>Third John praises Gaius for supporting traveling missionaries and rebukes Diotrephes for selfish leadership. Truth and hospitality advance the gospel.</p>",
  Jud: "<p>Jude urges contending for the faith against infiltrators who distort grace. God is able to keep believers from stumbling as they wait for mercy.</p>",
  Rev: "<p>Revelation unveils the risen Christ reigning over history and judging evil. Visions of worship, conflict, and new creation call churches to endure in hope.</p>",
};

function genericIntro(book: BibleBook): string {
  const kind =
    book.section === "law"
      ? "the Law"
      : book.section === "poetry"
        ? "poetry and wisdom"
        : book.section === "prophets"
          ? "prophecy"
          : book.section === "gospels"
            ? "the Gospel"
            : book.section === "epistles"
              ? "an apostolic letter"
              : "Scripture";
  return `<p>${book.name} is part of ${kind} in the ${book.testament === "OT" ? "Old" : "New"} Testament (${book.chapters} chapters). Read it alongside cross-references and notes from your selected translation.</p>`;
}

export function fallbackBookIntroduction(bookAbbr: string): BookIntroduction | null {
  const book = findBookByAbbr(bookAbbr);
  if (!book) return null;
  const html = BOOK_INTRO_HTML[bookAbbr] ?? genericIntro(book);
  return { title: book.name, html };
}

export function hasFallbackBookIntroduction(bookAbbr: string): boolean {
  return BOOKS.some((b) => b.abbr === bookAbbr);
}
