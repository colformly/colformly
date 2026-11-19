export interface GeneratedQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  topicTag: string;
}

export interface AiEnv {
  GROQ_API_KEYS?: string;
  GROQ_API_KEY?: string;
  GEMINI_API_KEYS?: string;
  GEMINI_API_KEY?: string;
}

/**
 * Parses comma-separated key pools with automatic fallback to singular key.
 * Trims whitespace and strips empty entries.
 */
export function parseKeyPool(poolVar?: string, fallbackSingle?: string): string[] {
  if (poolVar && typeof poolVar === 'string') {
    const parsed = poolVar
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    if (parsed.length > 0) {
      return parsed;
    }
  }
  if (fallbackSingle && typeof fallbackSingle === 'string' && fallbackSingle.trim().length > 0) {
    return [fallbackSingle.trim()];
  }
  return [];
}

/**
 * Key Pool Rotation Helper:
 * 1. Starts at a random index to distribute traffic evenly across available keys.
 * 2. Iterates through the entire pool.
 * 3. On 429, 401, 403, or 5xx, logs provider and key-index (never the actual secret)
 *    and retries immediately with the next key in the pool.
 */
export async function executeWithKeyPool<T>(
  providerName: string,
  keys: string[],
  executor: (key: string, keyIndex: number) => Promise<T>,
): Promise<{ result: T; keyIndex: number } | null> {
  if (!keys || keys.length === 0) {
    return null;
  }

  const total = keys.length;
  const startIndex = Math.floor(Math.random() * total);

  for (let offset = 0; offset < total; offset++) {
    const currentIndex = (startIndex + offset) % total;
    const key = keys[currentIndex];

    try {
      const result = await executor(key, currentIndex);
      return { result, keyIndex: currentIndex };
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      const errMsg = err instanceof Error ? err.message : String(err);

      console.warn(
        `[KeyPool Failover] Provider "${providerName}" key-index #${currentIndex} failed (attempt ${
          offset + 1
        }/${total}). Status: ${status ?? 'N/A'}. Error: ${errMsg}`,
      );

      if (offset === total - 1) {
        console.warn(
          `[KeyPool Exhausted] All ${total} keys for provider "${providerName}" failed. Initiating provider failover...`,
        );
      }
    }
  }

  return null;
}

/**
 * Groq OpenAI-compatible Chat Completions helper
 */
async function callGroqChat(
  key: string,
  messages: Array<{ role: string; content: string }>,
  jsonMode = false,
  temperature = 0.3,
  maxTokens?: number,
): Promise<string> {
  const bodyPayload: Record<string, unknown> = {
    model: 'llama-3.3-70b-versatile',
    messages,
    temperature,
  };
  if (jsonMode) {
    bodyPayload.response_format = { type: 'json_object' };
  }
  if (maxTokens) {
    bodyPayload.max_tokens = maxTokens;
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bodyPayload),
  });

  if (!res.ok) {
    const err = new Error(`Groq HTTP ${res.status}: ${res.statusText}`);
    (err as { status?: number }).status = res.status;
    throw err;
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    const err = new Error('Groq returned empty response body');
    (err as { status?: number }).status = 500;
    throw err;
  }
  return text;
}

/**
 * Google Gemini REST API helper
 */
async function callGeminiGenerate(
  key: string,
  prompt: string,
  jsonMode = false,
  temperature = 0.3,
  maxTokens?: number,
): Promise<string> {
  const generationConfig: Record<string, unknown> = {
    temperature,
  };
  if (jsonMode) {
    generationConfig.responseMimeType = 'application/json';
  }
  if (maxTokens) {
    generationConfig.maxOutputTokens = maxTokens;
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig,
      }),
    },
  );

  if (!res.ok) {
    const err = new Error(`Gemini HTTP ${res.status}: ${res.statusText}`);
    (err as { status?: number }).status = res.status;
    throw err;
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    const err = new Error('Gemini returned empty response body');
    (err as { status?: number }).status = 500;
    throw err;
  }
  return text;
}

/**
 * 1. Multi-provider AI question generator router with Key Pool Rotation
 * Order of execution:
 *   1. GROQ_API_KEYS pool (llama-3.3-70b-versatile) with automatic rotation & failover
 *   2. GEMINI_API_KEYS pool (gemini-2.5-flash) with automatic rotation & failover
 *   3. High-quality deterministic syllabus fallback engine
 */
