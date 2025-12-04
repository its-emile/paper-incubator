import type { Section, EditingOptions, SectionName, Comment } from "../types";
import { SECTION_ORDER } from "../constants";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

const callOpenAI = async (apiKey: string, body: object, signal?: AbortSignal) => {
    if (!apiKey) {
        throw new Error("OpenAI API key is missing.");
    }
    const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body),
        signal,
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("OpenAI API Error:", errorData);
        throw new Error(`OpenAI API request failed: ${errorData.error?.message || response.statusText}`);
    }

    return response;
};

export const generateInitialDraft = async (
  repoContext: string,
  apiKey: string,
  sectionName: SectionName,
  currentPaperContent: string
): Promise<Section> => {
    const systemPrompt = "You are an expert AI Safety researcher writing a paper for the ICML conference. Your tone must be academic, formal, and objective.";
    const userPrompt = `Based on the provided context, write the "${sectionName}" section of a research paper about weaknesses in LLM security reviews.

**Repository Content (Source Material):**
---
${repoContext}
---

**Previously Written Sections (for context and coherence):**
---
${currentPaperContent || "This is the first section."}
---

Now, write the complete content for the "${sectionName}" section only.`;

    const response = await callOpenAI(apiKey, {
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        temperature: 0.5,
    });
    
    const data = await response.json();
    const content = data.choices[0]?.message?.content || `Error generating ${sectionName}.`;
    return {
      id: sectionName,
      title: sectionName,
      content: content.trim(),
      comments: [],
    };
};

export const editingOptionsToPromptString = (options: EditingOptions): string => {
    const parts: string[] = [];

    const checkboxCriteria = Object.entries(options)
        .filter(([key, value]) => value === true && key !== 'all' && key !== 'customInstruction')
        .map(([key]) => {
            if (key === 'hastyStatements') return 'checking for hasty or unverified statements';
            return key;
        });

    if (checkboxCriteria.length > 0) {
        parts.push(`Improve it based on the following criteria: ${checkboxCriteria.join(', ')}.`);
    }

    if (options.customInstruction && options.customInstruction.trim()) {
        const instructionPrefix = checkboxCriteria.length > 0 ? 'Additionally, follow this specific instruction' : 'Follow this specific instruction';
        parts.push(`${instructionPrefix}: "${options.customInstruction.trim()}".`);
    }

    if (parts.length === 0) {
        return 'Improve the overall quality of the paragraph.';
    }

    return parts.join(' ');
};

export const runEditingRoundStream = async (
  fullPaperContent: string,
  sectionName: SectionName,
  subsectionContent: string,
  options: EditingOptions,
  apiKey: string,
  onToken: (token: string) => void,
  signal: AbortSignal
): Promise<void> => {
    const systemPrompt = `You are an expert peer reviewer for the ICML conference, specializing in AI Safety. You edit academic papers at a paragraph level. Your task is to rewrite a single paragraph (subsection) based on the provided criteria and the full context of the paper. You MUST return only the rewritten paragraph text, with no extra commentary, formatting, or quotation marks.`;
    const userPrompt = `You are editing a single paragraph within the "${sectionName}" section.

**Instructions:**
1. ${editingOptionsToPromptString(options)}
2. Ensure the rewritten paragraph is coherent with the rest of the paper provided in the context below.
3. Your response must be ONLY the rewritten text of the paragraph. Do not wrap it in quotes or add explanations.

**Full Paper Draft (for context):**
---
${fullPaperContent}
---

**Original Paragraph to Rewrite:**
---
${subsectionContent}
---

**Rewritten Paragraph:`;

    const response = await callOpenAI(apiKey, {
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        temperature: 0.5,
        stream: true,
    }, signal);
    
    if (!response.body) {
        throw new Error("Streaming response has no body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;

    while(!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
            if(line.startsWith('data: ')) {
                const data = line.substring(6);
                if (data.trim() === '[DONE]') {
                    return;
                }
                try {
                    const parsed = JSON.parse(data);
                    const token = parsed.choices[0]?.delta?.content;
                    if (token) {
                        onToken(token);
                    }
                } catch(e) {
                    // Ignore parsing errors for incomplete JSON chunks
                }
            }
        }
    }
};

export const runGlobalImprovementRound = async (
    fullPaperContent: string,
    options: EditingOptions,
    apiKey: string,
  ): Promise<{ sectionToUpdate: SectionName; newContent: string }> => {
      const systemPrompt = `You are an expert editor for the ICML conference, specializing in AI Safety. Your task is to review an entire research paper draft and identify the single most impactful section to improve. You must rewrite that one section completely based on the provided criteria. Your response must be a valid JSON object.`;
      
      const userPrompt = `Review the entire paper draft below and choose exactly ONE section to rewrite and improve based on the following instructions.
  
  **Instructions:**
  1. Your improvement should focus on: ${editingOptionsToPromptString(options)}.
  2. Select the single section where this improvement would be most impactful.
  3. Rewrite the entire content for that chosen section.
  4. Your response MUST be a JSON object with two keys: "sectionToUpdate" and "newContent".
  5. The value for "sectionToUpdate" must be one of the following exact strings: ${SECTION_ORDER.map(s => `"${s}"`).join(', ')}.
  
  **Full Paper Draft:**
  ---
  ${fullPaperContent}
  ---
  
  Now, provide your response in the specified JSON format.
  `;
  
      const response = await callOpenAI(apiKey, {
          model: 'gpt-4o-mini',
          messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
          ],
          temperature: 0.5,
          response_format: { type: "json_object" },
      });
  
      const data = await response.json();
      const resultText = data.choices[0]?.message?.content;
      if (!resultText) {
          throw new Error("AI returned an empty response.");
      }
  
      try {
          const parsed = JSON.parse(resultText);
          if (!parsed.sectionToUpdate || typeof parsed.newContent !== 'string' || !SECTION_ORDER.includes(parsed.sectionToUpdate)) {
              throw new Error("AI returned invalid JSON structure or an invalid section name.");
          }
          return parsed as { sectionToUpdate: SectionName; newContent: string };
      } catch (e) {
          console.error("Failed to parse AI JSON response:", resultText, e);
          throw new Error("AI returned malformed JSON.");
      }
  };