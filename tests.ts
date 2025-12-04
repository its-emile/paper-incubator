import { editingOptionsToPromptString } from './services/openaiService';

// The githubService isn't built to export this, so we are copying the implementation
// for testing purposes. In a larger app, this would be a shared utility.
const parseRepoUrl = (url: string): { owner: string; repo: string } => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2) {
        return { owner: pathParts[0], repo: pathParts[1] };
      }
    } catch (e) {
      // Fallback for simple user/repo string
      const parts = url.split('/').filter(Boolean);
      if (parts.length >= 2) {
          const repoIndex = parts.findIndex(p => p.toLowerCase() === 'github.com');
          if(repoIndex !== -1 && parts.length > repoIndex + 2) {
              return { owner: parts[repoIndex+1], repo: parts[repoIndex+2] };
          }
          return { owner: parts[parts.length - 2], repo: parts[parts.length - 1] };
      }
    }
    throw new Error('Invalid GitHub repository URL');
};


const assertEqual = (actual: any, expected: any, description: string) => {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
        throw new Error(`Assert failed: ${description}\nExpected: ${expectedStr}\nActual:   ${actualStr}`);
    }
};

const it = (description: string, testFn: () => void) => {
    try {
        testFn();
        console.log(`✅ PASS: ${description}`);
    } catch (e) {
        console.error(`❌ FAIL: ${description}`);
        console.error((e as Error).message);
    }
}

const runGithubServiceTests = () => {
    console.group("services/githubService.ts (parser)");
    it("should parse a standard HTTPS URL", () => {
        const url = "https://github.com/its-emile/llm-security-review-weakness";
        const result = parseRepoUrl(url);
        assertEqual(result, { owner: 'its-emile', repo: 'llm-security-review-weakness' }, 'Standard URL');
    });

    it("should parse a URL with a trailing slash", () => {
        const url = "https://github.com/facebook/react/";
        const result = parseRepoUrl(url);
        assertEqual(result, { owner: 'facebook', repo: 'react' }, 'Trailing slash');
    });

    it("should parse a URL without https://", () => {
        const url = "github.com/vercel/next.js";
        const result = parseRepoUrl(url);
        assertEqual(result, { owner: 'vercel', repo: 'next.js' }, 'No protocol');
    });
    
    it("should throw an error for an invalid URL", () => {
        let didThrow = false;
        try {
            parseRepoUrl("invalid-url");
        } catch(e) {
            didThrow = true;
        }
        if (!didThrow) {
            throw new Error("Expected parseRepoUrl to throw for invalid URL but it did not.");
        }
    });
    console.groupEnd();
};

const runOpenAIServiceTests = () => {
    console.group("services/openaiService.ts");

    it("should generate a default prompt for no options", () => {
        const options = {};
        const result = editingOptionsToPromptString(options);
        assertEqual(result, "Improve the overall quality of the paragraph.", "No options");
    });

    it("should generate a prompt for selected options", () => {
        const options = { style: true, rigor: true, hastyStatements: true };
        const result = editingOptionsToPromptString(options);
        assertEqual(result, "Improve it based on the following criteria: style, rigor, checking for hasty or unverified statements.", "Selected options");
    });

    it("should generate a prompt for only custom instruction", () => {
        const options = { customInstruction: "make it shorter" };
        const result = editingOptionsToPromptString(options);
        assertEqual(result, 'Follow this specific instruction: "make it shorter.".', "Custom instruction only");
    });
    
    it("should generate a prompt for both checkboxes and custom instruction", () => {
        const options = { coherence: true, customInstruction: "add a citation" };
        const result = editingOptionsToPromptString(options);
        assertEqual(result, 'Improve it based on the following criteria: coherence. Additionally, follow this specific instruction: "add a citation.".', "Checkboxes and custom instruction");
    });

    it("should ignore empty custom instruction", () => {
        const options = { style: true, customInstruction: "   " };
        const result = editingOptionsToPromptString(options);
        assertEqual(result, "Improve it based on the following criteria: style.", "Empty custom instruction");
    });

    console.groupEnd();
};

export const runTests = () => {
    console.clear();
    console.log("====================");
    console.log("  Running PI Tests  ");
    console.log("====================");
    runGithubServiceTests();
    runOpenAIServiceTests();
    console.log("\nTest run complete.");
};