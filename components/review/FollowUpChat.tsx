"use client";

import { Loader2, MessageCircleQuestion, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { requestFollowUp } from "@/lib/ai/client";
import type { AiReview, FollowUp } from "@/lib/schema";
import { snapshotAttempt, useAttemptStore } from "@/store/attempt";

/** Keeps follow-up traffic bounded on free-tier rate limits. */
export const MAX_FOLLOW_UPS = 5;
const NONE: FollowUp[] = [];

/** The review's questions plus any the interviewer asked in response to an answer. */
function questionsFor(review: AiReview, followUps: FollowUp[]): string[] {
  const asked = [...review.followUpQuestions];
  for (const f of followUps) {
    if (f.nextQuestion && !asked.includes(f.nextQuestion)) asked.push(f.nextQuestion);
  }
  return asked;
}

export function FollowUpChat({ problemId, review }: { problemId: string; review: AiReview }) {
  const followUps = useAttemptStore((s) => s.meta?.followUps ?? NONE);
  const answered = new Map(followUps.map((f) => [f.question, f]));
  const questions = questionsFor(review, followUps);
  const remaining = MAX_FOLLOW_UPS - followUps.length;

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        Answer like you would out loud. Good answers can raise your score (up to +5 each), weak ones
        lower it.
        {remaining > 0
          ? ` ${remaining} answer${remaining === 1 ? "" : "s"} left.`
          : " Limit reached."}
      </p>
      {questions.map((q) => (
        <QuestionCard
          key={q}
          problemId={problemId}
          question={q}
          answered={answered.get(q)}
          canAnswer={remaining > 0}
        />
      ))}
    </div>
  );
}

function QuestionCard({
  problemId,
  question,
  answered,
  canAnswer,
}: {
  problemId: string;
  question: string;
  answered?: FollowUp;
  canAnswer: boolean;
}) {
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const attempt = snapshotAttempt();
    if (!attempt || !answer.trim()) return;
    setBusy(true);
    try {
      const res = await requestFollowUp(problemId, attempt, question, answer.trim());
      useAttemptStore.getState().addFollowUp({
        question,
        answer: answer.trim(),
        feedback: res.feedback,
        scoreDelta: res.scoreDelta,
        ...(res.nextQuestion ? { nextQuestion: res.nextQuestion } : {}),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Follow-up failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border p-3 text-sm">
      <div className="flex gap-2 font-medium">
        <MessageCircleQuestion className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        {question}
      </div>
      {answered ? (
        <div className="space-y-2 pl-6">
          <p className="bg-muted/50 rounded p-2 whitespace-pre-wrap">{answered.answer}</p>
          <p className="text-muted-foreground">
            {answered.feedback}{" "}
            {answered.scoreDelta !== undefined && answered.scoreDelta !== 0 && (
              <span className={answered.scoreDelta > 0 ? "text-emerald-600" : "text-destructive"}>
                ({answered.scoreDelta > 0 ? "+" : ""}
                {answered.scoreDelta})
              </span>
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-2 pl-6">
          <Textarea
            rows={3}
            placeholder="Your answer..."
            value={answer}
            disabled={!canAnswer || busy}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <Button
            size="sm"
            onClick={() => void submit()}
            disabled={!canAnswer || busy || !answer.trim()}
          >
            {busy ? <Loader2 className="animate-spin" /> : <Send />} Answer
          </Button>
        </div>
      )}
    </div>
  );
}
