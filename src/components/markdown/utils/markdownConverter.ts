/**
 * Converts HTML content back to markdown format
 * Extracted from TimelineComposer getPlainText function
 */
export const htmlToMarkdown = (html: string): string => {
  let plainText = html;

  // Convert HTML back to markdown
  // Headings
  plainText = plainText.replace(/<h1[^>]*>(.*?)<\/h1>/g, "# $1");
  plainText = plainText.replace(/<h2[^>]*>(.*?)<\/h2>/g, "## $1");
  plainText = plainText.replace(/<h3[^>]*>(.*?)<\/h3>/g, "### $1");
  plainText = plainText.replace(/<h4[^>]*>(.*?)<\/h4>/g, "#### $1");
  plainText = plainText.replace(/<h5[^>]*>(.*?)<\/h5>/g, "##### $1");
  plainText = plainText.replace(/<h6[^>]*>(.*?)<\/h6>/g, "###### $1");

  // Text formatting
  plainText = plainText.replace(/<strong[^>]*>(.*?)<\/strong>/g, "**$1**");
  plainText = plainText.replace(/<b[^>]*>(.*?)<\/b>/g, "**$1**");
  plainText = plainText.replace(/<em[^>]*>(.*?)<\/em>/g, "*$1*");
  plainText = plainText.replace(/<i[^>]*>(.*?)<\/i>/g, "*$1*");
  plainText = plainText.replace(/<u[^>]*>(.*?)<\/u>/g, "__$1__");
  plainText = plainText.replace(/<del[^>]*>(.*?)<\/del>/g, "~~$1~~");
  plainText = plainText.replace(/<s[^>]*>(.*?)<\/s>/g, "~~$1~~");
  plainText = plainText.replace(/<strike[^>]*>(.*?)<\/strike>/g, "~~$1~~");

  // Code - Enhanced for new visual elements
  plainText = plainText.replace(/<code[^>]*>(.*?)<\/code>/g, "`$1`");
  // Handle code blocks with language labels
  plainText = plainText.replace(
    /<pre[^>]*><span[^>]*>([^<]*)<\/span><code[^>]*>(.*?)<\/code><\/pre>/gs,
    "```$1\n$2\n```"
  );
  // Handle code blocks without language labels
  plainText = plainText.replace(
    /<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gs,
    "```\n$1\n```"
  );

  // Blockquotes
  plainText = plainText.replace(
    /<blockquote[^>]*>(.*?)<\/blockquote>/g,
    "> $1"
  );

  // Links
  plainText = plainText.replace(
    /<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g,
    "[$2]($1)"
  );

  // Lists - Enhanced for nested lists
  // Handle unordered lists
  plainText = plainText.replace(/<ul[^>]*>(.*?)<\/ul>/gs, (match, content) => {
    const items = content.match(/<li[^>]*>(.*?)<\/li>/gs);
    if (items) {
      return items
        .map((item: string) => {
          const text = item.replace(/<li[^>]*>(.*?)<\/li>/s, "$1");
          return `- ${text}`;
        })
        .join("\n");
    }
    return match;
  });

  // Handle ordered lists
  plainText = plainText.replace(/<ol[^>]*>(.*?)<\/ol>/gs, (match, content) => {
    const items = content.match(/<li[^>]*>(.*?)<\/li>/gs);
    if (items) {
      return items
        .map((item: string, index: number) => {
          const text = item.replace(/<li[^>]*>(.*?)<\/li>/s, "$1");
          return `${index + 1}. ${text}`;
        })
        .join("\n");
    }
    return match;
  });

  // Horizontal rules
  plainText = plainText.replace(/<hr[^>]*>/g, "---");

  // Clean up HTML tags
  plainText = plainText.replace(/<[^>]*>/g, "");

  // Convert HTML entities
  plainText = plainText.replace(/&nbsp;/g, " ");
  plainText = plainText.replace(/&amp;/g, "&");
  plainText = plainText.replace(/&lt;/g, "<");
  plainText = plainText.replace(/&gt;/g, ">");
  plainText = plainText.replace(/&quot;/g, '"');
  plainText = plainText.replace(/&#39;/g, "'");

  // Clean up extra newlines and whitespace
  plainText = plainText.replace(/\n\s*\n\s*\n/g, "\n\n");
  plainText = plainText.trim();

  return plainText;
};

/**
 * Converts markdown content to HTML for display
 * Extracted from TimelineComposer handlePaste function
 */
export const markdownToHtml = (markdown: string): string => {
  let htmlContent = markdown;

  // Process markdown elements in order of complexity

  // 1. Code blocks (process first to avoid interference)
  htmlContent = htmlContent.replace(
    /```(\w+)?\n([\s\S]*?)```/g,
    (match, lang, code) => {
      const language = lang
        ? `<span class="text-xs text-gray-500 mb-1 block">${lang}</span>`
        : "";
      return `<pre class="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto my-2">${language}<code class="text-sm font-mono">${code.trim()}</code></pre>`;
    }
  );

  // 2. Headers (process before other formatting)
  htmlContent = htmlContent.replace(
    /^# (.+)$/gm,
    '<h1 class="text-2xl font-bold mb-2 mt-4 text-gray-900">$1</h1>'
  );
  htmlContent = htmlContent.replace(
    /^## (.+)$/gm,
    '<h2 class="text-xl font-bold mb-2 mt-3 text-gray-900">$1</h2>'
  );
  htmlContent = htmlContent.replace(
    /^### (.+)$/gm,
    '<h3 class="text-lg font-bold mb-2 mt-3 text-gray-900">$1</h3>'
  );
  htmlContent = htmlContent.replace(
    /^#### (.+)$/gm,
    '<h4 class="text-base font-bold mb-1 mt-2 text-gray-900">$1</h4>'
  );
  htmlContent = htmlContent.replace(
    /^##### (.+)$/gm,
    '<h5 class="text-sm font-bold mb-1 mt-2 text-gray-900">$1</h5>'
  );
  htmlContent = htmlContent.replace(
    /^###### (.+)$/gm,
    '<h6 class="text-xs font-bold mb-1 mt-2 text-gray-900">$1</h6>'
  );

  // 3. Blockquotes
  htmlContent = htmlContent.replace(
    /^> (.+)$/gm,
    '<blockquote class="border-l-4 border-teal-500 pl-4 py-2 my-2 bg-teal-50 text-gray-700 italic">$1</blockquote>'
  );

  // 4. Horizontal rules
  htmlContent = htmlContent.replace(
    /^---$/gm,
    '<hr class="border-t border-gray-300 my-4">'
  );

  // 5. Text formatting (process in order to avoid conflicts)
  // Bold text
  htmlContent = htmlContent.replace(
    /\*\*(.+?)\*\*/g,
    '<strong class="font-bold text-gray-900">$1</strong>'
  );

  // Italic text
  htmlContent = htmlContent.replace(
    /\*(.+?)\*/g,
    '<em class="italic text-gray-800">$1</em>'
  );

  // Strikethrough
  htmlContent = htmlContent.replace(
    /~~(.+?)~~/g,
    '<del class="line-through text-gray-500">$1</del>'
  );

  // Underline (using markdown extension)
  htmlContent = htmlContent.replace(
    /__(.+?)__/g,
    '<u class="underline decoration-2 underline-offset-2">$1</u>'
  );

  // 6. Inline code
  htmlContent = htmlContent.replace(
    /`([^`]+)`/g,
    '<code class="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono">$1</code>'
  );

  // 7. Links
  htmlContent = htmlContent.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-teal-600 underline hover:text-teal-800 transition-colors" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // 8. Lists processing
  const lines = htmlContent.split("\n");
  const processedLines = lines.map((line) => {
    // Handle nested bullets (with spaces)
    if (/^(\s*)[-*+•] (.+)$/.test(line)) {
      const match = line.match(/^(\s*)[-*+•] (.+)$/);
      if (match) {
        const indent = match[1];
        const content = match[2];
        const level = Math.floor(indent.length / 2);
        return `<li class="ml-${Math.min(
          level * 4,
          12
        )} list-item" style="list-style-type: ${
          level > 0 ? "circle" : "disc"
        };">${content}</li>`;
      }
    }
    // Handle numbered lists
    else if (/^(\s*)(\d+)\. (.+)$/.test(line)) {
      const match = line.match(/^(\s*)(\d+)\. (.+)$/);
      if (match) {
        const indent = match[1];
        const content = match[3];
        const level = Math.floor(indent.length / 2);
        return `<li class="ml-${Math.min(
          level * 4,
          12
        )} numbered-item" style="list-style-type: ${
          level > 0 ? "lower-alpha" : "decimal"
        };">${content}</li>`;
      }
    }
    return line;
  });

  // Group consecutive list items
  let processedContent = processedLines.join("\n");

  // Wrap bullet lists
  processedContent = processedContent.replace(
    /(<li class="[^"]*list-item[^"]*"[^>]*>.*?<\/li>(\n<li class="[^"]*list-item[^"]*"[^>]*>.*?<\/li>)*)/gs,
    '<ul class="list-disc list-outside my-3 pl-6">$1</ul>'
  );

  // Wrap numbered lists
  processedContent = processedContent.replace(
    /(<li class="[^"]*numbered-item[^"]*"[^>]*>.*?<\/li>(\n<li class="[^"]*numbered-item[^"]*"[^>]*>.*?<\/li>)*)/gs,
    '<ol class="list-decimal list-outside my-3 pl-6">$1</ol>'
  );

  // 9. Handle line breaks (process last to avoid interference)
  // IMPORTANTE: No convertir saltos de línea que están dentro de listas
  // Primero, proteger el contenido de las listas
  const listPlaceholders: string[] = [];
  processedContent = processedContent.replace(
    /(<[uo]l[^>]*>.*?<\/[uo]l>)/gs,
    (match) => {
      const placeholder = `__LIST_PLACEHOLDER_${listPlaceholders.length}__`;
      listPlaceholders.push(match);
      return placeholder;
    }
  );

  // Ahora convertir saltos de línea solo fuera de las listas
  processedContent = processedContent.replace(/\n/g, "<br>");

  // Restaurar las listas
  listPlaceholders.forEach((list, index) => {
    processedContent = processedContent.replace(
      `__LIST_PLACEHOLDER_${index}__`,
      list
    );
  });

  return processedContent;
};
