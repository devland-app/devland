import { createHash } from "node:crypto";

import { QUIZ_CONTENT, type QuizContent } from "./quizzes.content.js";
import type { Quiz, QuizQuestion } from "./quizzes.types.js";

// De onde vêm as perguntas. Hoje, do código; o service só conhece esta interface.
export interface QuestionBank {
  list(): Quiz[];
  find(slug: string): Quiz | undefined;
  findQuestion(id: string): QuizQuestion | undefined;
}

// O id da opção é um resumo do texto dela, e não "a", "b", "c": como a primeira opção do conteúdo
// é sempre a certa, ids em ordem entregariam a resposta para quem olhasse a resposta da API.
function optionId(questionKey: string, text: string): string {
  return createHash("sha256").update(`${questionKey}|${text}`).digest("hex").slice(0, 10);
}

function toQuiz(content: QuizContent): Quiz {
  return {
    slug: content.slug,
    title: content.title,
    concept: content.concept,
    questions: content.questions.map((question) => {
      const options = question.options.map((text) => ({ id: optionId(question.key, text), text }));
      const [correct] = options;
      if (!correct) {
        throw new Error(`Pergunta ${question.key} sem opções`);
      }
      return {
        id: question.key,
        prompt: question.prompt,
        options,
        correctOptionId: correct.id,
        explanation: question.explanation,
      };
    }),
  };
}

export class InMemoryQuestionBank implements QuestionBank {
  private readonly quizzes: Quiz[];
  private readonly questions: Map<string, QuizQuestion>;

  constructor(content: QuizContent[] = QUIZ_CONTENT) {
    this.quizzes = content.map(toQuiz);
    this.questions = new Map(
      this.quizzes.flatMap((quiz) => quiz.questions.map((question) => [question.id, question])),
    );
  }

  list(): Quiz[] {
    return this.quizzes;
  }

  find(slug: string): Quiz | undefined {
    return this.quizzes.find((quiz) => quiz.slug === slug);
  }

  findQuestion(id: string): QuizQuestion | undefined {
    return this.questions.get(id);
  }
}
