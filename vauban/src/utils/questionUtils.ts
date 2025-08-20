import { Question } from "../components/flow/QuestionFlow";

/**
 * Formats questions into the expected backend format
 */
export const formatQuestionsForBackend = (questions: Question[], values: Record<string, any>) => {
  return {
    questions: questions.map(q => ({
      id: q.id,
      question: q.question,
      type: q.type,
      options: q.options,
      per_unit: q.per_unit,
      justification: q.justification,
      impact: q.impact
    }))
  };
};

/**
 * Gets the initial form values for questions
 */
export const getInitialQuestionValues = (questions: Question[]) => {
  const initialValues: Record<string, any> = {};
  
  questions.forEach(q => {
    if (q.per_unit) {
      initialValues[q.id] = {}; // Will be filled with { unitName: value }
    } else {
      initialValues[q.id] = "";
    }
  });
  
  return initialValues;
};

/**
 * Updates form values when a question's answer changes
 */
export const updateQuestionValue = (
  values: Record<string, any>,
  questionId: string,
  value: string,
  unite?: string
) => {
  if (unite) {
    return {
      ...values,
      [questionId]: {
        ...(values[questionId] || {}),
        [unite]: value
      }
    };
  }
  
  return {
    ...values,
    [questionId]: value
  };
};
