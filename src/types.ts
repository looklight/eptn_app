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

export type SlideElement = InfoElement | QuestionElement | ConfiguratorElement;

export type Slide = {
  id: string;
  order: number;
  title: string;
  pin: string;
  elements: SlideElement[];
  showRecap?: boolean;
};

export type Workshop = {
  name: string;
  isActive: boolean;
};

export type ConfigAnswer = Record<string, string | null>;
export type AnswerValue = string | number | boolean | ConfigAnswer;
export type Answers = Record<string, AnswerValue>;

export type WorkshopResponse = {
  id: string;
  name: string;
  submittedAt: { seconds: number } | null;
  answers: Answers;
  partial?: boolean;
};
