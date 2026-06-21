/**
 * Classic Bible illustration plates — public-domain artwork keyed to passages.
 * Images hosted on Wikimedia Commons (Doré, historic Bible panoramas, etc.).
 */
export interface BiblePlate {
  id: string;
  bookAbbr: string;
  chapter: number;
  /** Insert before this verse in the reading stream (1 = chapter opener). */
  beforeVerse: number;
  title: string;
  referenceLabel: string;
  imageUrl: string;
  alt: string;
  artist?: string;
}

export const BIBLE_PLATES: BiblePlate[] = [
  {
    id: "gen-1-creation",
    bookAbbr: "Gen",
    chapter: 1,
    beforeVerse: 1,
    title: "The Creation of Light",
    referenceLabel: "Genesis 1:3",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/001.The_Creation_of_Light.jpg/960px-001.The_Creation_of_Light.jpg",
    alt: "God separates light from darkness at creation",
    artist: "Gustave Doré",
  },
  {
    id: "exo-14-red-sea",
    bookAbbr: "Exo",
    chapter: 14,
    beforeVerse: 1,
    title: "The Egyptians Drown in the Sea",
    referenceLabel: "Exodus 14:23",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/037.The_Egyptians_Drown_in_the_Sea.jpg/960px-037.The_Egyptians_Drown_in_the_Sea.jpg",
    alt: "Pharaoh's army overwhelmed in the Red Sea",
    artist: "Gustave Doré",
  },
  {
    id: "1ki-8-solomon",
    bookAbbr: "1Ki",
    chapter: 8,
    beforeVerse: 1,
    title: "Solomon's Prayer at the Temple",
    referenceLabel: "1 Kings 8:22",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/The_Bible_panorama%2C_or_The_Holy_Scriptures_in_picture_and_story_%281891%29_%2814598234930%29.jpg/960px-The_Bible_panorama%2C_or_The_Holy_Scriptures_in_picture_and_story_%281891%29_%2814598234930%29.jpg",
    alt: "Solomon dedicating the temple in prayer",
    artist: "Bible panorama (1891)",
  },
  {
    id: "2ki-11-joash",
    bookAbbr: "2Ki",
    chapter: 11,
    beforeVerse: 1,
    title: "The Coronation of Joash, the Boy King",
    referenceLabel: "2 Kings 11:12",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/The_Bible_panorama%2C_or_The_Holy_Scriptures_in_picture_and_story_%281891%29_%2814781819761%29.jpg/960px-The_Bible_panorama%2C_or_The_Holy_Scriptures_in_picture_and_story_%281891%29_%2814781819761%29.jpg",
    alt: "Jehoiada crowns the boy king Joash",
    artist: "Bible panorama (1891)",
  },
  {
    id: "2ki-13-elisha",
    bookAbbr: "2Ki",
    chapter: 13,
    beforeVerse: 1,
    title: "The Death of Elisha",
    referenceLabel: "2 Kings 13:20",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/The_Bible_panorama%2C_or_The_Holy_Scriptures_in_picture_and_story_%281891%29_%2814598324158%29.jpg/960px-The_Bible_panorama%2C_or_The_Holy_Scriptures_in_picture_and_story_%281891%29_%2814598324158%29.jpg",
    alt: "Elisha's final days and burial",
    artist: "Bible panorama (1891)",
  },
  {
    id: "isa-6-vision",
    bookAbbr: "Isa",
    chapter: 6,
    beforeVerse: 1,
    title: "The Vision of Isaiah",
    referenceLabel: "Isaiah 6:1",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/121.Isaiah%27s_Vision_of_the_Destruction_of_Babylon.jpg/960px-121.Isaiah%27s_Vision_of_the_Destruction_of_Babylon.jpg",
    alt: "Isaiah's heavenly vision with seraphim",
    artist: "Gustave Doré",
  },
  {
    id: "2sa-23-bethlehem",
    bookAbbr: "2Sa",
    chapter: 23,
    beforeVerse: 15,
    title: "David Pours Out the Water from Bethlehem",
    referenceLabel: "2 Samuel 23:15",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/King_David_Receiving_the_Cistern_Water_of_Bethlehem_%28SM_2253b%29.png/960px-King_David_Receiving_the_Cistern_Water_of_Bethlehem_%28SM_2253b%29.png",
    alt: "David receives water brought by his mighty men from Bethlehem",
    artist: "Historic Bible illustration",
  },
  {
    id: "mat-27-crucifixion",
    bookAbbr: "Mat",
    chapter: 27,
    beforeVerse: 1,
    title: "The Crucifixion of Jesus",
    referenceLabel: "Matthew 27:35",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Gustave_Dor%C3%A9_-_Crucifixion_of_Jesus.jpg/960px-Gustave_Dor%C3%A9_-_Crucifixion_of_Jesus.jpg",
    alt: "Jesus crucified between two thieves",
    artist: "Gustave Doré",
  },
  {
    id: "mrk-15-crucifixion",
    bookAbbr: "Mrk",
    chapter: 15,
    beforeVerse: 1,
    title: "The Crucifixion of Jesus",
    referenceLabel: "Mark 15:24",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Gustave_Dor%C3%A9_-_Crucifixion_of_Jesus.jpg/960px-Gustave_Dor%C3%A9_-_Crucifixion_of_Jesus.jpg",
    alt: "Jesus crucified between two thieves",
    artist: "Gustave Doré",
  },
  {
    id: "luk-23-crucifixion",
    bookAbbr: "Luk",
    chapter: 23,
    beforeVerse: 1,
    title: "The Crucifixion of Jesus",
    referenceLabel: "Luke 23:33",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Gustave_Dor%C3%A9_-_Crucifixion_of_Jesus.jpg/960px-Gustave_Dor%C3%A9_-_Crucifixion_of_Jesus.jpg",
    alt: "Jesus crucified between two thieves",
    artist: "Gustave Doré",
  },
  {
    id: "jhn-19-crucifixion",
    bookAbbr: "Jhn",
    chapter: 19,
    beforeVerse: 1,
    title: "The Crucifixion of Jesus",
    referenceLabel: "John 19:18",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Gustave_Dor%C3%A9_-_Crucifixion_of_Jesus.jpg/960px-Gustave_Dor%C3%A9_-_Crucifixion_of_Jesus.jpg",
    alt: "Jesus crucified between two thieves",
    artist: "Gustave Doré",
  },
  {
    id: "psa-23-shepherd",
    bookAbbr: "Psa",
    chapter: 23,
    beforeVerse: 1,
    title: "The Lord Is My Shepherd",
    referenceLabel: "Psalm 23",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/139.The_Good_Shepherd.jpg/960px-139.The_Good_Shepherd.jpg",
    alt: "The Good Shepherd with his flock",
    artist: "Gustave Doré",
  },
  {
    id: "dan-3-fiery-furnace",
    bookAbbr: "Dan",
    chapter: 3,
    beforeVerse: 1,
    title: "Shadrach, Meshach, and Abednego in the Furnace",
    referenceLabel: "Daniel 3:23",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/089.Shadrach%2C_Meshach%2C_and_Abednego.jpg/960px-089.Shadrach%2C_Meshach%2C_and_Abednego.jpg",
    alt: "Three men in the fiery furnace",
    artist: "Gustave Doré",
  },
  {
    id: "jon-1-storm",
    bookAbbr: "Jon",
    chapter: 1,
    beforeVerse: 1,
    title: "Jonah Cast into the Sea",
    referenceLabel: "Jonah 1:15",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/078.Jonah_Cast_Into_the_Sea.jpg/960px-078.Jonah_Cast_Into_the_Sea.jpg",
    alt: "Jonah thrown into the stormy sea",
    artist: "Gustave Doré",
  },
  {
    id: "rev-1-vision",
    bookAbbr: "Rev",
    chapter: 1,
    beforeVerse: 1,
    title: "The Vision of the Son of Man",
    referenceLabel: "Revelation 1:12",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/966.Revelation_of_St_John_-_The_7_Candlesticks%2C_The_7_Stars%2C_and_the_Son_of_Man.jpg/960px-966.Revelation_of_St_John_-_The_7_Candlesticks%2C_The_7_Stars%2C_and_the_Son_of_Man.jpg",
    alt: "John's vision of Christ among seven lampstands",
    artist: "Gustave Doré",
  },
];