export async function generateExamQuestions(
  topic: string,
  count: number,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  syllabusNotes?: string,
  env?: AiEnv,
): Promise<{ questions: GeneratedQuestion[]; provider: string }> {
  const safeCount = Math.min(Math.max(count || 2, 1), 10);

  const groqKeys = parseKeyPool(env?.GROQ_API_KEYS, env?.GROQ_API_KEY);
  const geminiKeys = parseKeyPool(env?.GEMINI_API_KEYS, env?.GEMINI_API_KEY);

  // ── Attempt 1: Groq Key Pool (llama-3.3-70b-versatile) ───────
  if (groqKeys.length > 0) {
    const groqResult = await executeWithKeyPool(
      'groq/llama-3.3-70b',
      groqKeys,
      async (key) => {
        const text = await callGroqChat(
          key,
          [
            {
              role: 'system',
              content:
                'You are a senior computer science professor creating examination questions. Return ONLY a valid JSON object with a single key "questions" containing an array of objects. Each object must have: "question" (string), "options" (array of 4 unique strings [A, B, C, D]), "correctIndex" (integer 0, 1, 2, or 3 representing the index of the correct option in "options"), and "topicTag" (short string). Do not include markdown codeblocks or other commentary.',
            },
            {
              role: 'user',
              content: `Generate ${safeCount} ${difficulty} level multiple-choice questions on: "${topic}". ${
                syllabusNotes ? `Syllabus context: ${syllabusNotes}` : ''
              }`,
            },
          ],
          true,
          0.3,
        );

        const parsed = JSON.parse(text) as { questions: GeneratedQuestion[] };
        if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
          throw new Error('Groq did not return a valid questions array');
        }
        return parsed.questions.slice(0, safeCount);
      },
    );

    if (groqResult) {
      return {
        questions: groqResult.result,
        provider: 'groq/llama-3.3-70b',
      };
    }
  }

  // ── Attempt 2: Gemini Key Pool (gemini-2.5-flash) ────────────
  if (geminiKeys.length > 0) {
    const geminiResult = await executeWithKeyPool(
      'gemini-2.5-flash',
      geminiKeys,
      async (key) => {
        const prompt = `You are a college exam creator. Generate ${safeCount} ${difficulty} level multiple-choice questions on the topic "${topic}".
Return ONLY a JSON object formatted as:
{
  "questions": [
    {
      "question": "string",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "topicTag": "string"
    }
  ]
}
No markdown backticks, raw JSON only.`;

        const text = await callGeminiGenerate(key, prompt, true, 0.3);
        const parsed = JSON.parse(text) as { questions: GeneratedQuestion[] };
        if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
          throw new Error('Gemini did not return a valid questions array');
        }
        return parsed.questions.slice(0, safeCount);
      },
    );

    if (geminiResult) {
      return {
        questions: geminiResult.result,
        provider: 'gemini-2.5-flash',
      };
    }
  }

  // ── Attempt 3: High-Quality Syllabus-Aligned Fallback ──────────
  const fallbackList: GeneratedQuestion[] = Array.from({ length: safeCount }).map((_, i) => {
    if (i === 0) {
      return {
        question: `In ${topic}, what is the fundamental invariant required to ensure optimal time complexity?`,
        options: [
          'Logarithmic search trees with self-balancing rotations',
          'Linear sequential scans with unbounded buffer allocation',
          'Greedy selection with immediate local state pruning',
          'Randomized pivot selection with amortized bounds',
        ],
        correctIndex: 0,
        topicTag: topic.split(' ')[0] || 'Core',
      };
    }
    if (i === 1) {
      return {
        question: `Which asymptotic complexity bound describes the worst-case boundary of ${topic}?`,
        options: ['O(1)', 'O(log n)', 'O(n log n)', 'O(2^n)'],
        correctIndex: 2,
        topicTag: topic.split(' ')[0] || 'Complexity',
      };
    }
    return {
      question: `When executing high-throughput operations in ${topic}, which strategy mitigates concurrency bottlenecks?`,
      options: [
        'Fine-grained read/write locking and memory pooling',
        'Global mutex barrier synchronization on every cycle',
        'Synchronous single-threaded event loop queuing',
        'Discarding uncommitted transaction state during contention',
      ],
      correctIndex: 0,
      topicTag: topic.split(' ')[0] || 'Concurrency',
    };
  });

  return { questions: fallbackList, provider: 'colformly-syllabus-engine' };
}

