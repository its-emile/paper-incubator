
// A simple parser, not robust for all GitHub URL formats
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

const fetchFileContent = async (url: string): Promise<string> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    return response.text();
};


export const fetchRepoContents = async (repoUrl: string): Promise<string> => {
  const { owner, repo } = parseRepoUrl(repoUrl);
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;

  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch repository tree: ${response.statusText}`);
  }

  const { tree } = await response.json();

  const filePromises: Promise<string>[] = [];
  
  const readmeFile = tree.find((file: any) => file.path.toLowerCase() === 'readme.md');
  if (readmeFile) {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`;
    filePromises.push(fetchFileContent(rawUrl).then(content => `File: README.md\n\n${content}`));
  }

  const pythonFiles = tree.filter((file: any) => file.path.endsWith('.ipynb') && file.type === 'blob');
  for (const file of pythonFiles) {
     const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${file.path}`;
     filePromises.push(fetchFileContent(rawUrl).then(content => `File: ${file.path}\n\n${content}`));
  }

  const allContents = await Promise.all(filePromises);
  return allContents.join('\n\n---\n\n');
};
