import { GoogleGenAI, Type } from "@google/genai";
import type { Paper, Section, EditingOptions, SectionName, Comment } from "../types";
import { SECTION_ORDER } from '../constants';

// FIX: Initialize GoogleGenAI client according to guidelines, using API_KEY from environment variables.
if (!process.env.API_KEY) {
  // A friendly message for the developer if the API key is missing.
  // This will not be shown to the end user in the production environment.
  console.warn("Gemini API key not found. Please set the API_KEY environment variable.");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });


// FIX: Re-implemented generateInitialDraft to use Gemini API and follow best practices.
export const generateInitialDraft = async (
  repoContext: string,
  onProgress: (sectionTitle: SectionName) => void
): Promise<Record<SectionName, Section>> => {
  const sections: Partial<Record<SectionName, Section>> = {};

  const systemInstruction = "You are an expert AI Safety researcher writing a paper for the ICML conference.";

  for (const sectionName of SECTION_ORDER) {
    onProgress(sectionName);
    const userPrompt = `Based on the following repository content, write the "${sectionName}" section of a research paper. The paper's topic is about weaknesses in LLM security reviews. Ensure the tone is academic, formal, and objective. If generating a title, make it compelling and relevant. For references, list potential academic papers that would be relevant to this topic.
      
      Repository Content:
      ---
      ${repoContext}
      ---
      
      Now, write the complete "${sectionName}" section.
    `;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userPrompt,
            config: {
                systemInstruction,
            },
        });
        const content = response.text;
        sections[sectionName] = {
            id: sectionName,
            title: sectionName,
            content: content,
            comments: [],
        };
    } catch(error) {
        console.error(`Gemini API call failed for section ${sectionName}:`, error);
        // Re-throw to allow caller to handle the UI state for the error.
        throw new Error(`Failed to generate section: ${sectionName}`);
    }
  }
  return sections as Record<SectionName, Section>;
};


// FIX: Exported function to be used by tests.ts.
export const editingOptionsToPromptString = (options: EditingOptions): string => {
    if (options.all) return 'Overall quality, including formatting, style, depth, rigor, checking for unverified statements, coherence, redundancy, and references.';
    
    const criteria = Object.entries(options)
        .filter(([, value]) => value)
        .map(([key]) => {
            if (key === 'hastyStatements') return 'hasty or unverified statements';
            return key;
        })
        .join(', ');
    return criteria || 'overall quality';
};


// FIX: Re-implemented runEditingRound to use Gemini API with JSON mode.
export const runEditingRound = async (
  section: Section,
  repoContext: string,
  options: EditingOptions
): Promise<{ editedContent: string; comments: Comment[] }> => {

    const systemInstruction = "You are an expert peer reviewer for the ICML conference, specializing in AI Safety. Your task is to critically review and improve a section of a research paper.";

    const userPrompt = `
    You are reviewing the "${section.title}" section.

    **Source Material from GitHub Repository:**
    ---
    ${repoContext}
    ---

    **Current Draft of the Section:**
    ---
    ${section.content}
    ---

    **Instructions:**
    1. Rewrite the entire section to improve it based on the following criteria: ${editingOptionsToPromptString(options)}.
    2. Critically check for any statements in the draft that are hasty, unverified, or not directly supported by the provided source material.
    3. If you find such statements, add a comment in the designated JSON field explaining what needs clarification, verification, or evidence from the human researcher. Do not make up facts or references. Your comments should be constructive and targeted at the human researcher.

    Your response must be in the specified JSON format.
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
        editedContent: {
            type: Type.STRING,
            description: "The full, rewritten text of the section."
        },
        comments: {
            type: Type.ARRAY,
            description: "An array of new comment strings. If no comments, return an empty array.",
            items: { type: Type.STRING }
        }
    }
  };

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userPrompt,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: schema,
        },
    });
    const cleanedText = response.text.trim();
    const result = JSON.parse(cleanedText) as { editedContent: string; comments: string[] };
    
    const newComments: Comment[] = (result.comments || []).map(text => ({
      id: `ai-${Date.now()}-${Math.random()}`,
      author: 'AI Agent',
      text,
      timestamp: new Date().toISOString(),
    }));
  
    return { editedContent: result.editedContent || section.content, comments: newComments };
  } catch (error) {
    console.error("Gemini API JSON call failed:", error);
    // Re-throw to allow caller to handle the UI state for the error.
    throw new Error("Failed to get valid JSON response from AI model.");
  }
};
