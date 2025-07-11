/**
 * Handles formatting operations for contentEditable elements
 * Extracted from TimelineComposer handleFormatting function
 */
export const handleFormatting = (
  format: string,
  editableElement: HTMLElement | null,
  onLinkRequest?: (selectedText: string, range: Range) => void,
  onCodeBlockRequest?: (selectedText: string, range: Range) => void
) => {
  const selection = window.getSelection();
  if (!selection || !editableElement) return;

  const range = selection.getRangeAt(0);
  const selectedText = selection.toString();

  // Focus the editable div
  editableElement.focus();

  switch (format) {
    case "bold":
      document.execCommand("bold", false);
      break;

    case "italic":
      document.execCommand("italic", false);
      break;

    case "underline":
      document.execCommand("underline", false);
      break;

    case "strikethrough":
      document.execCommand("strikeThrough", false);
      break;

    case "bulletList":
      // Check if we're already in a list
      const currentListItem = range.startContainer.parentElement?.closest("li");
      const currentList = currentListItem?.parentElement;

      if (currentListItem && currentList?.tagName.toLowerCase() === "ul") {
        // Exit list: convert list item to normal paragraph
        const listItemText = currentListItem.textContent || "";
        const normalParagraph = document.createElement("div");
        normalParagraph.className = "normal-paragraph";
        normalParagraph.style.cssText =
          "margin: 0 !important; padding: 0 !important; margin-left: 0 !important; padding-left: 0 !important; list-style: none !important; text-indent: 0 !important; position: static !important; left: auto !important; transform: none !important; display: block !important;";
        normalParagraph.textContent = listItemText;

        // Replace the list item with the normal paragraph
        if (currentList.children.length === 1) {
          // Only one item, replace the entire list
          currentList.replaceWith(normalParagraph);
        } else {
          // Multiple items, just replace this item
          currentListItem.replaceWith(normalParagraph);
        }

        // Position cursor in the new paragraph
        const newRange = document.createRange();
        newRange.setStart(normalParagraph, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        // Create new list or add to existing list
        if (selectedText) {
          // Create list with selected text
          const listElement = document.createElement("ul");
          listElement.className = "list-disc list-outside space-y-1 my-3 pl-6";
          const listItem = document.createElement("li");
          listItem.className = "mb-1";
          listItem.textContent = selectedText;
          listElement.appendChild(listItem);

          range.deleteContents();
          range.insertNode(listElement);

          // Position cursor at end of list item
          const newRange = document.createRange();
          newRange.setStart(listItem, 1);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } else {
          // Create empty list item
          const listElement = document.createElement("ul");
          listElement.className = "list-disc list-outside space-y-1 my-3 pl-6";
          const listItem = document.createElement("li");
          listItem.className = "mb-1";
          listItem.textContent = "Lista item";
          listElement.appendChild(listItem);

          range.insertNode(listElement);

          // Select the text for editing
          const newRange = document.createRange();
          newRange.selectNodeContents(listItem);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
      break;

    case "numberedList":
      // Similar logic for numbered lists
      const currentNumberedListItem =
        range.startContainer.parentElement?.closest("li");
      const currentNumberedList = currentNumberedListItem?.parentElement;

      if (
        currentNumberedListItem &&
        currentNumberedList?.tagName.toLowerCase() === "ol"
      ) {
        // Exit numbered list
        const listItemText = currentNumberedListItem.textContent || "";
        const normalParagraph = document.createElement("div");
        normalParagraph.className = "normal-paragraph";
        normalParagraph.style.cssText =
          "margin: 0 !important; padding: 0 !important; margin-left: 0 !important; padding-left: 0 !important; list-style: none !important; text-indent: 0 !important; position: static !important; left: auto !important; transform: none !important; display: block !important;";
        normalParagraph.textContent = listItemText;

        if (currentNumberedList.children.length === 1) {
          currentNumberedList.replaceWith(normalParagraph);
        } else {
          currentNumberedListItem.replaceWith(normalParagraph);
        }

        const newRange = document.createRange();
        newRange.setStart(normalParagraph, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        // Create numbered list
        if (selectedText) {
          const listElement = document.createElement("ol");
          listElement.className =
            "list-decimal list-outside space-y-1 my-3 pl-6";
          const listItem = document.createElement("li");
          listItem.className = "mb-1";
          listItem.textContent = selectedText;
          listElement.appendChild(listItem);

          range.deleteContents();
          range.insertNode(listElement);

          const newRange = document.createRange();
          newRange.setStart(listItem, 1);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } else {
          const listElement = document.createElement("ol");
          listElement.className =
            "list-decimal list-outside space-y-1 my-3 pl-6";
          const listItem = document.createElement("li");
          listItem.className = "mb-1";
          listItem.textContent = "Lista numerada";
          listElement.appendChild(listItem);

          range.insertNode(listElement);

          const newRange = document.createRange();
          newRange.selectNodeContents(listItem);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
      break;

    case "heading1":
    case "heading2":
    case "heading3":
      const headingLevel = format.charAt(format.length - 1);
      const headingTag = `h${headingLevel}`;
      const headingClasses = {
        h1: "text-2xl font-bold mb-2 mt-4 text-gray-900",
        h2: "text-xl font-bold mb-2 mt-3 text-gray-900",
        h3: "text-lg font-bold mb-2 mt-3 text-gray-900",
      };

      if (selectedText) {
        const headingElement = document.createElement(headingTag);
        headingElement.className =
          headingClasses[headingTag as keyof typeof headingClasses];
        headingElement.textContent = selectedText;
        range.deleteContents();
        range.insertNode(headingElement);
        range.setStartAfter(headingElement);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        const headingElement = document.createElement(headingTag);
        headingElement.className =
          headingClasses[headingTag as keyof typeof headingClasses];
        headingElement.textContent = `Heading ${headingLevel}`;
        range.insertNode(headingElement);
        const textNode = headingElement.firstChild;
        if (textNode) {
          range.selectNodeContents(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
      break;

    case "link":
      if (onLinkRequest) {
        onLinkRequest(selectedText, range);
      }
      break;

    case "code":
      if (selectedText) {
        const codeElement = document.createElement("code");
        codeElement.className =
          "bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono";
        codeElement.textContent = selectedText;
        range.deleteContents();
        range.insertNode(codeElement);
        range.setStartAfter(codeElement);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      break;

    case "codeBlock":
      if (onCodeBlockRequest) {
        onCodeBlockRequest(selectedText, range);
      }
      break;

    case "quote":
      if (selectedText) {
        const blockquoteElement = document.createElement("blockquote");
        blockquoteElement.className =
          "border-l-4 border-teal-500 pl-4 py-2 my-2 bg-teal-50 text-gray-700 italic";
        blockquoteElement.textContent = selectedText;
        range.deleteContents();
        range.insertNode(blockquoteElement);
        range.setStartAfter(blockquoteElement);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        const blockquoteElement = document.createElement("blockquote");
        blockquoteElement.className =
          "border-l-4 border-teal-500 pl-4 py-2 my-2 bg-teal-50 text-gray-700 italic";
        blockquoteElement.textContent = "Escribe tu cita aquí";
        range.insertNode(blockquoteElement);
        const textNode = blockquoteElement.firstChild;
        if (textNode) {
          range.selectNodeContents(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
      break;

    case "divider":
      const hrElement = document.createElement("hr");
      hrElement.className = "border-t border-gray-300 my-4";
      range.deleteContents();
      range.insertNode(hrElement);

      const brElement = document.createElement("br");
      range.setStartAfter(hrElement);
      range.insertNode(brElement);
      range.setStartAfter(brElement);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      break;

    default:
      return;
  }
};

/**
 * Handles key events for contentEditable elements
 * Extracted from TimelineComposer handleKeyDown function
 */
export const handleKeyDown = (
  e: React.KeyboardEvent<HTMLDivElement>,
  editableElement: HTMLElement | null,
  onTextChange?: (text: string) => void,
  getPlainText?: () => string
) => {
  if (!editableElement) return;

  if (e.key === "Enter") {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const currentElement = range.startContainer.parentElement;

      // Check if we're inside a heading
      const heading = currentElement?.closest("h1, h2, h3, h4, h5, h6");
      if (heading && !e.shiftKey) {
        e.preventDefault();

        const newParagraph = document.createElement("div");
        newParagraph.className = "normal-paragraph";
        newParagraph.style.cssText =
          "margin: 0 !important; padding: 0 !important; margin-left: 0 !important; padding-left: 0 !important; list-style: none !important; text-indent: 0 !important; position: static !important; left: auto !important; transform: none !important; display: block !important;";
        newParagraph.innerHTML = "<br>";

        if (heading.nextSibling) {
          heading.parentNode?.insertBefore(newParagraph, heading.nextSibling);
        } else {
          heading.parentNode?.appendChild(newParagraph);
        }

        const newRange = document.createRange();
        newRange.setStart(newParagraph, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);

        setTimeout(() => {
          if (onTextChange && getPlainText) {
            onTextChange(getPlainText());
          }
        }, 0);

        return;
      }
    }
  }

  // Handle Backspace in empty list items
  if (e.key === "Backspace") {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const currentElement = range.startContainer.parentElement;
      const listItem = currentElement?.closest("li");

      if (
        listItem &&
        range.startOffset === 0 &&
        listItem.textContent?.trim() === ""
      ) {
        e.preventDefault();

        const list = listItem.parentElement;
        const prevItem = listItem.previousElementSibling as HTMLElement;

        if (prevItem) {
          const newRange = document.createRange();
          newRange.selectNodeContents(prevItem);
          newRange.collapse(false);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }

        listItem.remove();

        if (list && list.children.length === 0) {
          list.remove();
        }

        setTimeout(() => {
          if (onTextChange && getPlainText) {
            onTextChange(getPlainText());
          }
        }, 0);

        return;
      }
    }
  }
};
