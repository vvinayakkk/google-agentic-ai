import { useEffect } from "react";

const SCRIPT_ID = "google-translate-script";
const ELEMENT_ID = "google_translate_element";
const INCLUDED_LANGUAGES = "en,hi,gu,mr,ta,fr,ja,de,ru";

const GTranslate = () => {
  useEffect(() => {
    window.googleTranslateElementInit = () => {
      if (!window.google?.translate?.TranslateElement) return;
      const root = document.getElementById(ELEMENT_ID);
      if (!root || root.childElementCount > 0) return;

      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: INCLUDED_LANGUAGES,
          autoDisplay: false,
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
        },
        ELEMENT_ID
      );
    };

    const existingScript = document.getElementById(SCRIPT_ID);
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
      return;
    }

    // If the script already exists and API is ready, initialize immediately.
    if (window.google?.translate?.TranslateElement) {
      window.googleTranslateElementInit();
    }
  }, []);

  return <div id={ELEMENT_ID} className="google-translate-element" />;
};

export default GTranslate;
