import { useEffect, useMemo, useState } from 'react';

// exercises.ts の Problem と同じ形（props はシリアライズされて渡ってくる）
interface Choice {
  raw: string;
  html: string;
}
interface Problem {
  id: string;
  kind: 'choice' | 'text';
  promptHtml: string;
  choices?: Choice[];
  answer: string;
  answerHtml: string;
  explanationHtml?: string;
}

interface QuizProps {
  problems: Problem[];
  subject: string;
  chapter: string;
}

interface BestScore {
  best: number;
  total: number;
}

// 記述式の照合用の正規化: 前後空白除去 / 全角空白→半角 / 全角英数記号→半角
function normalize(input: string): string {
  return input
    .replace(/　/g, ' ') // 全角空白→半角
    .replace(/[！-～]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
    ) // 全角英数記号→半角
    .replace(/\s+/g, ' ')
    .trim();
}

function Html({ html, className }: { html: string; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function Quiz({ problems, subject, chapter }: QuizProps) {
  const total = problems.length;
  const storageKey = `mebae:quiz:${subject}:${chapter}`;

  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [best, setBest] = useState<BestScore | null>(null);

  // 初回マウント時に localStorage から最高得点を読む
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setBest(JSON.parse(raw) as BestScore);
    } catch {
      /* localStorage 不可の環境は無視 */
    }
  }, [storageKey]);

  const current = problems[index];

  const isCurrentCorrect = useMemo(() => {
    if (!answered || !current) return false;
    const given = current.kind === 'choice' ? selected ?? '' : input;
    return normalize(given) === normalize(current.answer);
  }, [answered, current, selected, input]);

  if (total === 0) return null;

  function submit() {
    if (answered || !current) return;
    const given = current.kind === 'choice' ? selected ?? '' : input;
    if (current.kind === 'choice' && selected === null) return; // 未選択
    if (current.kind === 'text' && given.trim() === '') return; // 未入力
    const correct = normalize(given) === normalize(current.answer);
    if (correct) setCorrectCount((c) => c + 1);
    setAnswered(true);
  }

  function next() {
    if (index + 1 >= total) {
      finish();
      return;
    }
    setIndex((i) => i + 1);
    setInput('');
    setSelected(null);
    setAnswered(false);
  }

  function finish() {
    setFinished(true);
    // 最高得点を更新（得点が同じでも total 違いは上書き）
    setBest((prev) => {
      const nextBest =
        !prev || correctCount > prev.best ? { best: correctCount, total } : prev;
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(nextBest));
      } catch {
        /* 無視 */
      }
      return nextBest;
    });
  }

  function restart() {
    setIndex(0);
    setInput('');
    setSelected(null);
    setAnswered(false);
    setCorrectCount(0);
    setFinished(false);
  }

  if (finished) {
    return (
      <div className="quiz quiz--result">
        <h3>演習結果</h3>
        <p className="quiz__score">
          {correctCount} / {total}
        </p>
        {best && (
          <p className="quiz__best">
            これまでの最高得点: {best.best} / {best.total}
          </p>
        )}
        <button type="button" onClick={restart}>
          もう一度
        </button>
      </div>
    );
  }

  return (
    <div className="quiz">
      <div className="quiz__meta">
        <span>
          第 {index + 1} 問 / 全 {total} 問
        </span>
        {best && (
          <span className="quiz__best">
            最高得点: {best.best} / {best.total}
          </span>
        )}
      </div>

      <div className="quiz__prompt">
        <strong>{current.id}</strong>
        <Html html={current.promptHtml} />
      </div>

      {current.kind === 'choice' ? (
        <ul className="quiz__choices">
          {current.choices!.map((choice) => {
            const isPicked = selected === choice.raw;
            const isAnswer =
              answered && normalize(choice.raw) === normalize(current.answer);
            return (
              <li key={choice.raw}>
                <button
                  type="button"
                  className={
                    'quiz__choice' +
                    (isPicked ? ' is-picked' : '') +
                    (isAnswer ? ' is-answer' : '')
                  }
                  disabled={answered}
                  onClick={() => setSelected(choice.raw)}
                >
                  <Html html={choice.html} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <input
          type="text"
          className="quiz__input"
          value={input}
          disabled={answered}
          placeholder="答えを入力"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
      )}

      {!answered ? (
        <button type="button" className="quiz__submit" onClick={submit}>
          回答する
        </button>
      ) : (
        <div className="quiz__feedback">
          <p className={isCurrentCorrect ? 'is-correct' : 'is-wrong'}>
            {isCurrentCorrect ? '正解！' : '不正解'}
          </p>
          {!isCurrentCorrect && (
            <p>
              正答: <Html html={current.answerHtml} />
            </p>
          )}
          {current.explanationHtml && (
            <div className="quiz__explanation">
              <Html html={current.explanationHtml} />
            </div>
          )}
          <button type="button" onClick={next}>
            {index + 1 >= total ? '結果を見る' : '次の問題へ'}
          </button>
        </div>
      )}
    </div>
  );
}
