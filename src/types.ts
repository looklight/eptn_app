export type QuestionType = 'multiple_choice' | 'scale' | 'text' | 'yes_no';

export type InfoElement = {
  id: string;
  type: 'info';
  content: string;
};

export type QuestionElement = {
  id: string;
  type: 'question';
  questionType: QuestionType;
  text: string;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  multipleSelect?: boolean;
};

export type ConfigProduct = {
  id: string;
  name: string;
  description: string;
  specs?: string;
  price?: number;
  icon?: string;
};

export type ConfigCategory = {
  id: string;
  label: string;
  products: ConfigProduct[];
};

export type ConfiguratorElement = {
  id: string;
  type: 'configurator';
  title: string;
  categories: ConfigCategory[];
};

export type QuizElement = {
  id: string;
  type: 'quiz';
  text: string;
  options: string[];
  correctAnswer: number;
  timeLimit?: number;       // secondi
  showLeaderboard?: boolean; // mostra classifica cumulativa dopo questa slide
};

export type CarouselItem = {
  id: string;
  title: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  description?: string;
};

export type CarouselElement = {
  id: string;
  type: 'carousel';
  title: string;
  items: CarouselItem[];
};

export type RatingCategory = {
  id: string;
  label: string;
};

export type RatingElement = {
  id: string;
  type: 'rating';
  title: string;
  categories: RatingCategory[];
};

export type SlideElement = InfoElement | QuestionElement | ConfiguratorElement | QuizElement | CarouselElement | RatingElement;

export type SlideMode = 'moderated' | 'pin' | 'autonomous';

export type Slide = {
  id: string;
  order: number;
  title: string;
  pin: string;
  requiresPin?: boolean; // legacy
  mode?: SlideMode;
  elements: SlideElement[];
  showRecap?: boolean;
  imageUrl?: string;
  thumbnailUrl?: string;
};

export const getSlideMode = (slide: Slide): SlideMode => {
  if (slide.mode) return slide.mode;
  // Retrocompatibilità con slide salvate prima del campo mode
  if (slide.requiresPin ?? slide.pin !== '') return 'pin';
  return 'moderated';
};

export type Workshop = {
  name: string;
  isActive: boolean;
  currentSlide?: number;
  showLobby?: boolean; // default true — mostra schermata QR lobby prima delle slide
};

export type ConfigAnswer = Record<string, string | null>;
export type QuizAnswer = { answer: number; responseTimeMs: number };
export type CarouselAnswer = string | null;
export type RatingAnswer = Record<string, number>; // categoryId → 1..5
export type AnswerValue = string | string[] | number | boolean | ConfigAnswer | QuizAnswer | CarouselAnswer | RatingAnswer;
export type Answers = Record<string, AnswerValue>;

export type WorkshopResponse = {
  id: string;
  name: string;
  submittedAt: { seconds: number } | null;
  answers: Answers;
  partial?: boolean;
  registered?: boolean;
};
