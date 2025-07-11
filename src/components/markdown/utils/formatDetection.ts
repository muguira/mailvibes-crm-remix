/**
 * Detects active formatting at the current cursor position
 * Extracted from TimelineComposer detectActiveFormats function
 */
export const detectActiveFormats = (
  editableElement: HTMLElement | null
): Set<string> => {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || !editableElement) {
    return new Set();
  }

  const range = selection.getRangeAt(0);
  const activeSet = new Set<string>();

  // Get the current node and its parents
  let currentNode = range.startContainer;
  if (currentNode.nodeType === Node.TEXT_NODE) {
    currentNode = currentNode.parentNode;
  }

  // Traverse up the DOM tree to find formatting elements
  while (currentNode && currentNode !== editableElement) {
    if (currentNode.nodeType === Node.ELEMENT_NODE) {
      const element = currentNode as Element;

      // Check for different format types
      switch (element.tagName.toLowerCase()) {
        case "strong":
        case "b":
          activeSet.add("bold");
          break;
        case "em":
        case "i":
          activeSet.add("italic");
          break;
        case "u":
          activeSet.add("underline");
          break;
        case "del":
        case "s":
        case "strike":
          activeSet.add("strikethrough");
          break;
        case "code":
          activeSet.add("code");
          break;
        case "a":
          activeSet.add("link");
          break;
        case "h1":
          activeSet.add("heading1");
          break;
        case "h2":
          activeSet.add("heading2");
          break;
        case "h3":
          activeSet.add("heading3");
          break;
        case "blockquote":
          activeSet.add("quote");
          break;
        case "li":
          const parentList = element.parentElement;
          if (parentList?.tagName.toLowerCase() === "ul") {
            activeSet.add("bulletList");
          } else if (parentList?.tagName.toLowerCase() === "ol") {
            activeSet.add("numberedList");
          }
          break;
      }
    }
    currentNode = currentNode.parentNode;
  }

  return activeSet;
};

/**
 * Cleans up margins and formatting issues in the contentEditable element
 * Extracted from TimelineComposer cleanupMarginsAndFormatting function
 */
export const cleanupMarginsAndFormatting = (
  editableElement: HTMLElement | null
) => {
  if (!editableElement) return;

  // Find all normal paragraphs and ensure they have no margins
  const normalParagraphs =
    editableElement.querySelectorAll(".normal-paragraph");
  normalParagraphs.forEach((paragraph) => {
    const element = paragraph as HTMLElement;
    element.style.cssText =
      "margin: 0 !important; padding: 0 !important; margin-left: 0 !important; padding-left: 0 !important; list-style: none !important; text-indent: 0 !important; position: static !important; left: auto !important; transform: none !important; display: block !important;";
  });

  // Find all divs that come after lists and ensure they have no margins
  const lists = editableElement.querySelectorAll("ul, ol");
  lists.forEach((list) => {
    const nextElement = list.nextElementSibling;
    if (nextElement && nextElement.tagName.toLowerCase() === "div") {
      const element = nextElement as HTMLElement;
      element.style.cssText =
        "margin: 0 !important; padding: 0 !important; margin-left: 0 !important; padding-left: 0 !important; list-style: none !important; text-indent: 0 !important; position: static !important; left: auto !important; transform: none !important; display: block !important;";
    }
  });
};
