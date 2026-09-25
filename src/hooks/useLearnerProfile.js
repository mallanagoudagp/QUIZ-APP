import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, supabaseEnabled } from "../lib/supabaseClient";
import { loadLearnerModel, saveLearnerModel } from "../lib/storage";
import { dueReviewBlocks, nextReview, reviewKey } from "../lib/reviewSchedule";

/**
 * Turns raw accuracy into a coarse level. This drives both question
 * difficulty and how much a wrong-answer explanation assumes the learner
 * already knows for that topic.
 */
function levelForStats(stats) {
  if (!stats || stats.attempts === 0) return "beginner";
  const accuracy = stats.correct / stats.attempts;
  if (accuracy < 0.4) return "beginner";
  if (accuracy < 0.75) return "intermediate";
  return "advanced";
}

/**
 * Tracks per-topic accuracy from quiz behavior — never from a profile form,
 * since the free-form text box is the only input the assignment allows.
 *
 * - Signed in (Supabase configured + `user` present): reads/writes the
 *   `learner_topics` table, so progress follows the account across devices.
 * - Guest (no `user`, or Supabase not configured at all): reads/writes
 *   localStorage, exactly like the original single-device version.
 *
 * @param {{id: string, email?: string} | null} user
 */
export function useLearnerProfile(user) {
  const cloud = supabaseEnabled && !!user;

  const [topics, setTopics] = useState({}); // { [topic]: {attempts, correct} }
  const [missed, setMissed] = useState({}); // { [blockId]: timesWrong }
  const [loading, setLoading] = useState(cloud);

  // Load from whichever store is active. Re-runs when signing in/out.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (cloud) {
        setLoading(true);
        const { data, error } = await supabase
          .from("learner_topics")
          .select("topic, attempts, correct")
          .eq("user_id", user.id);
        if (cancelled) return;
        if (error) {
          console.error("Failed to load learner profile from Supabase:", error.message);
          setTopics({});
        } else {
          const next = {};
          for (const row of data) {
            next[row.topic] = { attempts: row.attempts, correct: row.correct };
          }
          setTopics(next);
        }
        const { data: reviews, error: reviewError } = await supabase.from("learner_reviews")
          .select("block_id, block, box, due_at").eq("user_id", user.id);
        if (cancelled) return;
        if (reviewError) console.error("Failed to load review schedule:", reviewError.message);
        const reviewMap = {};
        for (const row of reviews || []) reviewMap[row.block_id] = { block: row.block, box: row.box, dueAt: row.due_at };
        setMissed(reviewMap);
        setLoading(false);
      } else {
        const local = loadLearnerModel();
        setTopics(local.topics || {});
        setMissed(local.missed || {});
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [cloud, user?.id]);

  // Guest mode: persist to localStorage whenever the model changes.
  useEffect(() => {
    if (!cloud) saveLearnerModel({ topics, missed });
  }, [cloud, topics, missed]);

  const recordAnswer = useCallback(
    (block, wasCorrect) => {
      setTopics((prev) => {
        const t = prev[block.topic] || { attempts: 0, correct: 0 };
        const nextStat = { attempts: t.attempts + 1, correct: t.correct + (wasCorrect ? 1 : 0) };

        if (cloud) {
          supabase
            .from("learner_topics")
            .upsert(
              {
                user_id: user.id,
                topic: block.topic,
                attempts: nextStat.attempts,
                correct: nextStat.correct,
                updated_at: new Date().toISOString()
              },
              { onConflict: "user_id,topic" }
            )
            .then(({ error }) => {
              if (error) console.error("Failed to sync topic stat:", error.message);
            });
        }

        return { ...prev, [block.topic]: nextStat };
      });

      setMissed((prev) => {
        const next = { ...prev };
        const id = reviewKey(block);
        const review = nextReview(block, next[id], wasCorrect);
        next[id] = review;
        if (cloud) {
          supabase.from("learner_reviews").upsert({
            user_id: user.id, block_id: id, block, box: review.box, due_at: review.dueAt
          }, { onConflict: "user_id,block_id" }).then(({ error }) => {
            if (error) console.error("Failed to sync review schedule:", error.message);
          });
        }
        return next;
      });
    },
    [cloud, user]
  );

  const reset = useCallback(async () => {
    if (cloud) {
      const { error } = await supabase.from("learner_topics").delete().eq("user_id", user.id);
      if (error) console.error("Failed to reset cloud progress:", error.message);
    }
    setTopics({});
    setMissed({});
    if (!cloud) saveLearnerModel({ topics: {}, missed: {} });
    else {
      const { error: reviewError } = await supabase.from("learner_reviews").delete().eq("user_id", user.id);
      if (reviewError) console.error("Failed to reset review schedule:", reviewError.message);
    }
  }, [cloud, user]);

  const levels = useMemo(() => {
    const out = {};
    for (const [topic, stats] of Object.entries(topics)) {
      out[topic] = levelForStats(stats);
    }
    return out;
  }, [topics]);

  const hasHistory = Object.keys(topics).length > 0;
  const dueReviews = dueReviewBlocks(missed);

  return { topics, missed, levels, recordAnswer, reset, hasHistory, loading, cloud, dueReviews };
}
