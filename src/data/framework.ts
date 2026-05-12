/**
 * Belief Framework — guided interview questions.
 * Four layers from the "Cognitive Theology Engine" plan:
 *   foundations | life | mechanics | emotional
 */

export type FrameworkLayer = "foundations" | "life" | "mechanics" | "emotional";

export const LAYER_META: Record<
  FrameworkLayer,
  { title: string; subtitle: string; tone: string }
> = {
  foundations: {
    title: "Core Foundations",
    subtitle: "God, Jesus, Holy Spirit, Scripture — the load-bearing walls.",
    tone: "#2563EB",
  },
  life: {
    title: "Life Framework",
    subtitle: "Suffering, prayer, money, relationships — practical living.",
    tone: "#10B981",
  },
  mechanics: {
    title: "Spiritual Mechanics",
    subtitle: "Dreams, angels, prophecy, discernment — how the unseen works.",
    tone: "#8B5CF6",
  },
  emotional: {
    title: "Emotional Reality",
    subtitle: "Fears, formative voices, peace vs anxiety — what shaped you.",
    tone: "#F43F5E",
  },
};

export interface FrameworkQuestion {
  id: string;
  topic: string;
  prompt: string;
}

export const FRAMEWORK_QUESTIONS: Record<FrameworkLayer, FrameworkQuestion[]> = {
  foundations: [
    { id: "god-who", topic: "God", prompt: "Who is God to you, in your own words?" },
    { id: "god-character", topic: "God", prompt: "Is God primarily loving, just, sovereign, mysterious, or wrathful — and how do you balance those?" },
    { id: "god-speaks", topic: "God", prompt: "Does God still speak today? If yes, how does He guide people?" },
    { id: "god-intervene", topic: "God", prompt: "Does God intervene directly in daily life, or mostly through general providence?" },
    { id: "jesus-who", topic: "Jesus", prompt: "Who is Jesus? Was He fully God and fully man?" },
    { id: "jesus-cross", topic: "Jesus", prompt: "Why did Jesus die? What does salvation actually mean to you?" },
    { id: "salvation-lost", topic: "Jesus", prompt: "Can salvation be lost? Why or why not?" },
    { id: "spirit-active", topic: "Holy Spirit", prompt: "Does the Holy Spirit still operate like in Acts? Are spiritual gifts active today?" },
    { id: "spirit-discern", topic: "Holy Spirit", prompt: "What is discernment, and how do you tell it from intuition or emotion?" },
    { id: "scripture-nature", topic: "Scripture", prompt: "Is the Bible literal, symbolic, contextual, infallible, inspired — and how do you handle apparent contradictions?" },
    { id: "scripture-authority", topic: "Scripture", prompt: "When scripture, tradition, personal revelation, and experience conflict — which has higher authority?" },
  ],
  life: [
    { id: "suffering-why", topic: "Suffering", prompt: "Why does suffering happen? Does God cause it, allow it, or both?" },
    { id: "suffering-refine", topic: "Suffering", prompt: "Can suffering refine people? Where's the line between refining and just damage?" },
    { id: "prayer-what", topic: "Prayer", prompt: "What is prayer? Does it actually change outcomes, or mostly change you?" },
    { id: "prayer-unanswered", topic: "Prayer", prompt: "Why do some prayers seem unanswered? Does faith level affect results?" },
    { id: "money-wealth", topic: "Money", prompt: "Is wealth dangerous, neutral, or potentially Kingdom-aligned?" },
    { id: "money-enough", topic: "Money", prompt: "What is greed, and what is 'enough'?" },
    { id: "rel-leadership", topic: "Relationships", prompt: "What is biblical leadership in marriage and in the home?" },
    { id: "rel-forgive", topic: "Relationships", prompt: "What is forgiveness, and what boundaries are healthy?" },
  ],
  mechanics: [
    { id: "dreams", topic: "Dreams", prompt: "Can dreams carry spiritual meaning? How do you test them?" },
    { id: "angels", topic: "Angels", prompt: "What role do angels play in daily life and in spiritual events?" },
    { id: "warfare", topic: "Warfare", prompt: "Can spiritual oppression affect believers? How do you recognize it?" },
    { id: "prophecy", topic: "Prophecy", prompt: "How should prophecy be tested? What qualifies someone as spiritually trustworthy?" },
    { id: "voice", topic: "Hearing God", prompt: "How do you distinguish God's voice from intuition vs emotion vs your own desires?" },
  ],
  emotional: [
    { id: "fear-spiritual", topic: "Fear", prompt: "What are you most afraid of spiritually?" },
    { id: "fear-god", topic: "Fear", prompt: "What do you secretly fear about God?" },
    { id: "peace", topic: "Peace", prompt: "Which teachings consistently produce peace in you?" },
    { id: "anxiety", topic: "Anxiety", prompt: "Which teachings consistently produce anxiety, urgency, or shame in you?" },
    { id: "influence", topic: "Influence", prompt: "Which authority figures (pastors, mentors, parents) shaped your beliefs the most — and which beliefs came from them?" },
    { id: "inherited", topic: "Inherited", prompt: "What beliefs did you inherit but never actually examined?" },
  ],
};

export const ALL_LAYERS: FrameworkLayer[] = ["foundations", "life", "mechanics", "emotional"];

export function totalQuestions(): number {
  return ALL_LAYERS.reduce((n, l) => n + FRAMEWORK_QUESTIONS[l].length, 0);
}