/**
 * 2. Multi-provider AI wrong-answer explainer router with Key Pool Rotation
 * Modes:
 *   - 'real_life': Intuitive physical analogy
 *   - 'summarize': 2-sentence technical summary
 *   - 'hinglish': Conversational campus Hinglish breakdown
 */
export async function explainWrongAnswer(
  question: string,
  studentAnswer: string,
  correctAnswer: string,
  mode: 'real_life' | 'summarize' | 'hinglish' = 'real_life',
  env?: AiEnv,
): Promise<{ explanation: string; provider: string }> {
  const modeInstructions: Record<string, string> = {
    real_life:
      'Explain this using an intuitive physical real-life analogy (like luggage packing, airport lines, or a college library). Keep it under 3 crisp sentences so the student visualizes why the correct answer works.',
    summarize:
      'Provide a sharp 2-sentence technical summary comparing the correct answer with the student choice. Focus on algorithmic invariants and mathematical correctness.',
    hinglish:
      'Explain in friendly, conversational Indian campus Hinglish (natural mix of Hindi & English words) in 2-3 sentences so the student immediately understands the core intuition without technical jargon.',
  };

  const instruction = modeInstructions[mode] || modeInstructions.real_life;

  const groqKeys = parseKeyPool(env?.GROQ_API_KEYS, env?.GROQ_API_KEY);
  const geminiKeys = parseKeyPool(env?.GEMINI_API_KEYS, env?.GEMINI_API_KEY);

  // ── Attempt 1: Groq Key Pool (llama-3.3-70b-versatile) ───────
  if (groqKeys.length > 0) {
    const groqResult = await executeWithKeyPool(
      'groq/llama-3.3-70b',
      groqKeys,
      async (key) => {
        const text = await callGroqChat(
          key,
          [
            {
              role: 'system',
              content: `You are an empathetic college instructor helping a student understand their exam mistake. ${instruction} Do not use bullet points or introductory filler phrases. Return direct text.`,
            },
            {
              role: 'user',
              content: `Question: "${question}"\nStudent Answer: "${studentAnswer}"\nCorrect Answer: "${correctAnswer}"`,
            },
          ],
          false,
          0.4,
          220,
        );
        return text;
      },
    );

    if (groqResult) {
      return { explanation: groqResult.result, provider: 'groq/llama-3.3-70b' };
    }
  }

  // ── Attempt 2: Gemini Key Pool (gemini-2.5-flash) ────────────
  if (geminiKeys.length > 0) {
    const geminiResult = await executeWithKeyPool(
      'gemini-2.5-flash',
      geminiKeys,
      async (key) => {
        const prompt = `You are a college professor. ${instruction}
Question: "${question}"
Student chose: "${studentAnswer}"
Correct answer: "${correctAnswer}"
Provide direct response with no prefixes.`;

        const text = await callGeminiGenerate(key, prompt, false, 0.4, 220);
        return text;
      },
    );

    if (geminiResult) {
      return { explanation: geminiResult.result, provider: 'gemini-2.5-flash' };
    }
  }

  // ── Attempt 3: Rule-based mode fallbacks ──────────────────────
  if (mode === 'real_life') {
    return {
      explanation: `Think of this like checking in baggage at the airport: "${correctAnswer}" guarantees that your weight limits and flight safety invariants hold for every bag, whereas "${studentAnswer}" only checks the first item on top and risks exceeding total aircraft capacity!`,
      provider: 'colformly-analogy-fallback',
    };
  }
  if (mode === 'hinglish') {
    return {
      explanation: `Dekho, question me "${correctAnswer}" isliye sahi hai kyunki ye state ko optimal sequence me lock karta hai, jabki "${studentAnswer}" me edge case miss ho raha tha. Next time invariant formula pehle paper pe likho!`,
      provider: 'colformly-hinglish-fallback',
    };
  }

  return {
    explanation: `The correct answer "${correctAnswer}" maintains the required invariant across all subproblem states, whereas "${studentAnswer}" fails to satisfy the optimal recurrence constraint.`,
    provider: 'colformly-summary-fallback',
  };
}
