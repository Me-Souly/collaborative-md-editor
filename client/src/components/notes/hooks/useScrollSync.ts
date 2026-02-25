import { useEffect, useRef } from 'react';

export const useScrollSync = (
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  previewScrollContainerRef: React.RefObject<HTMLDivElement>,
  previewMode: 'split' | 'edit' | 'preview',
  markdown: string,
  isLoading: boolean
) => {
  const isScrollingRef = useRef(false);
  const savedTextareaScrollRef = useRef<number>(0);

  useEffect(() => {
    if (previewMode !== 'split') return;
    
    const textarea = textareaRef.current;
    const previewScroll = previewScrollContainerRef.current;
    
    if (!textarea || !previewScroll) return;
    
    const findScrollableElement = (container: HTMLElement): HTMLElement | null => {
      const milkdownContainer = container.querySelector('.milkdown-readonly-container, .milkdown-editor-container') as HTMLElement;
      if (milkdownContainer) {
        return milkdownContainer;
      }
      const editorContainer = container.querySelector('.editorContainer') as HTMLElement;
      if (editorContainer && editorContainer.scrollHeight > editorContainer.clientHeight) {
        return editorContainer;
      }
      const allElements = container.querySelectorAll('*');
      for (const el of Array.from(allElements)) {
        const htmlEl = el as HTMLElement;
        const style = window.getComputedStyle(htmlEl);
        if ((style.overflow === 'auto' || style.overflow === 'scroll' || style.overflowY === 'auto' || style.overflowY === 'scroll') 
            && htmlEl.scrollHeight > htmlEl.clientHeight) {
          return htmlEl;
        }
      }
      if (container.scrollHeight > container.clientHeight) {
        return container;
      }
      return null;
    };
    
    let cleanup: (() => void) | null = null;
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    
    const setupScrollSync = (textareaEl: HTMLTextAreaElement, previewEl: HTMLElement): (() => void) => {
      const handleTextareaScroll = () => {
        if (isScrollingRef.current) return;
        
        isScrollingRef.current = true;
        
        const textareaMaxScroll = textareaEl.scrollHeight - textareaEl.clientHeight;
        const previewMaxScroll = previewEl.scrollHeight - previewEl.clientHeight;
        
        if (textareaMaxScroll > 0 && previewMaxScroll > 0) {
          const scrollRatio = textareaEl.scrollTop / textareaMaxScroll;
          const targetScroll = scrollRatio * previewMaxScroll;
          previewEl.scrollTop = targetScroll;
        }
        
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          isScrollingRef.current = false;
        }, 10);
      };
      
      const handlePreviewScroll = () => {
        if (isScrollingRef.current) return;
        
        const isTextareaFocused = document.activeElement === textareaEl;
        if (!isTextareaFocused) {
          return;
        }
        
        isScrollingRef.current = true;
        
        const textareaMaxScroll = textareaEl.scrollHeight - textareaEl.clientHeight;
        const previewMaxScroll = previewEl.scrollHeight - previewEl.clientHeight;
        
        if (textareaMaxScroll > 0 && previewMaxScroll > 0) {
          const scrollRatio = previewEl.scrollTop / previewMaxScroll;
          const targetScroll = scrollRatio * textareaMaxScroll;
          textareaEl.scrollTop = targetScroll;
        }
        
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          isScrollingRef.current = false;
        }, 10);
      };
      
      textareaEl.addEventListener('scroll', handleTextareaScroll, { passive: true });
      previewEl.addEventListener('scroll', handlePreviewScroll, { passive: true });
      
      return () => {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        textareaEl.removeEventListener('scroll', handleTextareaScroll);
        previewEl.removeEventListener('scroll', handlePreviewScroll);
      };
    };
    
    const initTimeout = setTimeout(() => {
      const previewScrollElement = findScrollableElement(previewScroll);
      
      if (!previewScrollElement) {
        const retryTimeout = setTimeout(() => {
          const retryElement = findScrollableElement(previewScroll);
          if (retryElement) {
            cleanup = setupScrollSync(textarea, retryElement);
          }
        }, 200);
        return () => clearTimeout(retryTimeout);
      }
      
      cleanup = setupScrollSync(textarea, previewScrollElement);
    }, 100);
    
    return () => {
      clearTimeout(initTimeout);
      if (cleanup) cleanup();
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [previewMode, markdown, isLoading, textareaRef, previewScrollContainerRef]);

  return {
    savedTextareaScrollRef,
  };
};

